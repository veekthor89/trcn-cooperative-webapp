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

// Input validation schema
function validateMember(member: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!member.full_name || typeof member.full_name !== 'string' || member.full_name.trim().length < 2) {
    errors.push('Full name must be at least 2 characters');
  }
  if (member.full_name && member.full_name.length > 100) {
    errors.push('Full name must be less than 100 characters');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!member.email || !emailRegex.test(member.email)) {
    errors.push('Invalid email format');
  }
  if (member.email && member.email.length > 255) {
    errors.push('Email must be less than 255 characters');
  }
  
  if (member.phone && !/^\d{10,15}$/.test(member.phone.replace(/[\s\-\(\)]/g, ''))) {
    errors.push('Phone must be 10-15 digits');
  }
  
  if (member.address && member.address.length > 500) {
    errors.push('Address must be less than 500 characters');
  }
  
  if (member.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(member.date_of_birth)) {
    errors.push('Date of birth must be in YYYY-MM-DD format');
  }
  
  return { valid: errors.length === 0, errors };
}

// Sanitize CSV fields to prevent formula injection
function sanitizeCsvField(field: string): string {
  if (typeof field !== 'string') return field;
  if (field.startsWith('=') || field.startsWith('+') || field.startsWith('-') || field.startsWith('@')) {
    return "'" + field;
  }
  return field;
}

// Generate cryptographically secure random password
function generateSecurePassword(length = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
}

// Sanitize database errors for client responses
function sanitizeError(error: any): string {
  console.error('Database error details:', error);
  
  if (error.code === '23505') {
    return 'This member already exists';
  }
  if (error.code === '23503') {
    return 'Referenced record not found';
  }
  if (error.code === '23514') {
    return 'Invalid data format';
  }
  return 'An error occurred while processing this member';
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Create client with user's JWT
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

    console.log(`Admin ${user.email} authorized for bulk member upload`);

    const { members } = await req.json() as { members: MemberData[] };

    if (!members || !Array.isArray(members) || members.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid members data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check
    if (members.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Maximum 1000 members per upload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const results = {
      success: [] as string[],
      errors: [] as { email: string; error: string }[]
    };

    for (const member of members) {
      try {
        // Sanitize inputs
        const sanitizedMember = {
          full_name: sanitizeCsvField(member.full_name?.trim() || ''),
          email: member.email?.trim().toLowerCase() || '',
          phone: member.phone ? sanitizeCsvField(member.phone.trim()) : undefined,
          address: member.address ? sanitizeCsvField(member.address.trim()) : undefined,
          date_of_birth: member.date_of_birth?.trim() || undefined
        };

        // Validate input
        const validation = validateMember(sanitizedMember);
        if (!validation.valid) {
          results.errors.push({ 
            email: sanitizedMember.email || 'unknown', 
            error: validation.errors.join(', ') 
          });
          continue;
        }

        console.log(`Processing member: ${sanitizedMember.email}`);

        // Generate secure random password
        const randomPassword = generateSecurePassword(16);

        // Create auth user with random password
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: sanitizedMember.email,
          password: randomPassword,
          email_confirm: true,
          user_metadata: {
            full_name: sanitizedMember.full_name,
            must_change_password: true
          }
        });

        if (authError) {
          console.error(`Auth error for ${sanitizedMember.email}:`, authError);
          results.errors.push({ email: sanitizedMember.email, error: sanitizeError(authError) });
          continue;
        }

        console.log(`Created auth user for ${sanitizedMember.email}, updating profile...`);

        // Update profile with additional data
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            phone: sanitizedMember.phone,
            address: sanitizedMember.address,
            date_of_birth: sanitizedMember.date_of_birth
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error(`Profile update error for ${sanitizedMember.email}:`, profileError);
          results.errors.push({ email: sanitizedMember.email, error: sanitizeError(profileError) });
        } else {
          results.success.push(sanitizedMember.email);
          console.log(`Successfully created ${sanitizedMember.email} with random password`);
        }
      } catch (error) {
        console.error(`Error processing ${member.email}:`, error);
        results.errors.push({ 
          email: member.email || 'unknown', 
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
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
