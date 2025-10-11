import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    console.log('Processing', lines.length - 1, 'transaction records');

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      try {
        // Get user by email
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', row.email)
          .single();

        if (!profile) {
          results.failed++;
          results.errors.push(`User not found for email: ${row.email}`);
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
          results.failed++;
          results.errors.push(`Row ${i}: Transaction with reference number ${referenceNumber} already exists`);
          console.log(`Skipping duplicate transaction: ${referenceNumber}`);
          continue;
        }

        // Create transaction
        const transactionType = row.type || 'deposit';
        const amount = parseFloat(row.amount) || 0;
        
        const { error: insertError } = await supabase
          .from('transactions')
          .insert({
            user_id: profile.id,
            account_id: accountId,
            type: transactionType,
            amount: amount,
            description: row.description || '',
            reference_number: referenceNumber,
          });

        if (insertError) throw insertError;

        // Update account balance
        const { data: savingsAccount } = await supabase
          .from('accounts')
          .select('id, balance')
          .eq('user_id', profile.id)
          .eq('account_type', 'savings')
          .single();

        if (savingsAccount) {
          // Calculate new balance based on transaction type
          let newBalance = parseFloat(savingsAccount.balance.toString());
          if (transactionType === 'deposit' || transactionType === 'loan_disbursement') {
            newBalance += amount;
          } else if (transactionType === 'withdrawal' || transactionType === 'loan_repayment') {
            newBalance -= amount;
          }

          // Update the account balance
          await supabase
            .from('accounts')
            .update({ balance: newBalance })
            .eq('id', savingsAccount.id);
        } else {
          // Create a savings account if it doesn't exist (for deposits only)
          if (transactionType === 'deposit' || transactionType === 'loan_disbursement') {
            await supabase
              .from('accounts')
              .insert({
                user_id: profile.id,
                account_type: 'savings',
                balance: amount,
                status: 'active'
              });
          }
        }

        results.successful++;
        console.log('Successfully created transaction and updated balance for:', row.email);
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Row ${i}: ${error.message}`);
        console.error(`Error processing row ${i}:`, error);
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
