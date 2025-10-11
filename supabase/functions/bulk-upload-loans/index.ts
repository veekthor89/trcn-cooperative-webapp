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
  outstanding_balance?: number;
  monthly_payment?: number;
  next_payment_date?: string;
}

// Input validation
function validateLoan(loan: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!loan.email || !emailRegex.test(loan.email)) {
    errors.push('Invalid email format');
  }
  
  const validTypes = ['personal', 'business', 'emergency', 'education'];
  if (!loan.loan_type || !validTypes.includes(loan.loan_type)) {
    errors.push('Loan type must be personal, business, emergency, or education');
  }
  
  const principal = parseFloat(loan.principal_amount);
  if (isNaN(principal) || principal <= 0 || principal > 100000000) {
    errors.push('Principal amount must be between 0 and 100,000,000');
  }
  
  const rate = parseFloat(loan.interest_rate);
  if (isNaN(rate) || rate < 0 || rate > 100) {
    errors.push('Interest rate must be between 0 and 100');
  }
  
  const period = parseInt(loan.repayment_period);
  if (isNaN(period) || period < 1 || period > 360) {
    errors.push('Repayment period must be between 1 and 360 months');
  }
  
  if (loan.outstanding_balance !== undefined) {
    const balance = parseFloat(loan.outstanding_balance);
    if (isNaN(balance) || balance < 0 || balance > 100000000) {
      errors.push('Outstanding balance must be between 0 and 100,000,000');
    }
  }
  
  if (loan.next_payment_date && !/^\d{4}-\d{2}-\d{2}$/.test(loan.next_payment_date)) {
    errors.push('Next payment date must be in YYYY-MM-DD format');
  }
  
  return { valid: errors.length === 0, errors };
}

// Sanitize database errors for client responses
function sanitizeError(error: any): string {
  console.error('Database error details:', error);
  
  if (error.code === '23505') {
    return 'This loan record already exists';
  }
  if (error.code === '23503') {
    return 'User not found';
  }
  if (error.code === '23514') {
    return 'Invalid loan data';
  }
  return 'An error occurred while creating this loan';
}

Deno.serve(async (req) => {
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
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

    console.log(`Admin user ${user.id} authorized for bulk loan upload`);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { loans } = await req.json() as { loans: LoanData[] };

    if (!loans || !Array.isArray(loans) || loans.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid loans data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (loans.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Maximum 1000 loans per upload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${loans.length} loan records`);

    const results = {
      success: [] as string[],
      errors: [] as Array<{ email: string; error: string }>
    };

    for (const loan of loans) {
      try {
        const sanitizedLoan = {
          email: loan.email?.trim().toLowerCase() || '',
          loan_type: loan.loan_type,
          principal_amount: loan.principal_amount,
          interest_rate: loan.interest_rate,
          repayment_period: loan.repayment_period,
          status: loan.status,
          outstanding_balance: loan.outstanding_balance,
          monthly_payment: loan.monthly_payment,
          next_payment_date: loan.next_payment_date
        };

        // Validate input
        const validation = validateLoan(sanitizedLoan);
        if (!validation.valid) {
          results.errors.push({ 
            email: sanitizedLoan.email, 
            error: validation.errors.join(', ') 
          });
          continue;
        }

        // Find user by email via profiles table
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', sanitizedLoan.email)
          .single();

        if (profileError || !profile) {
          console.error('User lookup error:', profileError);
          results.errors.push({
            email: sanitizedLoan.email,
            error: 'User not found with this email address'
          });
          continue;
        }

        // Create loan record
        const { error: loanError } = await supabaseAdmin
          .from('loans')
          .insert({
            user_id: profile.id,
            loan_type: sanitizedLoan.loan_type,
            principal_amount: sanitizedLoan.principal_amount,
            interest_rate: sanitizedLoan.interest_rate,
            repayment_period: sanitizedLoan.repayment_period,
            outstanding_balance: sanitizedLoan.outstanding_balance ?? sanitizedLoan.principal_amount,
            monthly_payment: sanitizedLoan.monthly_payment,
            next_payment_date: sanitizedLoan.next_payment_date,
            status: sanitizedLoan.status || 'pending'
          });

        if (loanError) {
          console.error('Loan creation error:', loanError);
          results.errors.push({
            email: sanitizedLoan.email,
            error: sanitizeError(loanError)
          });
        } else {
          results.success.push(sanitizedLoan.email);
          console.log(`Successfully created loan for user ${profile.id}`);
        }
      } catch (error) {
        console.error(`Error processing loan record:`, error);
        results.errors.push({
          email: loan.email || 'unknown',
          error: 'Processing error'
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
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
