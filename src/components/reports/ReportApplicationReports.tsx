import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/hooks/useReportsData";
import { format } from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Props {
  loanApplications: any[];
  specialContributions: any[];
  shareSubscriptions: any[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "secondary",
  pending_financial_review: "secondary",
  pending_presidential_approval: "secondary",
  approved: "default",
  approved_awaiting_disbursement: "default",
  disbursed: "default",
  rejected: "destructive",
  info_requested: "outline",
};

const CHART_COLORS = ["hsl(38, 92%, 50%)", "hsl(142, 76%, 36%)", "hsl(217, 91%, 60%)", "hsl(0, 84%, 60%)", "hsl(270, 70%, 60%)"];

export default function ReportApplicationReports({ loanApplications, specialContributions, shareSubscriptions }: Props) {
  const now = new Date();
  const thisMonthApps = loanApplications.filter(a => {
    const d = new Date(a.application_date || a.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const pending = loanApplications.filter(a => ["pending", "pending_financial_review", "pending_presidential_approval", "info_requested"].includes(a.status));
  const approved = loanApplications.filter(a => ["approved", "approved_awaiting_disbursement", "disbursed"].includes(a.status));
  const rejected = loanApplications.filter(a => a.status === "rejected");

  // Status distribution
  const statusCounts: Record<string, number> = {};
  loanApplications.forEach(a => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    value,
  }));

  // Special contributions summary
  const scPending = specialContributions.filter(c => c.application_status === "pending");
  const scApproved = specialContributions.filter(c => ["approved", "active", "completed"].includes(c.application_status));
  const scRejected = specialContributions.filter(c => c.application_status === "rejected");

  // Share subscriptions summary
  const ssPending = shareSubscriptions.filter(s => s.status === "pending");
  const ssApproved = shareSubscriptions.filter(s => ["approved", "completed", "payment_verified"].includes(s.status));
  const ssRejected = shareSubscriptions.filter(s => s.status === "rejected");

  return (
    <Tabs defaultValue="loans" className="space-y-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="loans">Loan Applications</TabsTrigger>
        <TabsTrigger value="contributions">Special Contributions</TabsTrigger>
        <TabsTrigger value="shares">Share Applications</TabsTrigger>
      </TabsList>

      <TabsContent value="loans" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">This Month</p><p className="text-2xl font-bold">{thisMonthApps.length}</p></CardContent></Card>
          <Card className="shadow-card border-l-4 border-l-accent"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-accent">{pending.length}</p></CardContent></Card>
          <Card className="shadow-card border-l-4 border-l-secondary"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-secondary">{approved.length}</p><p className="text-xs text-muted-foreground">{formatNaira(approved.reduce((s, a) => s + Number(a.requested_amount || 0), 0))}</p></CardContent></Card>
          <Card className="shadow-card border-l-4 border-l-destructive"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Rejected</p><p className="text-2xl font-bold text-destructive">{rejected.length}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">Status Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={10}>
                      {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">Recent Applications</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {loanApplications.slice(0, 10).map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs">{a.application_date ? format(new Date(a.application_date), "dd MMM yy") : "—"}</TableCell>
                        <TableCell className="capitalize text-xs">{a.loan_type?.replace("_", " ")}</TableCell>
                        <TableCell className="text-right text-xs">{formatNaira(Number(a.requested_amount))}</TableCell>
                        <TableCell><Badge variant={(STATUS_COLORS[a.status] as any) || "secondary"} className="text-xs">{a.status.replace(/_/g, " ")}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="contributions" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{specialContributions.length}</p></CardContent></Card>
          <Card className="shadow-card border-l-4 border-l-accent"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-accent">{scPending.length}</p></CardContent></Card>
          <Card className="shadow-card border-l-4 border-l-secondary"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-secondary">{scApproved.length}</p><p className="text-xs text-muted-foreground">{formatNaira(scApproved.reduce((s, c) => s + Number(c.total_expected || 0), 0))}</p></CardContent></Card>
          <Card className="shadow-card border-l-4 border-l-destructive"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Rejected</p><p className="text-2xl font-bold text-destructive">{scRejected.length}</p></CardContent></Card>
        </div>
      </TabsContent>

      <TabsContent value="shares" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{shareSubscriptions.length}</p></CardContent></Card>
          <Card className="shadow-card border-l-4 border-l-accent"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-accent">{ssPending.length}</p></CardContent></Card>
          <Card className="shadow-card border-l-4 border-l-secondary"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-secondary">{ssApproved.length}</p><p className="text-xs text-muted-foreground">{formatNaira(ssApproved.reduce((s, ss) => s + Number(ss.total_cost || 0), 0))}</p></CardContent></Card>
          <Card className="shadow-card border-l-4 border-l-destructive"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Rejected</p><p className="text-2xl font-bold text-destructive">{ssRejected.length}</p></CardContent></Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
