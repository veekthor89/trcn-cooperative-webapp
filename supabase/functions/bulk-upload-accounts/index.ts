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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accounts } = await req.json() as { accounts: AccountData[] };

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid accounts data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const results = {
      success: [] as string[],
      errors: [] as { email: string; error: string }[]
    };

    for (const account of accounts) {
      try {
        console.log(`Processing account for: ${account.email}`);

        // Find user by email
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', account.email)
          .single();

        if (profileError || !profile) {
          console.error(`User not found for ${account.email}`);
          results.errors.push({ 
            email: account.email, 
            error: 'User not found. Please ensure the member exists first.' 
          });
          continue;
        }

        console.log(`Found user ${profile.id} for ${account.email}, creating account...`);

        // Create account
        const { error: accountError } = await supabaseAdmin
          .from('accounts')
          .insert({
            user_id: profile.id,
            account_type: account.account_type,
            balance: account.balance || 0.00,
            status: account.status || 'active'
          });

        if (accountError) {
          console.error(`Account creation error for ${account.email}:`, accountError);
          results.errors.push({ 
            email: account.email, 
            error: `Account creation failed: ${accountError.message}` 
          });
        } else {
          results.success.push(account.email);
          console.log(`Successfully created account for ${account.email}`);
        }
      } catch (error) {
        console.error(`Error processing ${account.email}:`, error);
        results.errors.push({ 
          email: account.email, 
          error: error instanceof Error ? error.message : 'Unknown error' 
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
