import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar, DollarSign, TrendingUp, Clock } from "lucide-react";
import { toast } from "sonner";

interface Loan {
  id: string;
  loan_type: string;
  principal_amount: number;
  interest_rate: number;
  outstanding_balance: number;
  status: string;
  next_payment_date: string | null;
  monthly_payment: number | null;
  repayment_period: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

const Loans = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoansData();
  }, []);

  const fetchLoansData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // Fetch loans
      const { data: loansData, error: loansError } = await supabase
        .from("loans")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active");

      if (loansError) throw loansError;

      // Fetch loan-related transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .or("type.eq.repayment,type.eq.loan_disbursement")
        .order("created_at", { ascending: false })
        .limit(10);

      if (transactionsError) throw transactionsError;

      setLoans(loansData || []);
      setTransactions(transactionsData || []);
    } catch (error) {
      console.error("Error fetching loans data:", error);
      toast.error("Failed to load loans data");
    } finally {
      setLoading(false);
    }
  };

  const formatLoanType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const calculateProgress = (loan: Loan) => {
    const paid = loan.principal_amount - loan.outstanding_balance;
    return (paid / loan.principal_amount) * 100;
  };

  const calculateMonthsRemaining = (loan: Loan) => {
    if (!loan.outstanding_balance || !loan.monthly_payment) return 0;
    return Math.ceil(loan.outstanding_balance / loan.monthly_payment);
  };

  // Calculate summary statistics
  const totalOutstanding = loans.reduce((sum, loan) => sum + Number(loan.outstanding_balance), 0);
  const totalMonthlyPayment = loans.reduce((sum, loan) => sum + Number(loan.monthly_payment || 0), 0);
  const totalPaid = loans.reduce((sum, loan) => 
    sum + (Number(loan.principal_amount) - Number(loan.outstanding_balance)), 0
  );
  const nextPaymentDate = loans.length > 0 
    ? new Date(Math.min(...loans.filter(l => l.next_payment_date).map(l => new Date(l.next_payment_date!).getTime()))).toLocaleDateString()
    : "N/A";

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Loans</h1>
            <p className="text-muted-foreground">
              {loans.length} active loan{loans.length !== 1 ? "s" : ""} • Maximum 3 allowed
            </p>
          </div>
          <Button 
            onClick={() => navigate("/dashboard/loan-application")}
            disabled={loans.length >= 3}
          >
            <Plus className="h-4 w-4 mr-2" />
            Apply for Loan
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{totalOutstanding.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Across {loans.length} loan{loans.length !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Monthly Payment</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{totalMonthlyPayment.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total monthly deduction</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{nextPaymentDate}</div>
              <p className="text-xs text-muted-foreground">Due date</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{totalPaid.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">To date</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Loans */}
        <Card>
          <CardHeader>
            <CardTitle>Active Loans ({loans.length}/3)</CardTitle>
            <CardDescription>Your current loan obligations</CardDescription>
          </CardHeader>
          <CardContent>
            {loans.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">You don't have any active loans</p>
                <Button onClick={() => navigate("/dashboard/loan-application")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Apply for Your First Loan
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {loans.map((loan) => {
                  const progress = calculateProgress(loan);
                  const monthsRemaining = calculateMonthsRemaining(loan);
                  
                  return (
                    <div key={loan.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{formatLoanType(loan.loan_type)}</h3>
                          <p className="text-sm text-muted-foreground">
                            Loan ID: {loan.id.slice(0, 8)}
                          </p>
                        </div>
                        <Badge variant="secondary">{loan.status}</Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Principal</p>
                          <p className="text-lg font-semibold">₦{Number(loan.principal_amount).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Outstanding</p>
                          <p className="text-lg font-semibold">₦{Number(loan.outstanding_balance).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Monthly Payment</p>
                          <p className="text-lg font-semibold">₦{Number(loan.monthly_payment || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Months Left</p>
                          <p className="text-lg font-semibold">{monthsRemaining} / {loan.repayment_period}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Repayment Progress</span>
                          <span className="font-medium">{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          Next payment: {loan.next_payment_date ? new Date(loan.next_payment_date).toLocaleDateString() : 'N/A'}
                        </span>
                        <span className="font-medium">
                          ₦{(Number(loan.principal_amount) - Number(loan.outstanding_balance)).toLocaleString()} paid
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Loan Activity</CardTitle>
            <CardDescription>Your latest loan transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        transaction.type === "loan_disbursement" ? "bg-green-500" : "bg-blue-500"
                      }`} />
                      <div>
                        <p className="font-medium">
                          {transaction.type === "loan_disbursement" ? "Loan Disbursement" : "Loan Repayment"}
                        </p>
                        <p className="text-sm text-muted-foreground">{transaction.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.type === "loan_disbursement" ? "text-green-600" : "text-blue-600"
                      }`}>
                        {transaction.type === "loan_disbursement" ? "+" : "-"}₦{Number(transaction.amount).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Loans;
