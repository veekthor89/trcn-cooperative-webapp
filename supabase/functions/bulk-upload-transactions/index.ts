import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation
function validateTransaction(txn: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!txn.email || !emailRegex.test(txn.email)) {
    errors.push('Invalid email format');
  }
  
  const amount = parseFloat(txn.amount);
  if (isNaN(amount) || amount <= 0 || amount > 100000000) {
    errors.push('Amount must be between 0 and 100,000,000');
  }
  
  const validTypes = ['deposit', 'withdrawal', 'loan_disbursement', 'repayment'];
  if (!txn.type || !validTypes.includes(txn.type)) {
    errors.push('Type must be deposit, withdrawal, loan_disbursement, or repayment');
  }
  
  if (txn.description && txn.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }
  
  return { valid: errors.length === 0, errors };
}

// Sanitize CSV fields
function sanitizeCsvField(field: string): string {
  if (typeof field !== 'string') return field;
  if (field.startsWith('=') || field.startsWith('+') || field.startsWith('-') || field.startsWith('@')) {
    return "'" + field;
  }
  return field;
}

// Sanitize database errors for client responses
function sanitizeError(error: any): string {
  console.error('Database error details:', error);
  
  if (error.code === '23505') {
    return 'This transaction already exists';
  }
  if (error.code === '23503') {
    return 'Referenced record not found';
  }
  if (error.code === '23514') {
    return 'Invalid transaction data';
  }
  return 'An error occurred while processing this transaction';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 2. Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check admin role
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${user.email} authorized for bulk transaction upload`);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    if (lines.length > 1001) {
      return new Response(
        JSON.stringify({ error: 'Maximum 1000 transactions per upload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing', lines.length - 1, 'transaction records');

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => sanitizeCsvField(v.trim()));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      try {
        // Validate transaction data
        const validation = validateTransaction({
          email: row.email,
          amount: row.amount,
          type: row.type,
          description: row.description
        });

        if (!validation.valid) {
          results.failed++;
          results.errors.push(`Row ${i}: ${validation.errors.join(', ')}`);
          continue;
        }

        // Get user by email
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', row.email.toLowerCase())
          .single();

        if (!profile) {
          console.error('User lookup error for', row.email);
          results.failed++;
          results.errors.push(`Row ${i}: User not found with email: ${row.email}`);
          continue;
        }

        // Get account if account_id is provided
        let accountId = null;
        if (row.account_id) {
          const { data: account } = await supabase
            .from('accounts')
            .select('id')
            .eq('user_id', profile.id)
            .eq('id', row.account_id)
            .single();
          
          if (account) {
            accountId = account.id;
          }
        }

        // Check if transaction with this reference number already exists
        const referenceNumber = row.reference_number || `TXN-${Date.now()}-${i}`;
        
        const { data: existingTransaction } = await supabase
          .from('transactions')
          .select('id')
          .eq('reference_number', referenceNumber)
          .single();

        if (existingTransaction) {
          console.log(`Skipping duplicate transaction: ${referenceNumber}`);
          results.failed++;
          results.errors.push(`Row ${i}: Duplicate transaction reference`);
          continue;
        }

        // Create transaction (balance is automatically updated by database trigger)
        const { error: insertError } = await supabase
          .from('transactions')
          .insert({
            user_id: profile.id,
            account_id: accountId,
            type: row.type || 'deposit',
            amount: parseFloat(row.amount) || 0,
            description: row.description || '',
            reference_number: referenceNumber,
          });

        if (insertError) throw insertError;

        results.successful++;
        console.log('Successfully created transaction for:', row.email);
      } catch (error: any) {
        console.error(`Error processing row ${i}:`, error);
        results.failed++;
        results.errors.push(`Row ${i}: ${sanitizeError(error)}`);
      }
    }

    console.log('Completed:', results.successful, 'successful,', results.failed, 'failed');

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
