import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowDownCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  reference_number: string | null;
  created_at: string;
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownCircle className="h-5 w-5 text-secondary" />;
      case "withdrawal":
        return <ArrowUpCircle className="h-5 w-5 text-destructive" />;
      case "loan_disbursement":
        return <ArrowDownCircle className="h-5 w-5 text-primary" />;
      case "repayment":
        return <ArrowUpCircle className="h-5 w-5 text-accent" />;
      default:
        return <RefreshCw className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "deposit":
      case "loan_disbursement":
        return "text-secondary";
      case "withdrawal":
        return "text-destructive";
      case "repayment":
        return "text-accent";
      default:
        return "text-foreground";
    }
  };

  const formatTransactionType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const isIncoming = (type: string) => {
    return type === 'deposit' || type === 'loan_disbursement';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Transactions</h1>
          <p className="text-muted-foreground">View your complete transaction history</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-muted rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-32 mb-2" />
                      <div className="h-3 bg-muted rounded w-48" />
                    </div>
                    <div className="h-6 bg-muted rounded w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No transactions yet</p>
              <p className="text-sm text-muted-foreground">
                Your transaction history will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <Card key={transaction.id} className="shadow-card hover:shadow-elevated transition-smooth">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-full">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold truncate">
                          {formatTransactionType(transaction.type)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {transaction.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {transaction.description || "No description"}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleString()}
                        </p>
                        {transaction.reference_number && (
                          <p className="text-xs text-muted-foreground">
                            Ref: {transaction.reference_number}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${getTransactionColor(transaction.type)}`}>
                        {isIncoming(transaction.type) ? '+' : '-'}
                        ₦{Math.abs(Number(transaction.amount)).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Transaction Summary */}
        {transactions.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Deposits</p>
                  <p className="text-lg font-semibold text-secondary">
                    ₦{transactions
                      .filter((t) => t.type === "deposit")
                      .reduce((sum, t) => sum + Number(t.amount), 0)
                      .toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Withdrawals</p>
                  <p className="text-lg font-semibold text-destructive">
                    ₦{transactions
                      .filter((t) => t.type === "withdrawal")
                      .reduce((sum, t) => sum + Number(t.amount), 0)
                      .toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Loan Disbursements</p>
                  <p className="text-lg font-semibold text-primary">
                    ₦{transactions
                      .filter((t) => t.type === "loan_disbursement")
                      .reduce((sum, t) => sum + Number(t.amount), 0)
                      .toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Loan Repayments</p>
                  <p className="text-lg font-semibold text-accent">
                    ₦{transactions
                      .filter((t) => t.type === "repayment")
                      .reduce((sum, t) => sum + Number(t.amount), 0)
                      .toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
