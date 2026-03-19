import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function validateContribution(contrib: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!contrib.email || !emailRegex.test(contrib.email)) {
    errors.push('Invalid email format');
  }

  const year = parseInt(contrib.contribution_year);
  if (isNaN(year) || year < 2020 || year > 2100) {
    errors.push('Contribution year must be between 2020 and 2100');
  }

  const monthly = parseFloat(contrib.monthly_amount);
  if (isNaN(monthly) || monthly <= 0 || monthly > 100000000) {
    errors.push('Monthly amount must be between 0 and 100,000,000');
  }

  if (contrib.total_contributed !== undefined && contrib.total_contributed !== '') {
    const tc = parseFloat(contrib.total_contributed);
    if (isNaN(tc) || tc < 0) {
      errors.push('Total contributed must be >= 0');
    }
  }

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
  if (error.code === '23505') return 'This contribution record already exists';
  if (error.code === '23503') return 'User not found';
  if (error.code === '23514') return 'Invalid contribution data';
  return 'An error occurred while processing this contribution';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    console.log(`Admin user ${user.id} authorized for bulk special contributions upload`);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { records } = await req.json();

    if (!records || !Array.isArray(records) || records.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid records data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (records.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Maximum 1000 contributions per upload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${records.length} special contribution records`);

    const results = {
      successful: [] as string[],
      failed: [] as Array<{ email: string; error: string }>,
    };

    for (const record of records) {
      try {
        const sanitizedRecord = {
          email: record.email?.trim().toLowerCase() || '',
          contribution_year: record.contribution_year?.toString().trim() || '',
          monthly_amount: record.monthly_amount?.toString().trim() || '',
          total_contributed: record.total_contributed?.toString().trim() || '0',
        };

        const validation = validateContribution(sanitizedRecord);
        if (!validation.valid) {
          results.failed.push({
            email: sanitizedRecord.email,
            error: validation.errors.join(', ')
          });
          continue;
        }

        // Find user by email
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, member_number, department, state_of_deployment, bank_name, account_number, account_name')
          .eq('email', sanitizedRecord.email)
          .single();

        if (profileError || !profile) {
          results.failed.push({
            email: sanitizedRecord.email,
            error: 'User not found with this email address',
          });
          continue;
        }

        if (!profile.bank_name || !profile.account_number || !profile.account_name) {
          results.failed.push({
            email: sanitizedRecord.email,
            error: 'Member profile is missing bank details (bank name, account number, or account name)',
          });
          continue;
        }

        const monthlyAmount = parseFloat(sanitizedRecord.monthly_amount);
        const durationMonths = 11;
        const totalExpected = monthlyAmount * durationMonths;
        const totalContributed = parseFloat(sanitizedRecord.total_contributed) || 0;

        const { error: insertError } = await supabase
          .from('special_contributions')
          .insert({
            user_id: profile.id,
            contribution_year: parseInt(sanitizedRecord.contribution_year),
            monthly_amount: monthlyAmount,
            duration_months: durationMonths,
            total_expected: totalExpected,
            total_contributed: totalContributed,
            balance: totalContributed,
            bank_name: profile.bank_name,
            account_number: profile.account_number,
            account_name: profile.account_name,
            member_number: profile.member_number || null,
            department: profile.department || null,
            state_of_assignment: profile.state_of_deployment || null,
            application_status: 'approved',
          });

        if (insertError) {
          console.error(`Failed to create special contribution:`, insertError);
          results.failed.push({
            email: sanitizedRecord.email,
            error: sanitizeError(insertError),
          });
        } else {
          results.successful.push(sanitizedRecord.email);
          console.log(`Successfully created special contribution for user ${profile.id}`);
        }
      } catch (error) {
        results.failed.push({
          email: record.email || 'unknown',
          error: 'Processing error',
        });
        console.error(`Error processing record:`, error);
      }
    }

    console.log(`Completed: ${results.successful.length} successful, ${results.failed.length} failed`);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in bulk upload:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
