import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import listAccounts from "./tools/list-accounts";
import listLoans from "./tools/list-loans";
import listTransactions from "./tools/list-transactions";
import listContributions from "./tools/list-contributions";

// OAuth issuer must be the direct supabase.co host built from the project ref.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "trcn-coop-mcp",
  title: "TRCN Cooperative Society",
  version: "0.1.0",
  instructions:
    "Read-only tools for a signed-in TRCN Staff Multipurpose Cooperative Society member. Use these to look up the member's profile, accounts, loans, transactions, and special contributions. All calls act as the signed-in user and respect the cooperative's access policies.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, listAccounts, listLoans, listTransactions, listContributions],
});
