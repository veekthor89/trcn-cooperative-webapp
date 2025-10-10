import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { records } = await req.json();
    
    console.log(`Processing ${records.length} special contribution records`);

    const results = {
      successful: [] as string[],
      failed: [] as Array<{ email: string; error: string }>,
    };

    for (const record of records) {
      try {
        const { email, contribution_name, target_amount, current_amount, target_date } = record;

        // Find user by email
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (profileError || !profile) {
          results.failed.push({
            email,
            error: `User not found with email: ${email}`,
          });
          continue;
        }

        // Insert special contribution
        const { error: insertError } = await supabase
          .from('special_contributions')
          .insert({
            user_id: profile.id,
            contribution_name,
            target_amount: parseFloat(target_amount),
            current_amount: current_amount ? parseFloat(current_amount) : 0,
            target_date: target_date || null,
          });

        if (insertError) {
          results.failed.push({
            email,
            error: insertError.message,
          });
          console.error(`Failed to create special contribution for: ${email}`, insertError);
        } else {
          results.successful.push(email);
          console.log(`Successfully created special contribution for: ${email}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({
          email: record.email,
          error: errorMessage,
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});