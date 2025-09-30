import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Calendar, DollarSign } from "lucide-react";
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

interface LoanApplication {
  id: string;
  loan_type: string;
  requested_amount: number;
  purpose: string;
  status: string;
  application_date: string;
}

const Loans = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
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
        .eq("user_id", userId);

      if (loansError) throw loansError;

      // Fetch loan applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from("loan_applications")
        .select("*")
        .eq("user_id", userId)
        .order("application_date", { ascending: false });

      if (applicationsError) throw applicationsError;

      setLoans(loansData || []);
      setApplications(applicationsData || []);
    } catch (error) {
      console.error("Error fetching loans data:", error);
      toast.error("Failed to load loans data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "approved":
        return "bg-secondary/10 text-secondary border-secondary/20";
      case "pending":
        return "bg-accent/10 text-accent border-accent/20";
      case "rejected":
      case "closed":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const formatLoanType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Loans</h1>
            <p className="text-muted-foreground">Manage your loans and applications</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Apply for Loan
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-48" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Active Loans */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">Active Loans</h2>
              {loans.filter(loan => loan.status === 'active').length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="py-12 text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">No active loans</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Apply for a loan to get started
                    </p>
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Apply for Loan
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {loans
                    .filter(loan => loan.status === 'active')
                    .map((loan) => (
                      <Card key={loan.id} className="shadow-card">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <CreditCard className="h-5 w-5 text-primary" />
                              {formatLoanType(loan.loan_type)} Loan
                            </CardTitle>
                            <Badge className={getStatusColor(loan.status)}>
                              {loan.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Principal Amount</p>
                              <p className="text-lg font-semibold">
                                ${Number(loan.principal_amount).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Outstanding Balance</p>
                              <p className="text-lg font-semibold text-primary">
                                ${Number(loan.outstanding_balance).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Interest Rate</p>
                              <p className="text-lg font-semibold">{Number(loan.interest_rate)}%</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Repayment Period</p>
                              <p className="text-lg font-semibold">{loan.repayment_period} months</p>
                            </div>
                          </div>
                          {loan.monthly_payment && (
                            <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Monthly Payment</span>
                              </div>
                              <span className="text-lg font-bold">
                                ${Number(loan.monthly_payment).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {loan.next_payment_date && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Next payment due: {new Date(loan.next_payment_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>

            {/* Loan Applications */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">Recent Applications</h2>
              {applications.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No loan applications yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {applications.slice(0, 5).map((app) => (
                    <Card key={app.id} className="shadow-card">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {formatLoanType(app.loan_type)} Loan Application
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Applied on {new Date(app.application_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={getStatusColor(app.status)}>
                            {app.status}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Requested Amount:</span>
                            <span className="font-semibold">
                              ${Number(app.requested_amount).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Purpose:</p>
                            <p className="text-sm">{app.purpose}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Loan Types Info */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Available Loan Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border border-border rounded-lg">
                    <h4 className="font-semibold mb-2">Normal Loan</h4>
                    <p className="text-sm text-muted-foreground">
                      Standard personal loans for general purposes
                    </p>
                  </div>
                  <div className="p-4 border border-border rounded-lg">
                    <h4 className="font-semibold mb-2">Trade Loan</h4>
                    <p className="text-sm text-muted-foreground">
                      Business loans for trade and commerce activities
                    </p>
                  </div>
                  <div className="p-4 border border-border rounded-lg">
                    <h4 className="font-semibold mb-2">Special Loan</h4>
                    <p className="text-sm text-muted-foreground">
                      Emergency or special circumstance loans
                    </p>
                  </div>
                  <div className="p-4 border border-border rounded-lg">
                    <h4 className="font-semibold mb-2">Long Term Loan</h4>
                    <p className="text-sm text-muted-foreground">
                      Extended repayment period loans for large investments
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Loans;
