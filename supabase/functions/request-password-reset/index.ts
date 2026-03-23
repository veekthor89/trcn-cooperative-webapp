import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if user exists
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, member_number')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (!profile) {
      // Don't reveal whether user exists
      return new Response(
        JSON.stringify({ message: 'If an account with that email exists, the admin has been notified.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit: check if a reset notification for this user was created in the last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentRequest } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('type', 'password_reset_request')
      .ilike('message', `%${profile.member_number || email}%`)
      .gte('created_at', fifteenMinutesAgo)
      .limit(1)
      .maybeSingle();

    if (recentRequest) {
      // Already requested recently — return success silently to avoid flooding
      return new Response(
        JSON.stringify({ message: 'If an account with that email exists, the admin has been notified.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all admin user IDs
    const { data: adminRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminRoles && adminRoles.length > 0) {
      // Create notification for each admin
      const notifications = adminRoles.map(role => ({
        user_id: role.user_id,
        type: 'password_reset_request',
        message: `Password reset requested by ${profile.full_name} (${profile.member_number || email}). Please click to review and reset their password.`,
        read_status: false,
      }));

      await supabaseAdmin.from('notifications').insert(notifications);
    }

    return new Response(
      JSON.stringify({ message: 'If an account with that email exists, the admin has been notified.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in request-password-reset:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
