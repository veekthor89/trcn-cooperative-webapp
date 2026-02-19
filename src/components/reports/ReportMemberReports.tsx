import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/hooks/useReportsData";
import { Search, Users, UserPlus, AlertTriangle, Trophy } from "lucide-react";

interface Props {
  profiles: any[];
  loans: any[];
  accounts: any[];
}

export default function ReportMemberReports({ profiles, loans, accounts }: Props) {
  const [search, setSearch] = useState("");

  const activeLoans = loans.filter(l => l.status === "active");
  const savingsMap = Object.fromEntries(accounts.filter(a => a.account_type === "savings").map(a => [a.user_id, Number(a.balance || 0)]));

  // Member loan counts
  const memberLoans: Record<string, any[]> = {};
  activeLoans.forEach(l => {
    if (!memberLoans[l.user_id]) memberLoans[l.user_id] = [];
    memberLoans[l.user_id].push(l);
  });

  const now = new Date();
  const newThisMonth = profiles.filter(p => {
    const d = new Date(p.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // Financial summary
  const memberSummary = profiles.map(p => {
    const userLoans = memberLoans[p.id] || [];
    const totalOutstanding = userLoans.reduce((s, l) => s + Number(l.outstanding_balance || 0), 0);
    const monthlyDed = userLoans.reduce((s, l) => s + Number(l.monthly_payment || 0), 0);
    return {
      ...p,
      savings: savingsMap[p.id] || 0,
      activeLoansCount: userLoans.length,
      totalOutstanding,
      monthlyDeduction: monthlyDed,
    };
  }).filter(m => !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.member_number?.toLowerCase().includes(search.toLowerCase()));

  // Eligibility categories
  const eligible = memberSummary.filter(m => m.activeLoansCount < 3);
  const atMaxLoans = memberSummary.filter(m => m.activeLoansCount >= 3);
  const noLoans = memberSummary.filter(m => m.activeLoansCount === 0);

  // Top members
  const topSavers = [...memberSummary].sort((a, b) => b.savings - a.savings).slice(0, 10);
  const topBorrowers = [...memberSummary].sort((a, b) => b.totalOutstanding - a.totalOutstanding).filter(m => m.totalOutstanding > 0).slice(0, 10);

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="financial">Financial Summary</TabsTrigger>
        <TabsTrigger value="eligibility">Eligibility Status</TabsTrigger>
        <TabsTrigger value="top">Top Members</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card"><CardContent className="p-4 flex items-center gap-3"><Users className="h-8 w-8 text-primary" /><div><p className="text-xs text-muted-foreground">Total Members</p><p className="text-2xl font-bold">{profiles.length}</p></div></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4 flex items-center gap-3"><Users className="h-8 w-8 text-secondary" /><div><p className="text-xs text-muted-foreground">Active (with loans)</p><p className="text-2xl font-bold">{Object.keys(memberLoans).length}</p></div></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4 flex items-center gap-3"><UserPlus className="h-8 w-8 text-accent" /><div><p className="text-xs text-muted-foreground">New This Month</p><p className="text-2xl font-bold">{newThisMonth.length}</p></div></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-xs text-muted-foreground">At Max Loans</p><p className="text-2xl font-bold">{atMaxLoans.length}</p></div></CardContent></Card>
        </div>
      </TabsContent>

      <TabsContent value="financial" className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or member number..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        </div>
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead><TableHead>Member ID</TableHead><TableHead>Password Status</TableHead><TableHead className="text-right">Savings</TableHead><TableHead className="text-right">Active Loans</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead className="text-right">Monthly Deduction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberSummary.slice(0, 50).map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.full_name}</TableCell>
                      <TableCell>{m.member_number || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={m.must_change_password ? "destructive" : "secondary"}>
                          {m.must_change_password ? "Default" : "Changed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatNaira(m.savings)}</TableCell>
                      <TableCell className="text-right">{m.activeLoansCount}</TableCell>
                      <TableCell className="text-right">{formatNaira(m.totalOutstanding)}</TableCell>
                      <TableCell className="text-right">{formatNaira(m.monthlyDeduction)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {memberSummary.length > 50 && <p className="text-xs text-muted-foreground text-center py-3">Showing 50 of {memberSummary.length} members. Use search to filter.</p>}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="eligibility" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-card border-l-4 border-l-secondary"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Eligible for New Loans</p><p className="text-2xl font-bold text-secondary">{eligible.length}</p><p className="text-xs text-muted-foreground">&lt; 3 active loans</p></CardContent></Card>
          <Card className="shadow-card border-l-4 border-l-destructive"><CardContent className="p-4"><p className="text-xs text-muted-foreground">At Maximum Loans (3/3)</p><p className="text-2xl font-bold text-destructive">{atMaxLoans.length}</p></CardContent></Card>
          <Card className="shadow-card border-l-4 border-l-primary"><CardContent className="p-4"><p className="text-xs text-muted-foreground">No Active Loans</p><p className="text-2xl font-bold text-primary">{noLoans.length}</p></CardContent></Card>
        </div>
        {atMaxLoans.length > 0 && (
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-base text-destructive">Members at Maximum Loan Capacity</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Member ID</TableHead><TableHead className="text-right">Active Loans</TableHead><TableHead className="text-right">Total Outstanding</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {atMaxLoans.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.full_name}</TableCell>
                        <TableCell>{m.member_number || "N/A"}</TableCell>
                        <TableCell className="text-right"><Badge variant="destructive">{m.activeLoansCount}/3</Badge></TableCell>
                        <TableCell className="text-right">{formatNaira(m.totalOutstanding)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="top" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-accent" /> Top 10 Savers</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Member</TableHead><TableHead className="text-right">Savings</TableHead></TableRow></TableHeader>
                <TableBody>
                  {topSavers.map((m, i) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                      <TableCell className="font-medium">{m.full_name}</TableCell>
                      <TableCell className="text-right font-semibold">{formatNaira(m.savings)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-accent" /> Top 10 Borrowers</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Member</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader>
                <TableBody>
                  {topBorrowers.map((m, i) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                      <TableCell className="font-medium">{m.full_name}</TableCell>
                      <TableCell className="text-right font-semibold">{formatNaira(m.totalOutstanding)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
