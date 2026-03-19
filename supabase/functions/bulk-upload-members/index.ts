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
  
  if (member.date_of_birth && !/^\d{2}-\d{2}-\d{4}$/.test(member.date_of_birth) && !/^\d{4}-\d{2}-\d{2}$/.test(member.date_of_birth)) {
    errors.push('Date of birth must be in DD-MM-YYYY or YYYY-MM-DD format');
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

// Convert DD-MM-YYYY to YYYY-MM-DD, pass through if already YYYY-MM-DD
function normalizeDateOfBirth(dob: string): string {
  if (/^\d{2}-\d{2}-\d{4}$/.test(dob)) {
    const [dd, mm, yyyy] = dob.split('-');
    return `${yyyy}-${mm}-${dd}`;
  }
  return dob;
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
  
  if (error.message?.includes('already been registered') || error.message?.includes('already registered') || error.message?.includes('already exists') || error.code === 'email_exists') {
    return 'This email is already registered';
  }
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Create client with user's JWT for authentication check
    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 2. Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
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

    console.log(`Admin user ${user.id} authorized for bulk member upload`);

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
      success: [] as { email: string; password: string }[],
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
          date_of_birth: member.date_of_birth?.trim() ? normalizeDateOfBirth(member.date_of_birth.trim()) : undefined
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

        console.log(`Processing member: ${sanitizedMember.full_name} (user will be assigned ID)`);

        // Generate a unique secure password for each new account
        const defaultPassword = generateSecurePassword();

        // Create auth user with random password
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: sanitizedMember.email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            full_name: sanitizedMember.full_name,
          }
        });

        if (authError) {
          console.error(`Auth error:`, authError);
          results.errors.push({ email: sanitizedMember.email, error: sanitizeError(authError) });
          continue;
        }

        console.log(`Created auth user ${authData.user.id}, updating profile...`);

        // Upsert profile with additional data (insert or update)
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: authData.user.id,
            full_name: sanitizedMember.full_name,
            email: sanitizedMember.email,
            phone: sanitizedMember.phone,
            address: sanitizedMember.address,
            date_of_birth: sanitizedMember.date_of_birth,
            must_change_password: true
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error(`Profile update error:`, profileError);
          results.errors.push({ email: sanitizedMember.email, error: sanitizeError(profileError) });
        } else {
          results.success.push({ email: sanitizedMember.email, password: defaultPassword });
          console.log(`Successfully created user ${authData.user.id} with default password`);
        }
      } catch (error) {
        console.error(`Error processing member:`, error);
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
