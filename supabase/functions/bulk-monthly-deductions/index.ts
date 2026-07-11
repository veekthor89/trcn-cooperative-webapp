import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Row {
  full_name?: string;
  email?: string;
  savings_deduction?: any;
  contribution_amount?: any;
  special_loan_repayment?: any;
  trade_loan_repayment?: any;
  normal_loan_repayment?: any;
  land_loan_repayment?: any;
  month?: string;
}

const LOAN_MAP: Array<[keyof Row, "special" | "trade" | "normal" | "long_term"]> = [
  ["special_loan_repayment", "special"],
  ["trade_loan_repayment", "trade"],
  ["normal_loan_repayment", "normal"],
  ["land_loan_repayment", "long_term"],
];

const toNumber = (v: any): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
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

    const { rows, month, confirmOverride } = (await req.json()) as {
      rows: Row[]; month: string; confirmOverride?: boolean;
    };

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return new Response(JSON.stringify({ error: "Invalid month (expected YYYY-MM)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "No rows provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rows.length > 5000) {
      return new Response(JSON.stringify({ error: "Maximum 5000 rows per upload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const tag = `[SALDED:${month}]`;

    // Duplicate month pre-check
    if (!confirmOverride) {
      const { count } = await admin
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .like("description", `%${tag}%`);
      if ((count ?? 0) > 0) {
        return new Response(JSON.stringify({ requiresConfirmation: true, month }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const result = {
      updated: 0,
      errors: [] as Array<{ row: number; email?: string; reason: string }>,
    };

    // Detect intra-batch duplicates
    const seen = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const row = rows[i] || {};
      const email = String(row.email || "").trim().toLowerCase();

      if (!email) {
        result.errors.push({ row: rowNum, reason: "Missing email" });
        continue;
      }
      if (row.month && String(row.month).trim() && !/^\d{4}-\d{2}$/.test(String(row.month).trim())) {
        result.errors.push({ row: rowNum, email, reason: "Month must be YYYY-MM" });
        continue;
      }
      const dupKey = `${email}|${month}`;
      if (seen.has(dupKey)) {
        result.errors.push({ row: rowNum, email, reason: "Duplicate row for same email and month" });
        continue;
      }
      seen.add(dupKey);

      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (!profile) {
        result.errors.push({ row: rowNum, email, reason: `Email not found — ${email} does not match any existing member` });
        continue;
      }
      const uid = profile.id as string;

      try {
        const savings = toNumber(row.savings_deduction);
        const contribution = toNumber(row.contribution_amount);
        let anyAction = false;

        if (savings > 0) {
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
              .insert({ user_id: uid, account_type: "savings", balance: 0, status: "active" })
              .select("id")
              .single();
            accountId = newAcct?.id;
          }
          await admin.from("transactions").insert({
            user_id: uid,
            account_id: accountId,
            amount: savings,
            type: "deposit",
            description: `Salary Deduction ${month} ${tag}`,
          });
          anyAction = true;
        }

        if (contribution > 0) {
          // Add to most recent active special contribution
          const { data: sc } = await admin
            .from("special_contributions")
            .select("id, total_contributed, balance")
            .eq("user_id", uid)
            .in("application_status", ["active", "approved"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (sc) {
            await admin.from("special_contributions").update({
              total_contributed: Number(sc.total_contributed || 0) + contribution,
              balance: Number(sc.balance || 0) + contribution,
            }).eq("id", sc.id);
          } else {
            await admin.from("special_contributions").insert({
              user_id: uid,
              application_status: "active",
              monthly_amount: contribution,
              duration_months: 11,
              contribution_year: new Date().getFullYear(),
              total_contributed: contribution,
              balance: contribution,
              bank_name: "N/A",
              account_number: "N/A",
              account_name: email,
              approved_date: new Date().toISOString(),
            });
          }
          // Log transaction (bypass savings trigger)
          await admin.from("transactions").insert({
            user_id: uid,
            amount: contribution,
            type: "deposit",
            description: `Contribution deduction ${month} ${tag}`,
            included_in_opening_balance: true,
          });
          anyAction = true;
        }

        // Loan repayments
        for (const [key, loanType] of LOAN_MAP) {
          const amt = toNumber(row[key]);
          if (amt <= 0) continue;
          const { data: loan } = await admin
            .from("loans")
            .select("id, outstanding_balance")
            .eq("user_id", uid)
            .eq("loan_type", loanType)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!loan) {
            result.errors.push({
              row: rowNum, email,
              reason: `No active ${loanType} loan for ${email}; repayment skipped`,
            });
            continue;
          }
          const newBalance = Math.max(0, Number(loan.outstanding_balance || 0) - amt);
          await admin.from("loans")
            .update({
              outstanding_balance: newBalance,
              status: newBalance === 0 ? "closed" : "active",
            })
            .eq("id", loan.id);
          await admin.from("transactions").insert({
            user_id: uid,
            amount: amt,
            type: "repayment",
            description: `${loanType} loan repayment ${month} ${tag}`,
            included_in_opening_balance: true,
          });
          anyAction = true;
        }

        if (anyAction) result.updated++;
        else result.errors.push({ row: rowNum, email, reason: "No non-zero amounts in row" });
      } catch (err: any) {
        result.errors.push({ row: rowNum, email, reason: err?.message || "Unknown error" });
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("bulk-monthly-deductions error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
