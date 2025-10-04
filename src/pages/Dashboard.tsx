import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank, CreditCard, TrendingUp, Eye, Mail, Bell, Landmark, Coins, DollarSign as DollarIcon } from "lucide-react";
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

      // Fetch investments (savings goals)
      const {
        data: investments
      } = await supabase.from("savings_goals").select("current_amount").eq("user_id", userId);
      const totalInvestments = investments?.reduce((sum, inv) => sum + Number(inv.current_amount), 0) || 0;
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
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                Welcome {userProfile?.full_name || 'User'}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Coop No: {userProfile?.id?.slice(0, 8) || '----'})
                </span>
              </h1>
            </div>
            <div className="text-sm text-muted-foreground">{currentDate}</div>
          </div>

          {loading ? <div className="space-y-6">
              <Card className="animate-pulse h-40" />
              <div className="grid gap-6 md:grid-cols-3">
                {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-32" />)}
              </div>
            </div> : <>
              {/* Total Balance Card */}
              <Card className="bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg">
                <CardContent className="pt-6 pb-8">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white/90 text-sm">Total Balance</p>
                    <Eye className="h-5 w-5 text-white/80" />
                  </div>
                  <p className="text-4xl font-bold">
                    ₦{stats.totalBalance.toLocaleString('en-NG', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
                  </p>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-green-50 border-green-100 shadow-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-green-900 font-medium">Savings</p>
                      <Eye className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      ₦{stats.totalSavings.toLocaleString('en-NG', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-pink-50 border-pink-100 shadow-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-pink-900 font-medium">Loans</p>
                      <Eye className="h-5 w-5 text-pink-600" />
                    </div>
                    <p className="text-2xl font-bold text-pink-700">
                      ₦{stats.totalLoans.toLocaleString('en-NG', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-100 shadow-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-purple-900 font-medium">Shares</p>
                      <Eye className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-purple-700">
                      ₦{stats.totalInvestments.toLocaleString('en-NG', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Overview Chart */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Financial Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={[
                        { month: 'Jan', savings: 45000, loans: 30000, shares: 15000 },
                        { month: 'Feb', savings: 52000, loans: 28000, shares: 18000 },
                        { month: 'Mar', savings: 58000, loans: 25000, shares: 22000 },
                        { month: 'Apr', savings: 65000, loans: 23000, shares: 28000 },
                        { month: 'May', savings: 72000, loans: 20000, shares: 32000 },
                        { month: 'Jun', savings: 78000, loans: 18000, shares: 38000 },
                      ]}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLoans" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="month" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: number) => `₦${value.toLocaleString('en-NG')}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="savings" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorSavings)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="loans" 
                        stroke="#ec4899" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorLoans)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="shares" 
                        stroke="#a855f7" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorShares)" 
                      />
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
                      <span className="text-sm text-muted-foreground">Shares</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Summary */}
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Activity Summary</CardTitle>
                  <Button variant="link" className="text-primary">View All</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivities.length === 0 ? <p className="text-muted-foreground text-center py-8">No recent activities</p> : recentActivities.map((activity, index) => <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-smooth">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div>
                            <p className="font-medium capitalize">{activity.type} {activity.description || 'Transaction'}</p>
                            <p className="text-sm text-muted-foreground">{getTimeAgo(activity.created_at)}</p>
                          </div>
                        </div>
                        <p className="font-semibold">
                          ₦{Number(activity.amount).toLocaleString('en-NG', {
                    minimumFractionDigits: 2
                  })}
                        </p>
                      </div>)}
                </CardContent>
              </Card>
            </>}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 space-y-6 hidden lg:block">
          {/* Quick Actions */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Quick Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-auto py-4 bg-green-50 border-green-100 hover:bg-green-100">
                <Landmark className="h-5 w-5 mr-3 text-green-600" />
                <span className="text-sm">Make deposit</span>
              </Button>
              <Button variant="outline" className="w-full justify-start h-auto py-4 bg-pink-50 border-pink-100 hover:bg-pink-100">
                <CreditCard className="h-5 w-5 mr-3 text-pink-600" />
                <span className="text-sm">Apply for Loan</span>
              </Button>
              <Button variant="outline" className="w-full justify-start h-auto py-4 bg-purple-50 border-purple-100 hover:bg-purple-100">
                <TrendingUp className="h-5 w-5 mr-3 text-purple-600" />
                <span className="text-sm">Buy Shares</span>
              </Button>
              <Button variant="outline" className="w-full justify-start h-auto py-4 bg-orange-50 border-orange-100 hover:bg-orange-100">
                <Coins className="h-5 w-5 mr-3 text-orange-600" />
                <span className="text-sm">Special Contribution</span>
              </Button>
            </CardContent>
          </Card>

          {/* Inbox */}
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Inbox</CardTitle>
              <Button variant="link" className="text-primary text-sm">View All</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-smooth">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">ADMIN</p>
                    <p className="text-xs text-muted-foreground">12:23am</p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">Your loan has been approved, it will...</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-smooth">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">Ali Raza</p>
                    <p className="text-xs text-muted-foreground">Apr 10</p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">I have guaranteed the repayment of...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>;
};
export default Dashboard;