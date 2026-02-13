import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNaira } from "@/hooks/useReportsData";
import { format } from "date-fns";

interface Props {
  loans: any[];
  transactions: any[];
  accounts: any[];
}

const LOAN_TYPE_LABELS: Record<string, string> = { normal: "Normal", trade: "Trade", special: "Special", long_term: "Land/Housing" };

export default function ReportFinancialReports({ loans, transactions, accounts }: Props) {
  const now = new Date();

  // Revenue by loan type interest
  const activeLoans = loans.filter(l => l.status === "active");
  const interestByType = ["normal", "trade", "special", "long_term"].map(type => {
    const typed = activeLoans.filter(l => l.loan_type === type);
    const interest = typed.reduce((s, l) => s + (Number(l.principal_amount || 0) * Number(l.interest_rate || 0) / 100), 0);
    return { type, label: LOAN_TYPE_LABELS[type], interest };
  });
  const totalRevenue = interestByType.reduce((s, t) => s + t.interest, 0);

  // This month's transactions
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const repayments = thisMonth.filter(t => t.type === "repayment").reduce((s, t) => s + Number(t.amount || 0), 0);
  const deposits = thisMonth.filter(t => t.type === "deposit").reduce((s, t) => s + Number(t.amount || 0), 0);
  const disbursementsTxn = thisMonth.filter(t => t.type === "loan_disbursement").reduce((s, t) => s + Number(t.amount || 0), 0);

  // Daily collections grouped
  const dailyMap: Record<string, { repayments: number; savings: number; total: number }> = {};
  thisMonth.filter(t => ["deposit", "repayment"].includes(t.type)).forEach(t => {
    const day = format(new Date(t.created_at), "yyyy-MM-dd");
    if (!dailyMap[day]) dailyMap[day] = { repayments: 0, savings: 0, total: 0 };
    if (t.type === "repayment") dailyMap[day].repayments += Number(t.amount || 0);
    if (t.type === "deposit") dailyMap[day].savings += Number(t.amount || 0);
    dailyMap[day].total += Number(t.amount || 0);
  });
  const dailyCollections = Object.entries(dailyMap).sort(([a], [b]) => b.localeCompare(a)).slice(0, 30);

  // Disbursements by type this month
  const disbursedLoans = loans.filter(l => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const disbByType = ["normal", "trade", "special", "long_term"].map(type => {
    const typed = disbursedLoans.filter(l => l.loan_type === type);
    return { label: LOAN_TYPE_LABELS[type], count: typed.length, amount: typed.reduce((s, l) => s + Number(l.principal_amount || 0), 0) };
  });

  // Cash flow
  const totalInflows = repayments + deposits;
  const totalOutflows = disbursementsTxn;
  const totalSavings = accounts.filter(a => a.account_type === "savings").reduce((s, a) => s + Number(a.balance || 0), 0);

  return (
    <Tabs defaultValue="revenue" className="space-y-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="revenue">Revenue Summary</TabsTrigger>
        <TabsTrigger value="collections">Collections</TabsTrigger>
        <TabsTrigger value="disbursements">Disbursements</TabsTrigger>
        <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
      </TabsList>

      <TabsContent value="revenue" className="space-y-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Revenue Breakdown (Interest Income)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {interestByType.map(t => (
                <div key={t.type} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm">Interest from {t.label} Loans</span>
                  <span className="font-semibold">{formatNaira(t.interest)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 font-bold text-lg">
                <span>Total Revenue</span>
                <span className="text-primary">{formatNaira(totalRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="collections" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Loan Repayments</p><p className="text-xl font-bold">{formatNaira(repayments)}</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Savings Deposits</p><p className="text-xl font-bold">{formatNaira(deposits)}</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Collected</p><p className="text-xl font-bold text-primary">{formatNaira(repayments + deposits)}</p></CardContent></Card>
        </div>
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Daily Collections</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Date</TableHead><TableHead className="text-right">Repayments</TableHead><TableHead className="text-right">Savings</TableHead><TableHead className="text-right">Total</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {dailyCollections.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No collections this month</TableCell></TableRow>
                  ) : dailyCollections.map(([date, d]) => (
                    <TableRow key={date}>
                      <TableCell>{format(new Date(date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-right">{formatNaira(d.repayments)}</TableCell>
                      <TableCell className="text-right">{formatNaira(d.savings)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatNaira(d.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="disbursements" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {disbByType.map(d => (
            <Card key={d.label} className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{d.label} Loans</p><p className="text-xl font-bold">{formatNaira(d.amount)}</p><p className="text-xs text-muted-foreground">{d.count} loans</p></CardContent></Card>
          ))}
        </div>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between font-bold text-lg">
              <span>Total Disbursed This Month</span>
              <span className="text-destructive">{formatNaira(disbByType.reduce((s, d) => s + d.amount, 0))}</span>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="cashflow" className="space-y-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Cash Flow Summary — {format(now, "MMMM yyyy")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b"><span>Total Savings Base</span><span className="font-semibold">{formatNaira(totalSavings)}</span></div>
              <div className="flex justify-between py-2 border-b text-secondary"><span>Total Inflows (Collections)</span><span className="font-semibold">+ {formatNaira(totalInflows)}</span></div>
              <div className="flex justify-between py-2 border-b text-destructive"><span>Total Outflows (Disbursements)</span><span className="font-semibold">- {formatNaira(totalOutflows)}</span></div>
              <div className="flex justify-between py-2 font-bold text-lg">
                <span>Net Cash Flow</span>
                <span className={totalInflows - totalOutflows >= 0 ? "text-secondary" : "text-destructive"}>
                  {formatNaira(totalInflows - totalOutflows)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
