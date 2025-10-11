import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation
function validateContribution(contrib: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!contrib.email || !emailRegex.test(contrib.email)) {
    errors.push('Invalid email format');
  }
  
  if (!contrib.contribution_name || contrib.contribution_name.length < 2 || contrib.contribution_name.length > 200) {
    errors.push('Contribution name must be 2-200 characters');
  }
  
  const target = parseFloat(contrib.target_amount);
  if (isNaN(target) || target <= 0 || target > 100000000) {
    errors.push('Target amount must be between 0 and 100,000,000');
  }
  
  if (contrib.current_amount !== undefined) {
    const current = parseFloat(contrib.current_amount);
    if (isNaN(current) || current < 0 || current > 100000000) {
      errors.push('Current amount must be between 0 and 100,000,000');
    }
  }
  
  if (contrib.target_date && !/^\d{4}-\d{2}-\d{2}$/.test(contrib.target_date)) {
    errors.push('Target date must be in YYYY-MM-DD format');
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
    return 'This contribution record already exists';
  }
  if (error.code === '23503') {
    return 'User not found';
  }
  if (error.code === '23514') {
    return 'Invalid contribution data';
  }
  return 'An error occurred while processing this contribution';
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

    console.log(`Admin ${user.email} authorized for bulk special contributions upload`);

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
          contribution_name: sanitizeCsvField(record.contribution_name?.trim() || ''),
          target_amount: record.target_amount,
          current_amount: record.current_amount,
          target_date: record.target_date?.trim() || undefined
        };

        // Validate input
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
          .select('id')
          .eq('email', sanitizedRecord.email)
          .single();

        if (profileError || !profile) {
          console.error('User lookup error for', sanitizedRecord.email, profileError);
          results.failed.push({
            email: sanitizedRecord.email,
            error: 'User not found with this email address',
          });
          continue;
        }

        // Insert special contribution
        const { error: insertError } = await supabase
          .from('special_contributions')
          .insert({
            user_id: profile.id,
            contribution_name: sanitizedRecord.contribution_name,
            target_amount: parseFloat(sanitizedRecord.target_amount),
            current_amount: sanitizedRecord.current_amount ? parseFloat(sanitizedRecord.current_amount) : 0,
            target_date: sanitizedRecord.target_date || null,
          });

        if (insertError) {
          console.error(`Failed to create special contribution for: ${sanitizedRecord.email}`, insertError);
          results.failed.push({
            email: sanitizedRecord.email,
            error: sanitizeError(insertError),
          });
        } else {
          results.successful.push(sanitizedRecord.email);
          console.log(`Successfully created special contribution for: ${sanitizedRecord.email}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({
          email: record.email || 'unknown',
          error: 'Processing error',
        });
        console.error(`Error processing record for ${record.email}:`, error);
      }
    }

    console.log(`Completed: ${results.successful.length} successful, ${results.failed.length} failed`);

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in bulk upload:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
