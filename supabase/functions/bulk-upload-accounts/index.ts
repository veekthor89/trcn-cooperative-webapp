import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AccountData {
  email: string;
  account_type: 'savings' | 'shares' | 'loan';
  balance?: number;
  status?: 'active' | 'inactive' | 'suspended';
}

// Input validation
function validateAccount(account: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!account.email || !emailRegex.test(account.email)) {
    errors.push('Invalid email format');
  }
  
  const validTypes = ['savings', 'shares', 'loan'];
  if (!account.account_type || !validTypes.includes(account.account_type)) {
    errors.push('Account type must be savings, shares, or loan');
  }
  
  if (account.balance !== undefined) {
    const balance = parseFloat(account.balance);
    if (isNaN(balance) || balance < 0 || balance > 100000000) {
      errors.push('Balance must be between 0 and 100,000,000');
    }
  }
  
  const validStatuses = ['active', 'inactive', 'suspended'];
  if (account.status && !validStatuses.includes(account.status)) {
    errors.push('Status must be active, inactive, or suspended');
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
    return 'This account already exists';
  }
  if (error.code === '23503') {
    return 'User not found';
  }
  if (error.code === '23514') {
    return 'Invalid account data';
  }
  return 'An error occurred while creating this account';
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Create client with user's auth to verify identity
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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
    console.log(`Checking admin role for user ${user.id}`);
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin privileges', details: roleError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isAdmin) {
      console.log(`User ${user.id} is not an admin`);
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin user ${user.id} authorized for bulk account upload`);

    const { accounts } = await req.json() as { accounts: AccountData[] };

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid accounts data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (accounts.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Maximum 1000 accounts per upload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const results = {
      success: [] as string[],
      errors: [] as { email: string; error: string }[]
    };

    for (const account of accounts) {
      try {
        const sanitizedAccount = {
          email: account.email?.trim().toLowerCase() || '',
          account_type: account.account_type,
          balance: account.balance,
          status: account.status
        };

        // Validate input
        const validation = validateAccount(sanitizedAccount);
        if (!validation.valid) {
          results.errors.push({ 
            email: sanitizedAccount.email, 
            error: validation.errors.join(', ') 
          });
          continue;
        }

        console.log(`Processing account for user profile`);

        // Find user by email
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', sanitizedAccount.email)
          .single();

        if (profileError || !profile) {
          console.error(`User not found:`, profileError);
          results.errors.push({ 
            email: sanitizedAccount.email, 
            error: 'User not found with this email address'
          });
          continue;
        }

        console.log(`Found user ${profile.id}, creating account...`);

        // Create account with validated data
        const { error: accountError } = await supabaseAdmin
          .from('accounts')
          .insert({
            user_id: profile.id,
            account_type: sanitizedAccount.account_type,
            balance: sanitizedAccount.balance || 0.00,
            status: sanitizedAccount.status || 'active'
          });

        if (accountError) {
          console.error(`Account creation error:`, accountError);
          results.errors.push({ 
            email: sanitizedAccount.email, 
            error: sanitizeError(accountError)
          });
        } else {
          results.success.push(sanitizedAccount.email);
          console.log(`Successfully created account for user ${profile.id}`);
        }
      } catch (error) {
        console.error(`Error processing record:`, error);
        results.errors.push({ 
          email: account.email || 'unknown', 
          error: 'Processing error' 
        });
      }
    }

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in bulk-upload-accounts:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
