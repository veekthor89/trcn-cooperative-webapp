import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, PiggyBank, TrendingUp, AlertTriangle, Clock, Banknote, CheckCircle } from "lucide-react";
import { formatNaira } from "@/hooks/useReportsData";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, Legend, ResponsiveContainer } from "recharts";

interface Props {
  loans: any[];
  loanApplications: any[];
  accounts: any[];
  transactions: any[];
  profiles: any[];
}

const CHART_COLORS = ["hsl(217, 91%, 60%)", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(270, 70%, 60%)"];

export default function ReportOverviewDashboard({ loans, loanApplications, accounts, transactions, profiles }: Props) {
  const activeLoans = loans.filter(l => l.status === "active");
  const totalOutstanding = activeLoans.reduce((s, l) => s + Number(l.outstanding_balance || 0), 0);
  const totalSavings = accounts.filter(a => a.account_type === "savings").reduce((s, a) => s + Number(a.balance || 0), 0);
  const pendingApplications = loanApplications.filter(a => ["pending", "pending_financial_review", "pending_presidential_approval"].includes(a.status));
  const totalInterest = activeLoans.reduce((s, l) => s + (Number(l.principal_amount || 0) * Number(l.interest_rate || 0) / 100), 0);
  const membersWithMaxLoans = (() => {
    const counts: Record<string, number> = {};
    activeLoans.forEach(l => { counts[l.user_id] = (counts[l.user_id] || 0) + 1; });
    return Object.values(counts).filter(c => c >= 3).length;
  })();

  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const collections = thisMonth.filter(t => ["deposit", "repayment"].includes(t.type)).reduce((s, t) => s + Number(t.amount || 0), 0);
  const disbursements = thisMonth.filter(t => t.type === "loan_disbursement").reduce((s, t) => s + Number(t.amount || 0), 0);

  // Loan type distribution
  const loanTypeMap: Record<string, number> = {};
  activeLoans.forEach(l => { loanTypeMap[l.loan_type] = (loanTypeMap[l.loan_type] || 0) + 1; });
  const loanTypeData = Object.entries(loanTypeMap).map(([name, value]) => ({
    name: name.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()),
    value,
  }));

  // Monthly trends (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const month = d.toLocaleString("default", { month: "short" });
    const txns = transactions.filter(t => {
      const td = new Date(t.created_at);
      return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
    });
    return {
      month,
      disbursed: txns.filter(t => t.type === "loan_disbursement").reduce((s, t) => s + Number(t.amount || 0), 0),
      collected: txns.filter(t => ["deposit", "repayment"].includes(t.type)).reduce((s, t) => s + Number(t.amount || 0), 0),
      savings: txns.filter(t => t.type === "deposit").reduce((s, t) => s + Number(t.amount || 0), 0),
    };
  });

  const summaryCards = [
    { title: "Total Active Members", value: profiles.length, icon: Users, color: "text-primary" },
    { title: "Total Loans Outstanding", value: formatNaira(totalOutstanding), icon: CreditCard, subtitle: `${activeLoans.length} active loans`, color: "text-destructive" },
    { title: "Total Savings Balance", value: formatNaira(totalSavings), icon: PiggyBank, color: "text-secondary" },
    { title: "Monthly Interest Revenue", value: formatNaira(totalInterest), icon: TrendingUp, color: "text-accent" },
  ];

  const kpiItems = [
    { label: "Active Loans", value: `${activeLoans.length} loans (${formatNaira(totalOutstanding)})`, icon: CheckCircle },
    { label: "Pending Applications", value: `${pendingApplications.length} applications`, icon: Clock },
    { label: "Members at Max Capacity", value: `${membersWithMaxLoans} members`, icon: AlertTriangle },
    { label: "This Month's Collections", value: formatNaira(collections), icon: Banknote },
    { label: "This Month's Disbursements", value: formatNaira(disbursements), icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{card.title}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  {card.subtitle && <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>}
                </div>
                <card.icon className={`h-8 w-8 ${card.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPIs */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Key Performance Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpiItems.map((item) => (
              <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <item.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disbursement Trend */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Loan Disbursement Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ disbursed: { label: "Disbursed", color: "hsl(217, 91%, 60%)" } }} className="h-[250px]">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="disbursed" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Loan Types Distribution */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Loan Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={loanTypeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                    {loanTypeData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Savings Growth */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Savings Growth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ savings: { label: "Savings", color: "hsl(142, 76%, 36%)" } }} className="h-[250px]">
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="savings" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36% / 0.2)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue vs Disbursements */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Collections vs Disbursements</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ collected: { label: "Collections", color: "hsl(142, 76%, 36%)" }, disbursed: { label: "Disbursements", color: "hsl(0, 84%, 60%)" } }} className="h-[250px]">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="collected" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="disbursed" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                <Legend />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
