import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank, CreditCard, TrendingUp, Bell, Landmark, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalSavings: 0,
    totalLoans: 0,
    totalInvestments: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  useEffect(() => {
    fetchDashboardData();
  }, []);
  const fetchDashboardData = async () => {
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      // Fetch user profile
      const {
        data: profile
      } = await supabase.from("profiles").select("*").eq("id", userId).single();
      setUserProfile(profile);

      // Fetch savings accounts
      const {
        data: savingsAccounts
      } = await supabase.from("accounts").select("balance").eq("user_id", userId).eq("account_type", "savings");
      const totalSavings = savingsAccounts?.reduce((sum, account) => sum + Number(account.balance), 0) || 0;

      // Fetch loans
      const {
        data: loans
      } = await supabase.from("loans").select("principal_amount").eq("user_id", userId).eq("status", "active");
      const totalLoans = loans?.reduce((sum, loan) => sum + Number(loan.principal_amount), 0) || 0;

      // Fetch special contributions
      const {
        data: contributions
      } = await supabase.from("special_contributions").select("current_amount").eq("user_id", userId);
      const totalInvestments = contributions?.reduce((sum, inv) => sum + Number(inv.current_amount), 0) || 0;
      const totalBalance = totalSavings + totalInvestments - totalLoans;
      setStats({
        totalBalance,
        totalSavings,
        totalLoans,
        totalInvestments
      });

      // Fetch recent transactions
      const {
        data: transactions
      } = await supabase.from("transactions").select("*").eq("user_id", userId).order("created_at", {
        ascending: false
      }).limit(5);
      setRecentActivities(transactions || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'loan':
        return <CreditCard className="h-5 w-5 text-pink-600" />;
      case 'investment':
      case 'shares':
        return <TrendingUp className="h-5 w-5 text-purple-600" />;
      case 'contribution':
        return <Coins className="h-5 w-5 text-orange-600" />;
      default:
        return <PiggyBank className="h-5 w-5 text-green-600" />;
    }
  };
  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    if (diffWeeks > 0) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return 'Today';
  };
  const currentDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return <DashboardLayout>
      <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome back, {userProfile?.full_name || 'User'}!
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Here's what's happening with your account today.
              </p>
              
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}</span>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center">3</span>
              </Button>
            </div>
          </div>

          {loading ? <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-32" />)}
              </div>
            </div> : <>
              {/* Stats Cards - Full Width */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">Total Savings</p>
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                      ₦{stats.totalSavings.toLocaleString('en-NG')}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">+12% from last month</p>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">Active Loans</p>
                      <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-3xl font-bold text-red-700 dark:text-red-300">
                      ₦{stats.totalLoans.toLocaleString('en-NG')}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">1 active loan</p>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Special Contributions</p>
                      <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                      ₦{stats.totalInvestments.toLocaleString('en-NG')}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">Various contributions</p>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Overview and Quick Actions */}
              <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
                {/* Financial Overview Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Financial Overview</CardTitle>
                    <p className="text-sm text-muted-foreground">Your financial performance over the last 6 months</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={[{
                  month: 'Jan',
                  savings: 45000,
                  loans: 30000,
                  contributions: 15000
                }, {
                  month: 'Feb',
                  savings: 52000,
                  loans: 28000,
                  contributions: 18000
                }, {
                  month: 'Mar',
                  savings: 58000,
                  loans: 25000,
                  contributions: 22000
                }, {
                  month: 'Apr',
                  savings: 65000,
                  loans: 23000,
                  contributions: 28000
                }, {
                  month: 'May',
                  savings: 72000,
                  loans: 20000,
                  contributions: 32000
                }, {
                  month: 'Jun',
                  savings: 78000,
                  loans: 18000,
                  contributions: 38000
                }]} margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0
                }}>
                        <defs>
                          <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorLoans" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorContributions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={value => `₦${(value / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} formatter={(value: number) => `₦${value.toLocaleString('en-NG')}`} />
                        <Area type="monotone" dataKey="savings" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorSavings)" />
                        <Area type="monotone" dataKey="loans" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorLoans)" />
                        <Area type="monotone" dataKey="contributions" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorContributions)" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-6 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-600"></div>
                        <span className="text-sm text-muted-foreground">Savings</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-pink-600"></div>
                        <span className="text-sm text-muted-foreground">Loans</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                        <span className="text-sm text-muted-foreground">Contributions</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                    <p className="text-xs text-muted-foreground">Common tasks you can perform</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start h-auto py-3 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 hover:bg-green-100 dark:hover:bg-green-950/30 text-left">
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                          <Landmark className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">Make Deposit</p>
                          <p className="text-xs text-green-600 dark:text-green-400">Add money to savings</p>
                        </div>
                      </div>
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-auto py-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-950/30 text-left">
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <CreditCard className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Apply for Loan</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">Submit loan application</p>
                        </div>
                      </div>
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-auto py-3 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900 hover:bg-purple-100 dark:hover:bg-purple-950/30 text-left">
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Add Contribution</p>
                          <p className="text-xs text-purple-600 dark:text-purple-400">Make special contribution</p>
                        </div>
                      </div>
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-auto py-3 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900 hover:bg-orange-100 dark:hover:bg-orange-950/30 text-left">
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                          <Coins className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Transfer Funds</p>
                          <p className="text-xs text-orange-600 dark:text-orange-400">Send to another member</p>
                        </div>
                      </div>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Recent Activity</CardTitle>
                  <p className="text-sm text-muted-foreground">Your latest transactions for {userProfile?.full_name || 'User'}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentActivities.length === 0 ? <p className="text-muted-foreground text-center py-8">No recent activities</p> : recentActivities.map((activity, index) => <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-smooth">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div>
                            <p className="font-medium text-sm capitalize">{activity.description || activity.type}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{new Date(activity.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}</span>
                              <span>•</span>
                              <span className="capitalize">{activity.type}</span>
                            </div>
                          </div>
                        </div>
                        <p className={`font-semibold text-lg ${activity.type === 'deposit' || activity.type === 'investment' ? 'text-green-600' : 'text-red-600'}`}>
                          {activity.type === 'deposit' || activity.type === 'investment' ? '+' : '-'}₦{Number(activity.amount).toLocaleString('en-NG')}
                        </p>
                      </div>)}
                  {recentActivities.length > 0 && <Button variant="outline" className="w-full mt-4">
                      Load More Transactions
                    </Button>}
                </CardContent>
              </Card>
            </>}
      </div>
    </DashboardLayout>;
};
export default Dashboard;