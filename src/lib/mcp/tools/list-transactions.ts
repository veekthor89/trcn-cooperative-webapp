import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_my_transactions",
  title: "List my transactions",
  description:
    "List the signed-in member's recent transactions (deposits, withdrawals, repayments, etc.). Optionally set `limit` (1-100, default 25).",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max transactions to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const n = limit ?? 25;
    const { data, error } = await supabaseForUser(ctx)
      .from("transactions")
      .select("id, type, amount, description, created_at, account_id")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(n);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { transactions: data ?? [] },
    };
  },
});
