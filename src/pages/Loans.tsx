import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Info, CheckCircle, Receipt, ArrowDownLeft, Plus } from "lucide-react";
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

  // Calculate summary statistics
  const totalOutstanding = loans.reduce((sum, loan) => sum + Number(loan.outstanding_balance), 0);
  const totalMonthlyPayment = loans.reduce((sum, loan) => sum + Number(loan.monthly_payment || 0), 0);
  const totalPaid = loans.reduce((sum, loan) => 
    sum + (Number(loan.principal_amount) - Number(loan.outstanding_balance)), 0
  );
  const nextPaymentDate = loans.reduce((earliest, loan) => {
    if (!loan.next_payment_date) return earliest;
    if (!earliest) return loan.next_payment_date;
    return new Date(loan.next_payment_date) < new Date(earliest) ? loan.next_payment_date : earliest;
  }, null as string | null);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-24" />
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">Loans</h1>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Apply for Loan
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Total Outstanding</p>
                      <p className="text-3xl font-bold text-destructive">
                        ₦{totalOutstanding.toLocaleString('en-NG')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Amount still owed</p>
                    </div>
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Monthly Payment</p>
                      <p className="text-3xl font-bold" style={{ color: 'hsl(25, 95%, 53%)' }}>
                        ₦{totalMonthlyPayment.toLocaleString('en-NG')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Due monthly</p>
                    </div>
                    <Info className="h-5 w-5" style={{ color: 'hsl(25, 95%, 53%)' }} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Next Payment</p>
                      <p className="text-3xl font-bold" style={{ color: 'hsl(45, 93%, 47%)' }}>
                        {nextPaymentDate ? new Date(nextPaymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Payment due date</p>
                    </div>
                    <Info className="h-5 w-5" style={{ color: 'hsl(45, 93%, 47%)' }} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Total Paid</p>
                      <p className="text-3xl font-bold" style={{ color: 'hsl(142, 71%, 45%)' }}>
                        ₦{totalPaid.toLocaleString('en-NG')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Amount paid so far</p>
                    </div>
                    <CheckCircle className="h-5 w-5" style={{ color: 'hsl(142, 71%, 45%)' }} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Loans */}
            <Card>
              <CardHeader>
                <CardTitle>Active Loans</CardTitle>
                <CardDescription>Your current loan portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                {loans.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No active loans</p>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Apply for Loan
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {loans.map((loan) => (
                      <div key={loan.id} className="pb-6 border-b last:border-0 last:pb-0">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold mb-1">{formatLoanType(loan.loan_type)}</h3>
                            <p className="text-sm text-muted-foreground">
                              Description of the loan type and terms
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Amount</p>
                            <p className="text-xl font-bold">₦{Number(loan.principal_amount).toLocaleString('en-NG')}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-muted-foreground">Outstanding: </span>
                            <span className="font-semibold text-destructive">₦{Number(loan.outstanding_balance).toLocaleString('en-NG')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Monthly Payment: </span>
                            <span className="font-semibold">₦{Number(loan.monthly_payment || 0).toLocaleString('en-NG')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Next Payment: </span>
                            <span className="font-semibold">
                              {loan.next_payment_date ? new Date(loan.next_payment_date).toLocaleDateString('en-GB') : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Loan Activity */}
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold">Recent Loan Activity</h2>
                <p className="text-sm text-muted-foreground">Your recent loan transactions</p>
              </div>
              {transactions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No recent loan activity</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <Card key={transaction.id}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              transaction.type === 'loan_disbursement' 
                                ? 'bg-blue-100 dark:bg-blue-950' 
                                : 'bg-green-100 dark:bg-green-950'
                            }`}>
                              {transaction.type === 'loan_disbursement' ? (
                                <ArrowDownLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <Receipt className="h-4 w-4 text-green-600 dark:text-green-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {transaction.description || 
                                  (transaction.type === 'loan_disbursement' ? 'Loan Disbursement' : 'Monthly Payment')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.created_at).toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                          <p className={`text-lg font-semibold ${
                            transaction.type === 'loan_disbursement' 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : 'text-green-600 dark:text-green-400'
                          }`}>
                            {transaction.type === 'loan_disbursement' ? '+' : ''}₦{Number(transaction.amount).toLocaleString('en-NG')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Loans;
