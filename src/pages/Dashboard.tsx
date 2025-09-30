import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank, CreditCard, TrendingUp, DollarSign } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSavings: 0,
    activeLoans: 0,
    savingsGoals: 0,
    recentTransactions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // Fetch savings accounts
      const { data: savingsAccounts } = await supabase
        .from("accounts")
        .select("balance")
        .eq("user_id", userId)
        .eq("account_type", "savings");

      const totalSavings = savingsAccounts?.reduce((sum, account) => sum + Number(account.balance), 0) || 0;

      // Fetch active loans
      const { count: loansCount } = await supabase
        .from("loans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active");

      // Fetch savings goals
      const { count: goalsCount } = await supabase
        .from("savings_goals")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Fetch recent transactions
      const { count: transactionsCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        totalSavings,
        activeLoans: loansCount || 0,
        savingsGoals: goalsCount || 0,
        recentTransactions: transactionsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Savings",
      value: `$${stats.totalSavings.toFixed(2)}`,
      icon: PiggyBank,
      color: "text-secondary",
    },
    {
      title: "Active Loans",
      value: stats.activeLoans.toString(),
      icon: CreditCard,
      color: "text-primary",
    },
    {
      title: "Savings Goals",
      value: stats.savingsGoals.toString(),
      icon: TrendingUp,
      color: "text-accent",
    },
    {
      title: "Recent Transactions",
      value: stats.recentTransactions.toString(),
      icon: DollarSign,
      color: "text-primary-glow",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your financial overview.</p>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-4 bg-muted rounded w-24" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.title} className="shadow-card transition-smooth hover:shadow-elevated">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button className="w-full p-4 text-left rounded-lg border border-border hover:bg-muted transition-smooth">
                <div className="flex items-center gap-3">
                  <PiggyBank className="h-5 w-5 text-secondary" />
                  <div>
                    <p className="font-medium">Make a Deposit</p>
                    <p className="text-sm text-muted-foreground">Add funds to your savings</p>
                  </div>
                </div>
              </button>
              <button className="w-full p-4 text-left rounded-lg border border-border hover:bg-muted transition-smooth">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Apply for Loan</p>
                    <p className="text-sm text-muted-foreground">Submit a new loan application</p>
                  </div>
                </div>
              </button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentTransactions === 0 ? (
                <p className="text-muted-foreground text-sm">No recent transactions</p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  You have {stats.recentTransactions} recent transactions
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
