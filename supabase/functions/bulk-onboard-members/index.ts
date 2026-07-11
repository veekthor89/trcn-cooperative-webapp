import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Row {
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  savings_balance?: any;
  special_loan_amount?: any;
  trade_loan_amount?: any;
  normal_loan_amount?: any;
  land_loan_amount?: any;
  contribution_amount?: any;
}

const LOAN_MAP: Array<[keyof Row, "special" | "trade" | "normal" | "long_term"]> = [
  ["special_loan_amount", "special"],
  ["trade_loan_amount", "trade"],
  ["normal_loan_amount", "normal"],
  ["land_loan_amount", "long_term"],
];

const toNumber = (v: any): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const normalizeDob = (dob?: string): string | null => {
  if (!dob) return null;
  const s = String(dob).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin privileges required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { rows } = (await req.json()) as { rows: Row[] };
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "No rows provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rows.length > 1000) {
      return new Response(JSON.stringify({ error: "Maximum 1000 rows per upload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const result = {
      created: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; email?: string; reason: string }>,
    };

    const DEFAULT_PASSWORD = "trcn2026";
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // account for header
      const row = rows[i] || {};
      const full_name = String(row.full_name || "").trim();
      const email = String(row.email || "").trim().toLowerCase();

      if (!full_name || !email) {
        result.errors.push({ row: rowNum, email, reason: "Missing full_name or email" });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        result.errors.push({ row: rowNum, email, reason: "Invalid email format" });
        continue;
      }

      // Duplicate check
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existing) {
        result.skipped++;
        result.errors.push({ row: rowNum, email, reason: "Duplicate — member already exists" });
        continue;
      }

      const dob = normalizeDob(row.date_of_birth);
      const savings = toNumber(row.savings_balance);
      const contribution = toNumber(row.contribution_amount);

      try {
        const { data: authData, error: authErr } = await admin.auth.admin.createUser({
          email,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name },
        });
        if (authErr || !authData?.user) {
          const msg = authErr?.message?.includes("already") ? "Email already registered" : (authErr?.message || "Failed to create user");
          result.errors.push({ row: rowNum, email, reason: msg });
          continue;
        }
        const uid = authData.user.id;

        const { error: profileErr } = await admin.from("profiles").upsert({
          id: uid,
          full_name,
          email,
          phone: row.phone ? String(row.phone).trim() : null,
          address: row.address ? String(row.address).trim() : null,
          date_of_birth: dob,
          must_change_password: true,
        }, { onConflict: "id" });
        if (profileErr) {
          result.errors.push({ row: rowNum, email, reason: `Profile: ${profileErr.message}` });
          continue;
        }

        // Savings opening balance
        if (savings > 0) {
          // Ensure account exists
          const { data: acct } = await admin
            .from("accounts")
            .select("id")
            .eq("user_id", uid)
            .eq("account_type", "savings")
            .maybeSingle();
          let accountId = acct?.id as string | undefined;
          if (!accountId) {
            const { data: newAcct } = await admin
              .from("accounts")
              .insert({ user_id: uid, account_type: "savings", balance: savings, status: "active" })
              .select("id")
              .single();
            accountId = newAcct?.id;
          } else {
            await admin.from("accounts").update({ balance: savings }).eq("id", accountId);
          }
          await admin.from("transactions").insert({
            user_id: uid,
            account_id: accountId,
            amount: savings,
            type: "deposit",
            description: "Opening savings balance",
            included_in_opening_balance: true,
          });
        }

        // Loans
        for (const [key, loanType] of LOAN_MAP) {
          const amt = toNumber(row[key]);
          if (amt > 0) {
            const { error: loanErr } = await admin.from("loans").insert({
              user_id: uid,
              loan_type: loanType,
              principal_amount: amt,
              outstanding_balance: amt,
              interest_rate: 0,
              repayment_period: 12,
              status: "active",
            });
            if (loanErr) {
              result.errors.push({ row: rowNum, email, reason: `${loanType} loan: ${loanErr.message}` });
            }
          }
        }

        // Contribution opening balance
        if (contribution > 0) {
          const { data: prof } = await admin
            .from("profiles")
            .select("bank_name, account_number, department")
            .eq("id", uid)
            .maybeSingle();
          await admin.from("special_contributions").insert({
            user_id: uid,
            application_status: "active",
            monthly_amount: contribution,
            duration_months: 11,
            contribution_year: currentYear,
            total_contributed: contribution,
            balance: contribution,
            bank_name: (prof as any)?.bank_name || "N/A",
            account_number: (prof as any)?.account_number || "N/A",
            account_name: full_name,
            department: (prof as any)?.department || null,
            approved_date: new Date().toISOString(),
          });
        }

        result.created++;
      } catch (err: any) {
        result.errors.push({ row: rowNum, email, reason: err?.message || "Unknown error" });
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("bulk-onboard-members error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
