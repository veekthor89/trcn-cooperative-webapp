import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank, CreditCard, TrendingUp, Bell, Landmark, Coins, AlertCircle, Megaphone, HandCoins, ArrowDownLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LoanApplicationForm from "@/components/LoanApplicationForm";
import ShareSubscriptionForm from "@/components/ShareSubscriptionForm";
import { SpecialContributionApplicationModal } from "@/components/SpecialContributionApplicationModal";
import GuarantorApprovalModal from "@/components/GuarantorApprovalModal";
import MakeDepositModal from "@/components/MakeDepositModal";
const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalSavings: 0,
    totalLoans: 0,
    totalInvestments: 0,
    totalShares: 0,
    activeLoanCount: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLoanDialog, setShowLoanDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showContributionDialog, setShowContributionDialog] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [guarantorRequests, setGuarantorRequests] = useState<any[]>([]);
  const [selectedGuarantorRequest, setSelectedGuarantorRequest] = useState<any>(null);
  const [showGuarantorModal, setShowGuarantorModal] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [latestAnnouncements, setLatestAnnouncements] = useState<any[]>([]);
  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
    fetchGuarantorRequests();
    fetchLatestAnnouncements();

    // Subscribe to realtime notifications and guarantor requests
    const setupRealtimeSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`
          },
          () => {
            // Refetch notifications when any change occurs
            fetchNotifications();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'loan_guarantor_approvals',
            filter: `guarantor_user_id=eq.${session.user.id}`
          },
          () => {
            // Refetch guarantor requests when any change occurs
            fetchGuarantorRequests();
          }
        )
        .subscribe();

      return channel;
    };

    let channel: any;
    setupRealtimeSubscription().then(ch => {
      channel = ch;
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
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
      const activeLoanCount = loans?.length || 0;

      // Fetch special contributions
      const {
        data: contributions
      } = await supabase.from("special_contributions").select("total_contributed").eq("user_id", userId).in("application_status", ["active", "approved"]);
      const totalInvestments = contributions?.reduce((sum, inv) => sum + Number(inv.total_contributed), 0) || 0;

      // Fetch shares
      const {
        data: shares
      } = await supabase.from("shares").select("current_value").eq("user_id", userId).maybeSingle();
      const totalShares = shares?.current_value || 0;

      const totalBalance = totalSavings + totalInvestments - totalLoans;
      setStats({
        totalBalance,
        totalSavings,
        totalLoans,
        totalInvestments,
        totalShares,
        activeLoanCount
      });

      // Fetch recent transactions
      const {
        data: transactions
      } = await supabase.from("transactions").select("*").eq("user_id", userId).order("created_at", {
        ascending: false
      }).limit(5);
      setRecentActivities(transactions || []);

      // Build chart showing actual balances per month
      // Use current balances and work backwards from transactions to estimate monthly snapshots
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth(); // 0-11
      
      // Create data for all 12 months
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(currentYear, i, 1);
        return {
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          savings: 0,
          loans: 0,
          contributions: 0,
        };
      });

      // Set current month values to actual balances
      const currentSavingsBalance = totalSavings;
      const currentLoansBalance = totalLoans;
      const currentContributionsBalance = totalInvestments;

      // Fetch all transactions this year to compute monthly deltas
      const yearStart = new Date(currentYear, 0, 1);
      const { data: allTransactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", yearStart.toISOString());

      // Calculate net change per month for each category
      const monthlyDeltas = Array.from({ length: 12 }, () => ({
        savings: 0, loans: 0, contributions: 0,
      }));

      allTransactions?.forEach(transaction => {
        const transactionDate = new Date(transaction.created_at);
        const monthIndex = transactionDate.getMonth();
        const amount = Number(transaction.amount);
        const description = transaction.description?.toLowerCase() || '';

        if (transaction.type === 'deposit') {
          if (description.includes('contribution') || description.includes('special')) {
            monthlyDeltas[monthIndex].contributions += amount;
          } else {
            monthlyDeltas[monthIndex].savings += amount;
          }
        } else if (transaction.type === 'withdrawal') {
          monthlyDeltas[monthIndex].savings -= amount;
        } else if (transaction.type === 'repayment') {
          monthlyDeltas[monthIndex].loans -= amount;
        } else if (transaction.type === 'loan_disbursement') {
          monthlyDeltas[monthIndex].loans += amount;
        }
      });

      // Work backwards from current balance to reconstruct each month's ending balance
      // Start at current month with actual balance, subtract future deltas going back
      let savBal = currentSavingsBalance;
      let loanBal = currentLoansBalance;
      let contBal = currentContributionsBalance;

      for (let i = currentMonth; i >= 0; i--) {
        monthlyData[i].savings = Math.max(0, savBal);
        monthlyData[i].loans = Math.max(0, loanBal);
        monthlyData[i].contributions = Math.max(0, contBal);
        // Subtract this month's delta to get the balance at end of previous month
        savBal -= monthlyDeltas[i].savings;
        loanBal -= monthlyDeltas[i].loans;
        contBal -= monthlyDeltas[i].contributions;
      }

      // Future months stay at 0 (no data yet)
      setChartData(monthlyData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read_status).length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchGuarantorRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("loan_guarantor_approvals")
        .select("*")
        .eq("guarantor_user_id", session.user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setGuarantorRequests(data || []);
    } catch (error) {
      console.error("Error fetching guarantor requests:", error);
    }
  };

  const handleGuarantorRequestClick = (request: any) => {
    setSelectedGuarantorRequest(request);
    setShowGuarantorModal(true);
  };

  const fetchLatestAnnouncements = async () => {
    try {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, published_at, category, priority")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3);
      setLatestAnnouncements(data || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  };

  const handleGuarantorSuccess = () => {
    fetchGuarantorRequests();
    fetchNotifications();
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read_status: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read_status: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to update notification");
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read_status: true })
        .eq("user_id", session.user.id)
        .eq("read_status", false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read_status: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to update notifications");
    }
  };
  const getActivityIcon = (type: string, description?: string) => {
    // Check description for special contribution context
    const desc = (description || '').toLowerCase();
    const isSpecialContribution = desc.includes('special contribution');
    
    switch (type) {
      case 'repayment':
        return <ArrowDownLeft className="h-5 w-5 text-destructive" />;
      case 'loan_disbursement':
        return <CreditCard className="h-5 w-5 text-primary" />;
      case 'withdrawal':
        return <Landmark className="h-5 w-5 text-destructive" />;
      case 'deposit':
        if (isSpecialContribution) {
          return <HandCoins className="h-5 w-5 text-secondary" />;
        }
        return <PiggyBank className="h-5 w-5 text-secondary" />;
      default:
        return <Coins className="h-5 w-5 text-muted-foreground" />;
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
                Welcome, {userProfile?.full_name || 'User'}!
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                        Mark all read
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-[400px]">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No notifications yet
                      </div>
                    ) : (
                      <div className="divide-y">
                        {notifications.map((notification) => (
                           <div
                            key={notification.id}
                            className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                              !notification.read_status ? "bg-muted/30" : ""
                            }`}
                            onClick={() => {
                              // Handle password reset request notifications - navigate without marking as read
                              // (read_status is used to track completion on the reset requests page)
                              if (notification.type === "password_reset_request") {
                                navigate("/dashboard/admin/password-reset-requests");
                                return;
                              }
                              markAsRead(notification.id);
                              // Navigate based on notification type
                              if (notification.type === "deposit_approved" || notification.type === "deposit_rejected") {
                                navigate("/dashboard/savings");
                                return;
                              }
                              if (notification.type === "loan_disbursed" || notification.type === "loan_approved" || notification.type === "loan_rejected" || notification.type === "loan_status_update" || notification.type === "loan_sent_back") {
                                navigate("/dashboard/loans");
                                return;
                              }
                              if (notification.type === "share_approved") {
                                navigate("/dashboard/shares");
                                return;
                              }
                              if (notification.type === "announcement") {
                                navigate("/dashboard/announcements");
                                return;
                              }
                              if (notification.type === "special_contribution_approved" || notification.type === "special_contribution_rejected") {
                                navigate("/dashboard/special-contributions");
                                return;
                              }
                              if (notification.type === "password_reset") {
                                // Already on dashboard, just mark read
                                return;
                              }
                              // If it's a guarantor request, find and open the modal
                              if (notification.type === "guarantor_request" || notification.type === "guarantor_approved" || notification.type === "guarantor_denied") {
                                if (notification.type === "guarantor_request") {
                                  const loanIdMatch = notification.message.match(/Loan ID: ([a-f0-9-]+)/);
                                  const loanId = loanIdMatch ? loanIdMatch[1] : null;
                                  
                                  const request = guarantorRequests.find(r => 
                                    r.loan_id === loanId || r.loan_application_number === loanId
                                  );
                                  
                                  if (request) {
                                    handleGuarantorRequestClick(request);
                                  } else {
                                    if (guarantorRequests.length > 0) {
                                      handleGuarantorRequestClick(guarantorRequests[0]);
                                    } else {
                                      toast.error("Could not find the guarantor request. It may have been processed already.");
                                    }
                                  }
                                } else {
                                  navigate("/dashboard/loans");
                                }
                                return;
                              }
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium capitalize">
                                  {notification.type.replace(/_/g, " ")}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(notification.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              {!notification.read_status && (
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {loading ? <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-32" />)}
              </div>
            </div> : <>
              {/* Guarantor Requests Alert */}
              {guarantorRequests.length > 0 && (
                <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
                      <AlertCircle className="h-5 w-5" />
                      Pending Guarantor Requests ({guarantorRequests.length})
                    </CardTitle>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      You have loan guarantor requests that need your response
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {guarantorRequests.map((request) => (
                      <div
                        key={request.id}
                        className="p-4 bg-white dark:bg-yellow-950/40 rounded-lg border border-yellow-200 dark:border-yellow-800 hover:border-yellow-300 dark:hover:border-yellow-700 transition-colors cursor-pointer"
                        onClick={() => handleGuarantorRequestClick(request)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                              {request.applicant_name} ({request.applicant_member_id})
                            </p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                              {request.loan_type.charAt(0).toUpperCase() + request.loan_type.slice(1)} Loan - ₦{request.loan_amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                              Position: Guarantor {request.guarantor_position}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGuarantorRequestClick(request);
                            }}
                          >
                            Respond
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Stats Cards - Full Width */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <Card 
                  className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate('/dashboard/savings')}
                >
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">Total Savings</p>
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                      ₦{stats.totalSavings.toLocaleString('en-NG')}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">Total savings balance</p>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate('/dashboard/loans')}
                >
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">Active Loans</p>
                      <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-3xl font-bold text-red-700 dark:text-red-300">
                      ₦{stats.totalLoans.toLocaleString('en-NG')}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                      {stats.activeLoanCount} active loan{stats.activeLoanCount !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate('/dashboard/special-contributions')}
                >
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

                <Card 
                  style={{ backgroundColor: '#fff7ed' }} 
                  className="border-orange-200 dark:border-orange-900 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate('/dashboard/shares')}
                >
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium" style={{ color: '#fa7516' }}>Total Shares</p>
                      <Landmark className="h-5 w-5" style={{ color: '#fa7516' }} />
                    </div>
                    <p className="text-3xl font-bold" style={{ color: '#fa7516' }}>
                      ₦{stats.totalShares.toLocaleString('en-NG')}
                    </p>
                    <p className="text-xs mt-2" style={{ color: '#fa7516' }}>Share ownership value</p>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Overview and Quick Actions */}
              <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
                {/* Financial Overview Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Financial Overview</CardTitle>
                    <p className="text-sm text-muted-foreground">Your financial performance for {new Date().getFullYear()}</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData} margin={{
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
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={value => value >= 1000000 ? `₦${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `₦${(value / 1000).toFixed(0)}k` : `₦${value}`} width={70} />
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
                    <Button variant="outline" className="w-full justify-start h-auto py-3 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 hover:bg-green-100 dark:hover:bg-green-950/30 text-left" onClick={() => setShowDepositDialog(true)}>
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
                    <Button variant="outline" className="w-full justify-start h-auto py-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-950/30 text-left" onClick={() => setShowLoanDialog(true)}>
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
                    <Button variant="outline" className="w-full justify-start h-auto py-3 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900 hover:bg-purple-100 dark:hover:bg-purple-950/30 text-left" onClick={() => setShowContributionDialog(true)}>
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
                    <Button variant="outline" className="w-full justify-start h-auto py-3 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900 hover:bg-orange-100 dark:hover:bg-orange-950/30 text-left" onClick={() => setShowShareDialog(true)}>
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                          <Landmark className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Buy Shares</p>
                          <p className="text-xs text-orange-600 dark:text-orange-400">Invest in the cooperative</p>
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
                            {getActivityIcon(activity.type, activity.description)}
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
                        <p className={`font-semibold text-lg ${activity.type === 'deposit' ? 'text-secondary' : 'text-destructive'}`}>
                          {activity.type === 'deposit' ? '+' : '-'}₦{Number(activity.amount).toLocaleString('en-NG')}
                        </p>
                      </div>)}
                  {recentActivities.length > 0 && <Button variant="outline" className="w-full mt-4">
                      Load More Transactions
                    </Button>}
                </CardContent>
              </Card>

              {/* Latest Announcements */}
              {latestAnnouncements.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-primary" />
                        Latest Announcements
                      </CardTitle>
                      <Button variant="link" onClick={() => navigate("/dashboard/announcements")}>View All</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {latestAnnouncements.map((ann) => (
                      <div
                        key={ann.id}
                        className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate("/dashboard/announcements")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{ann.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(ann.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                          {ann.priority === "urgent" && (
                            <Badge className="bg-red-600 text-white text-[10px]">Urgent</Badge>
                          )}
                          {ann.priority === "important" && (
                            <Badge className="bg-yellow-100 text-yellow-800 text-[10px]">Important</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>}
      </div>

      <Dialog open={showLoanDialog} onOpenChange={setShowLoanDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Apply for Loan</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)] px-6 pb-6">
            <LoanApplicationForm 
              onSuccess={() => {
                setShowLoanDialog(false);
                fetchDashboardData();
                toast.success("Loan application submitted successfully!");
              }}
              onCancel={() => setShowLoanDialog(false)}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Apply for Shares</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)] px-6 pb-6">
            <ShareSubscriptionForm 
              onSuccess={() => {
                setShowShareDialog(false);
                fetchDashboardData();
                toast.success("Share subscription application submitted successfully!");
              }}
              onCancel={() => setShowShareDialog(false)}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <SpecialContributionApplicationModal
        open={showContributionDialog}
        onOpenChange={setShowContributionDialog}
        onSuccess={fetchDashboardData}
      />

      <MakeDepositModal
        open={showDepositDialog}
        onOpenChange={setShowDepositDialog}
        onSuccess={fetchDashboardData}
      />

      {selectedGuarantorRequest && (
        <GuarantorApprovalModal
          request={selectedGuarantorRequest}
          open={showGuarantorModal}
          onClose={() => {
            setShowGuarantorModal(false);
            setSelectedGuarantorRequest(null);
          }}
          onSuccess={handleGuarantorSuccess}
        />
      )}
    </DashboardLayout>;
};
export default Dashboard;