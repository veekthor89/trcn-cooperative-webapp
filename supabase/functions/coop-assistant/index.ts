import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are COOP Assistant, a friendly and helpful AI for TRCN Staff Multipurpose Cooperative Society. You have access to the logged-in member's live account data. Answer their questions clearly, warmly and in plain English. Always use Nigerian Naira (₦) for all amounts. Never make up figures — only use the data provided. If a question is outside your scope (e.g. political, general knowledge), politely redirect: 'I can only help with your cooperative account. Is there anything about your savings, loans or contributions I can help with?' Keep responses concise — no more than 4 sentences unless the member asks for a detailed explanation. Always address the member by their first name.`;

const fmt = (n: number | null | undefined) =>
  `₦${Number(n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const messages: Array<{ role: "user" | "assistant"; content: string }> = body.messages ?? [];

    // Load member context
    const [profileR, accountsR, loansR, txR, contribR, sharesR, repayR, activeLoanAppR] =
      await Promise.all([
        supabase.from("profiles").select("full_name, email, member_number, department").eq("id", userId).maybeSingle(),
        supabase.from("accounts").select("account_type, balance, status").eq("user_id", userId),
        supabase.from("loans").select("loan_type, principal_amount, outstanding_balance, monthly_payment, repayment_period, status, next_payment_date, created_at").eq("user_id", userId).in("status", ["active", "approved", "pending"]),
        supabase.from("transactions").select("type, amount, description, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
        supabase.from("special_contributions").select("monthly_amount, duration_months, total_contributed, balance, maturity_date, application_status").eq("user_id", userId).in("application_status", ["active", "approved", "pending"]),
        supabase.from("shares").select("total_shares, current_value, last_dividend_amount, last_dividend_date").eq("user_id", userId).maybeSingle(),
        supabase.from("transactions").select("amount, created_at, description").eq("user_id", userId).eq("type", "repayment").order("created_at", { ascending: false }).limit(6),
        supabase.from("loan_applications").select("monthly_income").eq("user_id", userId).not("monthly_income", "is", null).order("application_date", { ascending: false }).limit(1).maybeSingle(),
      ]);

    const profile = profileR.data;
    const firstName = (profile?.full_name ?? "Member").split(" ")[0];

    const savings = accountsR.data?.find((a: any) => a.account_type === "savings");
    const lastTx = txR.data?.[0];
    const activeLoans = (loansR.data ?? []).filter((l: any) => l.status === "active");
    const monthlyLoanRepayments = activeLoans.reduce((s: number, l: any) => s + Number(l.monthly_payment ?? 0), 0);
    const activeContrib = (contribR.data ?? []).filter((c: any) => c.application_status === "active");
    const monthlyContrib = activeContrib.reduce((s: number, c: any) => s + Number(c.monthly_amount ?? 0), 0);
    const totalMonthlyDeductions = monthlyLoanRepayments + monthlyContrib;
    const grossSalary = activeLoanAppR.data?.monthly_income ?? null;

    const contextLines = [
      `Member: ${profile?.full_name ?? "Unknown"} (first name: ${firstName})`,
      profile?.member_number ? `TRCN Number: ${profile.member_number}` : null,
      profile?.department ? `Department: ${profile.department}` : null,
      "",
      `SAVINGS BALANCE: ${fmt(savings?.balance)}`,
      lastTx ? `Last transaction: ${lastTx.type} of ${fmt(lastTx.amount)} on ${new Date(lastTx.created_at).toLocaleDateString("en-NG")}` : "No recent transactions",
      "",
      `ACTIVE LOANS (${activeLoans.length}):`,
      ...(activeLoans.length === 0 ? ["  None"] : activeLoans.map((l: any) => {
        const monthly = Number(l.monthly_payment ?? 0);
        const remainingMonths = monthly > 0 ? Math.ceil(Number(l.outstanding_balance) / monthly) : "unknown";
        return `  • ${l.loan_type} loan — original ${fmt(l.principal_amount)}, outstanding ${fmt(l.outstanding_balance)}, monthly repayment ${fmt(monthly)}, ~${remainingMonths} months remaining, next payment ${l.next_payment_date ?? "n/a"}`;
      })),
      "",
      `LOAN REPAYMENT HISTORY (last 6):`,
      ...((repayR.data ?? []).length === 0 ? ["  None"] : (repayR.data ?? []).map((r: any) => `  • ${new Date(r.created_at).toLocaleDateString("en-NG")}: ${fmt(r.amount)}`)),
      "",
      `SPECIAL CONTRIBUTIONS:`,
      ...(activeContrib.length === 0 ? ["  None active"] : activeContrib.map((c: any) => {
        const monthsContributed = Number(c.monthly_amount) > 0 ? Math.floor(Number(c.total_contributed ?? 0) / Number(c.monthly_amount)) : 0;
        const expectedPayout = Number(c.monthly_amount) * Number(c.duration_months);
        return `  • Monthly ${fmt(c.monthly_amount)} × ${c.duration_months} months; contributed so far ${fmt(c.total_contributed)} (${monthsContributed} months); current balance ${fmt(c.balance)}; expected December payout ${fmt(expectedPayout)}; maturity ${c.maturity_date ?? "n/a"}`;
      })),
      "",
      `SHARES: ${sharesR.data?.total_shares ?? 0} shares, current value ${fmt(sharesR.data?.current_value)}${sharesR.data?.last_dividend_amount ? `, last dividend ${fmt(sharesR.data.last_dividend_amount)} on ${sharesR.data.last_dividend_date}` : ""}`,
      "",
      `RECENT TRANSACTIONS (last 10):`,
      ...((txR.data ?? []).length === 0 ? ["  None"] : (txR.data ?? []).map((t: any) => `  • ${new Date(t.created_at).toLocaleDateString("en-NG")}: ${t.type} ${fmt(t.amount)}${t.description ? ` — ${t.description}` : ""}`)),
      "",
      `Gross monthly salary: ${grossSalary ? fmt(grossSalary) : "not on file"}`,
      `Current total monthly deductions: ${fmt(totalMonthlyDeductions)} (loans ${fmt(monthlyLoanRepayments)} + contributions ${fmt(monthlyContrib)})`,
    ].filter(Boolean).join("\n");

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        max_tokens: 500,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: `LIVE MEMBER ACCOUNT DATA:\n${contextLines}` },
          ...messages,
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit — please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact an administrator." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ reply, firstName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("coop-assistant error", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
