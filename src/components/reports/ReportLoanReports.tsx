import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatNaira } from "@/hooks/useReportsData";
import { Search, AlertTriangle } from "lucide-react";

interface Props {
  loans: any[];
  profiles: any[];
}

const LOAN_TYPES = ["normal", "trade", "special", "long_term"] as const;
const LOAN_TYPE_LABELS: Record<string, string> = { normal: "Normal", trade: "Trade", special: "Special", long_term: "Land/Housing" };

export default function ReportLoanReports({ loans, profiles }: Props) {
  const [search, setSearch] = useState("");

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));

  const activeLoans = loans.filter(l => l.status === "active");
  const closedLoans = loans.filter(l => l.status === "closed");
  const totalDisbursed = loans.reduce((s, l) => s + Number(l.principal_amount || 0), 0);
  const totalOutstanding = activeLoans.reduce((s, l) => s + Number(l.outstanding_balance || 0), 0);
  const totalPaid = closedLoans.reduce((s, l) => s + Number(l.principal_amount || 0), 0);

  // By type breakdown
  const byType = LOAN_TYPES.map(type => {
    const typedLoans = loans.filter(l => l.loan_type === type);
    const active = typedLoans.filter(l => l.status === "active");
    const outstanding = active.reduce((s, l) => s + Number(l.outstanding_balance || 0), 0);
    const disbursed = typedLoans.reduce((s, l) => s + Number(l.principal_amount || 0), 0);
    const interest = typedLoans.reduce((s, l) => s + (Number(l.principal_amount || 0) * Number(l.interest_rate || 0) / 100), 0);
    const avgAmount = typedLoans.length ? disbursed / typedLoans.length : 0;
    const avgDuration = typedLoans.length ? typedLoans.reduce((s, l) => s + Number(l.repayment_period || 0), 0) / typedLoans.length : 0;
    return { type, label: LOAN_TYPE_LABELS[type], count: typedLoans.length, disbursed, outstanding, interest, avgAmount, avgDuration: Math.round(avgDuration) };
  });

  // Repayment status with member info
  const repaymentData = activeLoans.map(l => {
    const profile = profileMap[l.user_id];
    const paid = Number(l.principal_amount || 0) - Number(l.outstanding_balance || 0);
    const progress = Number(l.principal_amount) > 0 ? (paid / Number(l.principal_amount)) * 100 : 0;
    return {
      ...l,
      memberName: profile?.full_name || "Unknown",
      memberId: profile?.member_number || "N/A",
      progress: Math.round(progress),
    };
  }).filter(l => !search || l.memberName.toLowerCase().includes(search.toLowerCase()) || l.memberId.toLowerCase().includes(search.toLowerCase()));

  // Members with multiple loans
  const memberLoanCounts: Record<string, any[]> = {};
  activeLoans.forEach(l => {
    if (!memberLoanCounts[l.user_id]) memberLoanCounts[l.user_id] = [];
    memberLoanCounts[l.user_id].push(l);
  });
  const multiLoanMembers = Object.entries(memberLoanCounts)
    .filter(([, loans]) => loans.length >= 2)
    .map(([userId, userLoans]) => {
      const profile = profileMap[userId];
      const totalOuts = userLoans.reduce((s, l) => s + Number(l.outstanding_balance || 0), 0);
      const monthlyDed = userLoans.reduce((s, l) => s + Number(l.monthly_payment || 0), 0);
      return {
        userId,
        name: profile?.full_name || "Unknown",
        memberId: profile?.member_number || "N/A",
        activeLoans: userLoans.length,
        totalOutstanding: totalOuts,
        monthlyDeduction: monthlyDed,
      };
    })
    .sort((a, b) => b.activeLoans - a.activeLoans);

  return (
    <Tabs defaultValue="portfolio" className="space-y-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="portfolio">Portfolio Summary</TabsTrigger>
        <TabsTrigger value="repayment">Repayment Status</TabsTrigger>
        <TabsTrigger value="performance">Performance Analytics</TabsTrigger>
        <TabsTrigger value="multiple">Multiple Loans</TabsTrigger>
      </TabsList>

      <TabsContent value="portfolio" className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Disbursed</p><p className="text-xl font-bold">{formatNaira(totalDisbursed)}</p><p className="text-xs text-muted-foreground">{loans.length} loans</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Loans</p><p className="text-xl font-bold">{activeLoans.length}</p><p className="text-xs text-muted-foreground">{formatNaira(totalOutstanding)} outstanding</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed Loans</p><p className="text-xl font-bold">{closedLoans.length}</p><p className="text-xs text-muted-foreground">{formatNaira(totalPaid)} total paid</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Interest Earned</p><p className="text-xl font-bold">{formatNaira(byType.reduce((s, t) => s + t.interest, 0))}</p></CardContent></Card>
        </div>

        {/* Breakdown by type */}
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Breakdown by Loan Type</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan Type</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Total Disbursed</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead className="text-right">Interest Earned</TableHead><TableHead className="text-right">Avg. Amount</TableHead><TableHead className="text-right">Avg. Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byType.map(t => (
                    <TableRow key={t.type}>
                      <TableCell className="font-medium">{t.label}</TableCell>
                      <TableCell className="text-right">{t.count}</TableCell>
                      <TableCell className="text-right">{formatNaira(t.disbursed)}</TableCell>
                      <TableCell className="text-right">{formatNaira(t.outstanding)}</TableCell>
                      <TableCell className="text-right">{formatNaira(t.interest)}</TableCell>
                      <TableCell className="text-right">{formatNaira(t.avgAmount)}</TableCell>
                      <TableCell className="text-right">{t.avgDuration} months</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{loans.length}</TableCell>
                    <TableCell className="text-right">{formatNaira(totalDisbursed)}</TableCell>
                    <TableCell className="text-right">{formatNaira(totalOutstanding)}</TableCell>
                    <TableCell className="text-right">{formatNaira(byType.reduce((s, t) => s + t.interest, 0))}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right">—</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="repayment" className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by member name or ID..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        </div>
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead><TableHead>TRCN Number</TableHead><TableHead>Loan Type</TableHead><TableHead className="text-right">Principal</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead className="text-right">Monthly Payment</TableHead><TableHead>Status</TableHead><TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repaymentData.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No active loans found</TableCell></TableRow>
                  ) : repaymentData.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.memberName}</TableCell>
                      <TableCell>{l.memberId}</TableCell>
                      <TableCell>{LOAN_TYPE_LABELS[l.loan_type] || l.loan_type}</TableCell>
                      <TableCell className="text-right">{formatNaira(Number(l.principal_amount))}</TableCell>
                      <TableCell className="text-right">{formatNaira(Number(l.outstanding_balance))}</TableCell>
                      <TableCell className="text-right">{formatNaira(Number(l.monthly_payment || 0))}</TableCell>
                      <TableCell><Badge variant={l.status === "active" ? "default" : "secondary"}>{l.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={l.progress} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-10 text-right">{l.progress}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="performance" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {byType.map(t => (
            <Card key={t.type} className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">{t.label} Loans</p>
                <p className="text-lg font-bold mt-1">{formatNaira(t.avgAmount)}</p>
                <p className="text-xs text-muted-foreground">avg. size • {t.avgDuration}mo avg. period</p>
                <p className="text-xs text-muted-foreground mt-1">{t.count} loans • {formatNaira(t.interest)} interest</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Most Popular Loan Type</CardTitle></CardHeader>
          <CardContent>
            {byType.sort((a, b) => b.count - a.count).slice(0, 1).map(t => (
              <div key={t.type} className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{t.label}</p>
                  <p className="text-sm text-muted-foreground">{t.count} loans totaling {formatNaira(t.disbursed)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="multiple" className="space-y-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-accent" />
              Members with Multiple Active Loans ({multiLoanMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead><TableHead>TRCN Number</TableHead><TableHead className="text-right">Active Loans</TableHead><TableHead className="text-right">Total Outstanding</TableHead><TableHead className="text-right">Monthly Deduction</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {multiLoanMembers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No members with multiple loans</TableCell></TableRow>
                  ) : multiLoanMembers.map(m => (
                    <TableRow key={m.userId}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.memberId}</TableCell>
                      <TableCell className="text-right">{m.activeLoans}/3</TableCell>
                      <TableCell className="text-right">{formatNaira(m.totalOutstanding)}</TableCell>
                      <TableCell className="text-right">{formatNaira(m.monthlyDeduction)}</TableCell>
                      <TableCell>
                        <Badge variant={m.activeLoans >= 3 ? "destructive" : "default"}>
                          {m.activeLoans >= 3 ? "At Limit" : "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function CreditCard(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;
}
