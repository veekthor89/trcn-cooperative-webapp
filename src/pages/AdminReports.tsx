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

export default function AdminReports() {
  const { loans, loanApplications, accounts, transactions, profiles, specialContributions, shareSubscriptions, isLoading, refetchAll } = useReportsData();
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const handleRefresh = () => {
    refetchAll();
    setLastRefreshed(new Date());
    toast.success("Reports data refreshed");
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    // Simple CSV export of member financial summary
    const headers = ["Name", "Member Number", "Department"];
    const rows = profiles.map(p => [p.full_name, p.member_number || "", p.department || ""]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trcn-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
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
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" /> CSV
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
