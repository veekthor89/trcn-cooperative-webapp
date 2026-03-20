import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Calendar, DollarSign, TrendingUp, CalendarDays, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import LoanApplicationForm from "@/components/LoanApplicationForm";

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
  created_at: string;
}

interface LoanApplication {
  id: string;
  loan_type: string;
  requested_amount: number;
  status: string;
  application_date: string;
  approval_date: string | null;
  repayment_period: number;
  monthly_payment: number | null;
  notes: string | null;
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
  const [loanApplications, setLoanApplications] = useState<LoanApplication[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoanDialog, setShowLoanDialog] = useState(false);

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

      // Fetch loan applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from("loan_applications")
        .select("*")
        .eq("user_id", userId)
        .order("application_date", { ascending: false });

      if (applicationsError) throw applicationsError;

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
      setLoanApplications(applicationsData || []);
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

  const calculatePaymentsMade = (loan: Loan) => {
    if (!loan.monthly_payment || loan.monthly_payment === 0) return 0;
    const paid = loan.principal_amount - loan.outstanding_balance;
    return Math.round(paid / loan.monthly_payment);
  };

  // Calculate summary statistics
  const totalOutstanding = loans.reduce((sum, loan) => sum + Number(loan.outstanding_balance), 0);
  const totalMonthlyPayment = loans.reduce((sum, loan) => sum + Number(loan.monthly_payment || 0), 0);
  const totalPaid = loans.reduce((sum, loan) => 
    sum + (Number(loan.principal_amount) - Number(loan.outstanding_balance)), 0
  );
  
  // Calculate start date (earliest loan creation date + 1 month)
  const startDate = loans.length > 0 
    ? (() => {
        const earliestLoan = new Date(Math.min(...loans.map(l => new Date(l.created_at).getTime())));
        earliestLoan.setMonth(earliestLoan.getMonth() + 1);
        return earliestLoan.toLocaleDateString();
      })()
    : "N/A";
  
  // Calculate end date (latest completion date among all loans)
  const endDate = loans.length > 0 
    ? (() => {
        const latestEnd = Math.max(...loans.map(l => {
          const loanStart = new Date(l.created_at);
          loanStart.setMonth(loanStart.getMonth() + 1); // Start is 1 month after creation
          loanStart.setMonth(loanStart.getMonth() + l.repayment_period); // Add repayment period
          return loanStart.getTime();
        }));
        return new Date(latestEnd).toLocaleDateString();
      })()
    : "N/A";

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
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
            onClick={() => setShowLoanDialog(true)}
            disabled={loans.length >= 3}
          >
            <Plus className="h-4 w-4 mr-2" />
            Apply for Loan
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-[#F2E4E7] border-[#F2E4E7]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#B21F1F]">Total Outstanding</CardTitle>
              <DollarSign className="h-4 w-4 text-[#B21F1F]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#B21F1F]">₦{totalOutstanding.toLocaleString()}</div>
              <p className="text-xs text-[#B21F1F]/70">Across {loans.length} loan{loans.length !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>

          <Card className="bg-[#F6E9E4] border-[#F6E9E4]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#D94F00]">Monthly Payment</CardTitle>
              <Calendar className="h-4 w-4 text-[#D94F00]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#D94F00]">₦{totalMonthlyPayment.toLocaleString()}</div>
              <p className="text-xs text-[#D94F00]/70">Total monthly deduction</p>
            </CardContent>
          </Card>

          <Card className="bg-[#E0ECFD] border-[#E0ECFD]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#1E40AF]">Start Date</CardTitle>
              <CalendarDays className="h-4 w-4 text-[#1E40AF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#1E40AF]">{startDate}</div>
              <p className="text-xs text-[#1E40AF]/70">Loan start date</p>
            </CardContent>
          </Card>

          <Card className="bg-[#E9E5E5] border-[#E9E5E5]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#562B08]">End Date</CardTitle>
              <CalendarCheck className="h-4 w-4 text-[#562B08]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#562B08]">{endDate}</div>
              <p className="text-xs text-[#562B08]/70">Expected completion</p>
            </CardContent>
          </Card>

          <Card className="bg-[#E1EFE8] border-[#E1EFE8]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#0B8C28]">Total Paid</CardTitle>
              <TrendingUp className="h-4 w-4 text-[#0B8C28]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0B8C28]">₦{totalPaid.toLocaleString()}</div>
              <p className="text-xs text-[#0B8C28]/70">To date</p>
            </CardContent>
          </Card>
        </div>

        {/* Loan Applications */}
        {loanApplications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Loan Applications</CardTitle>
              <CardDescription>Track your loan application status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loanApplications.map((application) => {
                  const statusColor = 
                    application.status === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                    application.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
                  
                  return (
                    <div key={application.id} className="flex justify-between items-start p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{formatLoanType(application.loan_type)}</h3>
                          <Badge className={statusColor}>
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Amount: ₦{Number(application.requested_amount).toLocaleString()} • 
                          Period: {application.repayment_period} months
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Applied: {new Date(application.application_date).toLocaleDateString()}
                        </p>
                        {application.notes && (
                          <p className="text-sm text-muted-foreground italic mt-2">
                            Note: {application.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        {application.approval_date && (
                          <p className="text-muted-foreground">
                            {application.status === "approved" ? "Approved" : "Decided"}: {new Date(application.approval_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

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
                <Button onClick={() => setShowLoanDialog(true)}>
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

      {/* Loan Application Modal */}
      <Dialog open={showLoanDialog} onOpenChange={setShowLoanDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl">Loan Application</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-5rem)] px-6 pb-6">
            <LoanApplicationForm
              onSuccess={() => {
                setShowLoanDialog(false);
                fetchLoansData();
                toast.success("Loan application submitted successfully!");
              }}
              onCancel={() => setShowLoanDialog(false)}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Loans;
