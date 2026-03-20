import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function validateTransaction(txn: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!txn.email || !emailRegex.test(txn.email)) errors.push('Invalid email format');
  const amount = parseFloat(txn.amount);
  if (isNaN(amount) || amount <= 0 || amount > 100000000) errors.push('Amount must be between 0 and 100,000,000');
  if (txn.description && txn.description.length > 500) errors.push('Description must be less than 500 characters');
  return { valid: errors.length === 0, errors };
}

function sanitizeCsvField(field: string): string {
  if (typeof field !== 'string') return field;
  if (field.startsWith('=') || field.startsWith('+') || field.startsWith('-') || field.startsWith('@')) {
    return "'" + field;
  }
  return field;
}

function sanitizeError(error: any): string {
  console.error('Database error details:', error);
  if (error.code === '23505') return 'This transaction already exists';
  if (error.code === '23503') return 'Referenced record not found';
  if (error.code === '23514') return 'Invalid transaction data';
  return 'An error occurred while processing this transaction';
}

// Determine transaction category from description
function categorizeTransaction(description: string): 'savings' | 'special_contribution' | 'loan_repayment' | 'shares' {
  const desc = (description || '').toLowerCase();
  if (desc.includes('special contribution')) return 'special_contribution';
  if (desc.includes('loan') || desc.includes('repayment')) return 'loan_repayment';
  if (desc.includes('share') || desc.includes('shares')) return 'shares';
  return 'savings'; // default: savings/deposit
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: isAdmin } = await supabaseClient.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const includedInOpeningBalance = formData.get('included_in_opening_balance') === 'true';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    if (lines.length > 1001) {
      return new Response(JSON.stringify({ error: 'Maximum 1000 transactions per upload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Processing', lines.length - 1, 'transaction records');

    const results = { successful: 0, failed: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => sanitizeCsvField(v.trim()));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => { row[header] = values[index] || ''; });

      try {
        const validation = validateTransaction({ email: row.email, amount: row.amount, description: row.description });
        if (!validation.valid) {
          results.failed++;
          results.errors.push(`Row ${i}: ${validation.errors.join(', ')}`);
          continue;
        }

        const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('email', row.email.toLowerCase()).single();
        if (!profile) {
          results.failed++;
          results.errors.push(`Row ${i}: User not found`);
          continue;
        }

        const amount = parseFloat(row.amount.replace(/,/g, '')) || 0;
        const description = row.description || '';
        const category = categorizeTransaction(description);
        const referenceNumber = row.reference_number?.trim()
          ? row.reference_number.trim()
          : `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${i}`;

        console.log(`Row ${i}: category=${category}, amount=${amount}, user=${profile.id}`);

        if (category === 'savings') {
          // Insert into transactions table — trigger updates savings balance
          const { error: insertError } = await supabaseAdmin.from('transactions').insert({
            user_id: profile.id,
            type: row.type || 'deposit',
            amount,
            description,
            reference_number: referenceNumber,
            included_in_opening_balance: includedInOpeningBalance,
          });
          if (insertError) throw insertError;

        } else if (category === 'special_contribution') {
          // Update special_contributions total_contributed for user's active contribution
          const currentYear = new Date().getFullYear();
          const { data: contribution } = await supabaseAdmin
            .from('special_contributions')
            .select('id, total_contributed')
            .eq('user_id', profile.id)
            .in('application_status', ['active', 'approved'])
            .order('contribution_year', { ascending: false })
            .limit(1)
            .single();

          if (!contribution) {
            results.failed++;
            results.errors.push(`Row ${i}: No active special contribution found for this member`);
            continue;
          }

          const newTotal = (parseFloat(contribution.total_contributed as any) || 0) + amount;
          const { error: updateError } = await supabaseAdmin
            .from('special_contributions')
            .update({ total_contributed: newTotal })
            .eq('id', contribution.id);
          if (updateError) throw updateError;

          // Also record a deduction entry
          const now = new Date();
          await supabaseAdmin.from('special_contribution_deductions').insert({
            contribution_id: contribution.id,
            user_id: profile.id,
            amount,
            deduction_month: now.getMonth() + 1,
            deduction_year: now.getFullYear(),
            reference_number: referenceNumber,
          });

          // Record in transactions table for visibility in recent activity
          const { error: txnError2 } = await supabaseAdmin.from('transactions').insert({
            user_id: profile.id,
            type: 'deposit',
            amount,
            description,
            reference_number: referenceNumber,
            included_in_opening_balance: true, // skip savings balance trigger
          });
          if (txnError2) console.error('Failed to record special contribution transaction:', txnError2);

        } else if (category === 'loan_repayment') {
          // Find the user's active loan and reduce outstanding balance
          const { data: loan } = await supabaseAdmin
            .from('loans')
            .select('id, outstanding_balance')
            .eq('user_id', profile.id)
            .in('status', ['active', 'approved'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!loan) {
            results.failed++;
            results.errors.push(`Row ${i}: No active loan found for this member`);
            continue;
          }

          const newBalance = Math.max(0, (parseFloat(loan.outstanding_balance as any) || 0) - amount);
          const updateData: any = { outstanding_balance: newBalance };
          if (newBalance === 0) updateData.status = 'closed';

          const { error: loanError } = await supabaseAdmin
            .from('loans')
            .update(updateData)
            .eq('id', loan.id);
          if (loanError) throw loanError;

          // Record as a repayment transaction but mark as included_in_opening_balance
          // so the trigger does NOT touch the savings balance
          const { error: txnError } = await supabaseAdmin.from('transactions').insert({
            user_id: profile.id,
            type: 'repayment',
            amount,
            description,
            reference_number: referenceNumber,
            included_in_opening_balance: true, // skip savings balance trigger
          });
          if (txnError) throw txnError;

        } else if (category === 'shares') {
          // Update shares table
          const pricePerShare = 25;
          const sharesQty = Math.floor(amount / pricePerShare);

          const { data: existingShares } = await supabaseAdmin
            .from('shares')
            .select('id, total_shares, current_value')
            .eq('user_id', profile.id)
            .single();

          if (existingShares) {
            const { error: shareError } = await supabaseAdmin
              .from('shares')
              .update({
                total_shares: (existingShares.total_shares || 0) + sharesQty,
                current_value: (parseFloat(existingShares.current_value as any) || 0) + amount,
              })
              .eq('id', existingShares.id);
            if (shareError) throw shareError;
          } else {
            const { error: shareError } = await supabaseAdmin
              .from('shares')
              .insert({
                user_id: profile.id,
                total_shares: sharesQty,
                current_value: amount,
              });
            if (shareError) throw shareError;
          }

          // Record in share_transactions
          await supabaseAdmin.from('share_transactions').insert({
            user_id: profile.id,
            transaction_type: 'purchase',
            shares_quantity: sharesQty,
            amount,
            description,
            reference_number: referenceNumber,
          });
        }

        results.successful++;
        console.log(`Row ${i}: Successfully processed as ${category}`);
      } catch (error: any) {
        console.error(`Error processing row ${i}:`, error);
        results.failed++;
        results.errors.push(`Row ${i}: ${sanitizeError(error)}`);
      }
    }

    console.log('Completed:', results.successful, 'successful,', results.failed, 'failed');
    return new Response(JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
