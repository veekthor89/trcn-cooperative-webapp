import DashboardLayout from "@/components/DashboardLayout";
import { AdminRoute } from "@/components/AdminRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Printer, BarChart3 } from "lucide-react";
import { useReportsData } from "@/hooks/useReportsData";
import { Skeleton } from "@/components/ui/skeleton";
import ReportOverviewDashboard from "@/components/reports/ReportOverviewDashboard";
import ReportLoanReports from "@/components/reports/ReportLoanReports";
import ReportFinancialReports from "@/components/reports/ReportFinancialReports";
import ReportMemberReports from "@/components/reports/ReportMemberReports";
import ReportApplicationReports from "@/components/reports/ReportApplicationReports";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { format } from "date-fns";

const LOAN_TYPE_LABELS: Record<string, string> = { normal: "Normal", trade: "Trade", special: "Special", long_term: "Land/Housing" };

export default function AdminReports() {
  const { loans, loanApplications, accounts, transactions, profiles, specialContributions, shareSubscriptions, shares, isLoading, refetchAll } = useReportsData();
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const handleRefresh = () => {
    refetchAll();
    setLastRefreshed(new Date());
    toast.success("Reports data refreshed");
  };

  const handlePrint = () => window.print();

  const handleExportXLSX = () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const num = (n: any) => Number(n || 0);

      // Lookups
      const profileById = new Map(profiles.map((p: any) => [p.id, p]));
      const savingsByUser = new Map<string, number>();
      const sharesAcctByUser = new Map<string, number>();
      accounts.forEach((a: any) => {
        if (a.account_type === "savings") savingsByUser.set(a.user_id, num(a.balance));
        if (a.account_type === "shares") sharesAcctByUser.set(a.user_id, num(a.balance));
      });
      const sharesByUser = new Map<string, any>();
      (shares || []).forEach((s: any) => sharesByUser.set(s.user_id, s));

      // Per-user loan aggregation
      const loansByUser = new Map<string, { active: number; outstanding: number; principal: number; monthly: number }>();
      loans.forEach((l: any) => {
        const cur = loansByUser.get(l.user_id) || { active: 0, outstanding: 0, principal: 0, monthly: 0 };
        if (l.status === "active") {
          cur.active += 1;
          cur.outstanding += num(l.outstanding_balance);
          cur.principal += num(l.principal_amount);
          cur.monthly += num(l.monthly_payment);
        }
        loansByUser.set(l.user_id, cur);
      });

      // ===== Sheet 1: Executive Summary =====
      const totalMembers = profiles.length;
      const totalSavings = Array.from(savingsByUser.values()).reduce((s, v) => s + v, 0);
      const activeLoans = loans.filter((l: any) => l.status === "active");
      const totalOutstanding = activeLoans.reduce((s, l: any) => s + num(l.outstanding_balance), 0);
      const totalPrincipalActive = activeLoans.reduce((s, l: any) => s + num(l.principal_amount), 0);
      const totalSharesValue = (shares || []).reduce((s, sh: any) => s + num(sh.current_value), 0);
      const totalSharesUnits = (shares || []).reduce((s, sh: any) => s + num(sh.total_shares), 0);
      const interestIncome = activeLoans.reduce((s, l: any) => s + (num(l.principal_amount) * num(l.interest_rate) / 100), 0);
      const txDeposits = transactions.filter((t: any) => t.type === "deposit").reduce((s, t: any) => s + num(t.amount), 0);
      const txWithdrawals = transactions.filter((t: any) => t.type === "withdrawal").reduce((s, t: any) => s + num(t.amount), 0);
      const txRepayments = transactions.filter((t: any) => t.type === "repayment").reduce((s, t: any) => s + num(t.amount), 0);
      const txDisbursements = transactions.filter((t: any) => t.type === "loan_disbursement").reduce((s, t: any) => s + num(t.amount), 0);

      const summary = [
        ["TRCN Cooperative — Financial Report"],
        [`Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`],
        [],
        ["MEMBERSHIP"],
        ["Total Members", totalMembers],
        [],
        ["SAVINGS"],
        ["Total Savings Balance (₦)", totalSavings],
        ["Lifetime Deposits (₦)", txDeposits],
        ["Lifetime Withdrawals (₦)", txWithdrawals],
        [],
        ["SHARES"],
        ["Total Shares Units", totalSharesUnits],
        ["Total Shares Value (₦)", totalSharesValue],
        [],
        ["LOANS"],
        ["Active Loans Count", activeLoans.length],
        ["Total Active Principal (₦)", totalPrincipalActive],
        ["Total Outstanding Balance (₦)", totalOutstanding],
        ["Projected Interest Income (₦)", interestIncome],
        ["Lifetime Disbursements (₦)", txDisbursements],
        ["Lifetime Repayments (₦)", txRepayments],
        [],
        ["LOAN APPLICATIONS"],
        ["Total Applications", loanApplications.length],
        ["Pending", loanApplications.filter((a: any) => a.status === "pending").length],
        ["Approved", loanApplications.filter((a: any) => a.status === "approved").length],
        ["Rejected", loanApplications.filter((a: any) => a.status === "rejected").length],
        [],
        ["NET POSITION"],
        ["Members' Equity (Savings + Shares) (₦)", totalSavings + totalSharesValue],
        ["Outstanding Loan Portfolio (₦)", totalOutstanding],
      ];

      // ===== Sheet 2: Member Financial Summary =====
      const memberRows = profiles.map((p: any) => {
        const lo = loansByUser.get(p.id) || { active: 0, outstanding: 0, principal: 0, monthly: 0 };
        const sh = sharesByUser.get(p.id);
        return {
          "TRCN #": p.member_number || "",
          "Full Name": p.full_name || "",
          "Department": p.department || "",
          "Designation": p.designation || "",
          "Email": p.email || "",
          "Phone": p.phone || "",
          "Bank": p.bank_name || "",
          "Account Number": p.account_number || "",
          "Savings Balance (₦)": savingsByUser.get(p.id) || 0,
          "Shares Units": sh ? num(sh.total_shares) : 0,
          "Shares Value (₦)": sh ? num(sh.current_value) : 0,
          "Active Loans": lo.active,
          "Loan Principal (₦)": lo.principal,
          "Loan Outstanding (₦)": lo.outstanding,
          "Monthly Repayment (₦)": lo.monthly,
          "Total Equity (₦)": (savingsByUser.get(p.id) || 0) + (sh ? num(sh.current_value) : 0),
          "Net Position (₦)": (savingsByUser.get(p.id) || 0) + (sh ? num(sh.current_value) : 0) - lo.outstanding,
        };
      });

      // ===== Sheet 3: Loan Portfolio =====
      const loanRows = loans.map((l: any) => {
        const p: any = profileById.get(l.user_id) || {};
        return {
          "TRCN #": p.member_number || "",
          "Member": p.full_name || "",
          "Department": p.department || "",
          "Loan Type": LOAN_TYPE_LABELS[l.loan_type] || l.loan_type,
          "Status": l.status,
          "Principal (₦)": num(l.principal_amount),
          "Interest Rate (%)": num(l.interest_rate),
          "Outstanding (₦)": num(l.outstanding_balance),
          "Monthly Payment (₦)": num(l.monthly_payment),
          "Term (months)": l.repayment_period,
          "Next Payment": l.next_payment_date || "",
          "Disbursed": l.created_at ? format(new Date(l.created_at), "yyyy-MM-dd") : "",
        };
      });

      // ===== Sheet 4: Loan Applications =====
      const appRows = loanApplications.map((a: any) => ({
        "Application #": a.application_number || a.id?.slice(0, 8),
        "TRCN #": a.profiles?.member_number || "",
        "Member": a.profiles?.full_name || "",
        "Department": a.profiles?.department || "",
        "Loan Type": LOAN_TYPE_LABELS[a.loan_type] || a.loan_type,
        "Amount Requested (₦)": num(a.amount_requested),
        "Repayment Period": a.repayment_period,
        "Status": a.status,
        "Purpose": a.purpose || "",
        "Submitted": a.created_at ? format(new Date(a.created_at), "yyyy-MM-dd") : "",
      }));

      // ===== Sheet 5: Transactions =====
      const txRows = transactions
        .slice()
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((t: any) => {
          const p: any = profileById.get(t.user_id) || {};
          return {
            "Date": t.created_at ? format(new Date(t.created_at), "yyyy-MM-dd HH:mm") : "",
            "Reference": t.reference_number || "",
            "TRCN #": p.member_number || "",
            "Member": p.full_name || "",
            "Type": t.type,
            "Amount (₦)": num(t.amount),
            "Description": t.description || "",
          };
        });

      // ===== Sheet 6: Accounts =====
      const accountRows = accounts.map((a: any) => {
        const p: any = profileById.get(a.user_id) || {};
        return {
          "TRCN #": p.member_number || "",
          "Member": p.full_name || "",
          "Account Type": a.account_type,
          "Balance (₦)": num(a.balance),
          "Status": a.status,
        };
      });

      // ===== Sheet 7: Special Contributions =====
      const scRows = (specialContributions || []).map((s: any) => {
        const p: any = profileById.get(s.user_id) || {};
        return {
          "TRCN #": p.member_number || "",
          "Member": p.full_name || "",
          "Monthly Amount (₦)": num(s.monthly_amount),
          "Total Contributed (₦)": num(s.total_contributed),
          "Status": s.status,
          "Start Date": s.start_date || "",
          "Payout Date": s.payout_date || "",
        };
      });

      // ===== Sheet 8: Share Subscriptions =====
      const ssRows = (shareSubscriptions || []).map((s: any) => {
        const p: any = profileById.get(s.user_id) || {};
        return {
          "Application #": s.application_number || "",
          "TRCN #": p.member_number || "",
          "Member": p.full_name || "",
          "Units": num(s.number_of_shares),
          "Amount (₦)": num(s.total_amount),
          "Status": s.status,
          "Date": s.created_at ? format(new Date(s.created_at), "yyyy-MM-dd") : "",
        };
      });

      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.aoa_to_sheet(summary);
      wsSummary["!cols"] = [{ wch: 40 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(memberRows), "Member Financials");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(loanRows), "Loan Portfolio");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(appRows), "Loan Applications");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows), "Transactions");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accountRows), "Accounts");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(scRows), "Special Contributions");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ssRows), "Share Subscriptions");

      XLSX.writeFile(wb, `trcn-financial-report-${today}.xlsx`);
      toast.success("Report exported successfully");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to export report");
    }
  };

  return (
    <AdminRoute>
      <DashboardLayout>
        <div className="space-y-6 print-content">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Reports & Analytics</h1>
                <p className="text-xs text-muted-foreground">Last updated: {lastRefreshed.toLocaleTimeString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 print-hide">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportXLSX}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
              </div>
              <Skeleton className="h-64 rounded-lg" />
            </div>
          ) : (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="flex-wrap print-hide">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="loans">Loan Reports</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="applications">Applications</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <ReportOverviewDashboard loans={loans} loanApplications={loanApplications} accounts={accounts} transactions={transactions} profiles={profiles} />
              </TabsContent>

              <TabsContent value="loans">
                <ReportLoanReports loans={loans} profiles={profiles} />
              </TabsContent>

              <TabsContent value="financial">
                <ReportFinancialReports loans={loans} transactions={transactions} accounts={accounts} />
              </TabsContent>

              <TabsContent value="members">
                <ReportMemberReports profiles={profiles} loans={loans} accounts={accounts} />
              </TabsContent>

              <TabsContent value="applications">
                <ReportApplicationReports loanApplications={loanApplications} specialContributions={specialContributions} shareSubscriptions={shareSubscriptions} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DashboardLayout>
    </AdminRoute>
  );
}
