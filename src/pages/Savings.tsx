import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PiggyBank, Plus, Target } from "lucide-react";
import { toast } from "sonner";

interface SavingsAccount {
  id: string;
  balance: number;
  status: string;
  created_at: string;
}

interface SpecialContribution {
  id: string;
  contribution_year: number;
  monthly_amount: number;
  total_contributed: number;
  total_expected: number;
  maturity_date: string | null;
  application_status: string;
}

const Savings = () => {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [contributions, setContributions] = useState<SpecialContribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavingsData();
  }, []);

  const fetchSavingsData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // Fetch savings accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", userId)
        .eq("account_type", "savings");

      if (accountsError) throw accountsError;

      // Fetch special contributions
      const { data: contributionsData, error: contributionsError } = await supabase
        .from("special_contributions")
        .select("*")
        .eq("user_id", userId)
        .in("application_status", ["active", "approved"]);

      if (contributionsError) throw contributionsError;

      setAccounts(accountsData || []);
      setContributions(contributionsData || []);
    } catch (error) {
      console.error("Error fetching savings data:", error);
      toast.error("Failed to load savings data");
    } finally {
      setLoading(false);
    }
  };

  const totalSavings = accounts.reduce((sum, account) => sum + Number(account.balance), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Savings</h1>
            <p className="text-muted-foreground">Manage your savings accounts and goals</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Goal
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
            {/* Total Savings Overview */}
            <Card className="shadow-card gradient-success">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-1">Total Savings</p>
                    <p className="text-4xl font-bold text-white">₦{totalSavings.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="p-4 bg-white/20 rounded-full">
                    <PiggyBank className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Savings Accounts */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">Your Accounts</h2>
              {accounts.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="py-12 text-center">
                    <PiggyBank className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No savings accounts yet</p>
                    <Button variant="outline" className="mt-4">Create Account</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {accounts.map((account) => (
                    <Card key={account.id} className="shadow-card">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>Savings Account</span>
                          <span className={`text-sm px-2 py-1 rounded ${
                            account.status === 'active' ? 'bg-secondary/10 text-secondary' : 'bg-muted'
                          }`}>
                            {account.status}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold mb-2">₦{Number(account.balance).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(account.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Special Contributions */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">Special Contributions</h2>
              {contributions.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="py-12 text-center">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No special contributions yet</p>
                    <Button variant="outline" className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Contribution
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {contributions.map((contribution) => {
                    const progress = (Number(contribution.total_contributed) / Number(contribution.total_expected)) * 100;
                    return (
                      <Card key={contribution.id} className="shadow-card">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-accent" />
                            Contribution {contribution.contribution_year}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{progress.toFixed(0)}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                          <div className="flex justify-between text-sm">
                            <div>
                              <p className="text-muted-foreground">Contributed</p>
                              <p className="font-semibold">₦{Number(contribution.total_contributed).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-muted-foreground">Expected</p>
                              <p className="font-semibold">₦{Number(contribution.total_expected).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                          {contribution.maturity_date && (
                            <p className="text-xs text-muted-foreground">
                              Maturity date: {new Date(contribution.maturity_date).toLocaleDateString()}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Savings;
