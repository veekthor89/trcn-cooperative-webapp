import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MemberData {
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { members } = await req.json() as { members: MemberData[] };

    if (!members || !Array.isArray(members) || members.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid members data' }),
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

    const defaultPassword = 'trcn@2025';

    for (const member of members) {
      try {
        console.log(`Processing member: ${member.email}`);

        // Create auth user with default password
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: member.email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            full_name: member.full_name
          }
        });

        if (authError) {
          console.error(`Auth error for ${member.email}:`, authError);
          results.errors.push({ email: member.email, error: authError.message });
          continue;
        }

        console.log(`Created auth user for ${member.email}, updating profile...`);

        // Update profile with additional data
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            phone: member.phone,
            address: member.address,
            date_of_birth: member.date_of_birth
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error(`Profile update error for ${member.email}:`, profileError);
          results.errors.push({ email: member.email, error: `Profile update failed: ${profileError.message}` });
        } else {
          results.success.push(member.email);
          console.log(`Successfully created and updated ${member.email}`);
        }
      } catch (error) {
        console.error(`Error processing ${member.email}:`, error);
        results.errors.push({ 
          email: member.email, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in bulk-upload-members:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
