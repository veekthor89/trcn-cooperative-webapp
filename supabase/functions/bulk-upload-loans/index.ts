import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LoanData {
  email: string;
  loan_type: string;
  principal_amount: number;
  interest_rate: number;
  repayment_period: number;
  status?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { loans } = await req.json() as { loans: LoanData[] };
    console.log(`Processing ${loans.length} loan records`);

    const results = {
      success: [] as string[],
      errors: [] as Array<{ email: string; error: string }>
    };

    for (const loan of loans) {
      try {
        // Find user by email via profiles table
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', loan.email)
          .single();

        if (profileError || !profile) {
          results.errors.push({
            email: loan.email,
            error: 'Member not found with this email'
          });
          continue;
        }

        // Create loan record
        const { error: loanError } = await supabaseAdmin
          .from('loans')
          .insert({
            user_id: profile.id,
            loan_type: loan.loan_type,
            principal_amount: loan.principal_amount,
            interest_rate: loan.interest_rate,
            repayment_period: loan.repayment_period,
            outstanding_balance: loan.principal_amount, // Initially equals principal
            status: loan.status || 'pending'
          });

        if (loanError) {
          console.error('Loan creation error:', loanError);
          results.errors.push({
            email: loan.email,
            error: loanError.message
          });
        } else {
          results.success.push(loan.email);
          console.log(`Successfully created loan for: ${loan.email}`);
        }
      } catch (error) {
        console.error(`Error processing loan for ${loan.email}:`, error);
        results.errors.push({
          email: loan.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`Completed: ${results.success.length} successful, ${results.errors.length} failed`);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
