import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PiggyBank, Calendar, TrendingUp, FileText } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { SpecialContributionApplicationModal } from "@/components/SpecialContributionApplicationModal";

export default function SpecialContributions() {
  const navigate = useNavigate();
  const [activeContribution, setActiveContribution] = useState<any>(null);
  const [deductions, setDeductions] = useState<any[]>([]);
  const [historicalContributions, setHistoricalContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  useEffect(() => {
    loadContributions();
  }, []);

  const loadContributions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load active contribution
    const { data: active } = await supabase
      .from("special_contributions")
      .select("*")
      .eq("user_id", user.id)
      .in("application_status", ["approved", "active"])
      .order("contribution_year", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (active) {
      setActiveContribution(active);

      // Load deductions for active contribution
      const { data: deductionsData } = await supabase
        .from("special_contribution_deductions")
        .select("*")
        .eq("contribution_id", active.id)
        .order("deduction_month");

      setDeductions(deductionsData || []);
    }

    // Load historical contributions
    const { data: historical } = await supabase
      .from("special_contributions")
      .select("*")
      .eq("user_id", user.id)
      .in("application_status", ["completed", "cancelled"])
      .order("contribution_year", { ascending: false });

    setHistoricalContributions(historical || []);
    setLoading(false);
  };

  const getMonthsCompleted = () => {
    if (!activeContribution) return 0;
    const monthlyAmount = parseFloat(activeContribution.monthly_amount);
    if (monthlyAmount <= 0) return 0;
    return Math.floor(parseFloat(activeContribution.total_contributed || 0) / monthlyAmount);
  };

  const getProgressPercentage = () => {
    if (!activeContribution) return 0;
    return Math.round((getMonthsCompleted() / 11) * 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      pending: "default",
      approved: "default",
      active: "default",
      completed: "outline",
      rejected: "destructive",
      cancelled: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status.toUpperCase()}</Badge>;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Special Contributions</h1>
            <p className="text-muted-foreground">Manage your special contribution savings</p>
          </div>
          {!activeContribution && (
            <Button onClick={() => setShowApplicationModal(true)}>
              <PiggyBank className="mr-2 h-4 w-4" />
              Apply for New
            </Button>
          )}
        </div>

        {activeContribution ? (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Active Contribution - {activeContribution.contribution_year}</CardTitle>
                  <CardDescription>
                    Monthly: ₦{parseFloat(activeContribution.monthly_amount).toLocaleString()}
                  </CardDescription>
                </div>
                {getStatusBadge(activeContribution.application_status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Contributed</p>
                  <p className="text-2xl font-bold">
                    ₦{parseFloat(activeContribution.total_contributed || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Expected</p>
                  <p className="text-2xl font-bold">
                    ₦{parseFloat(activeContribution.total_expected).toLocaleString()}
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Months Completed</p>
                  <p className="text-2xl font-bold">{deductions.length}/11</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Days Remaining</p>
                  <p className="text-2xl font-bold">{getDaysRemaining()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{getProgressPercentage()}%</span>
                </div>
                <Progress value={getProgressPercentage()} />
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Maturity: {activeContribution.maturity_date ? format(new Date(activeContribution.maturity_date), "MMMM dd, yyyy") : "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Balance: ₦{parseFloat(activeContribution.balance || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => navigate(`/dashboard/special-contribution/${activeContribution.id}`)}>
                  <FileText className="mr-2 h-4 w-4" />
                  View Details
                </Button>
                <Button variant="outline">
                  View Statement
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <PiggyBank className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Active Contribution</h3>
              <p className="text-muted-foreground mb-4">
                Start saving with a special contribution plan today!
              </p>
              <Button onClick={() => setShowApplicationModal(true)}>
                Apply for New Contribution
              </Button>
            </CardContent>
          </Card>
        )}

        {historicalContributions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Historical Contributions</CardTitle>
              <CardDescription>Your past contributions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {historicalContributions.map((contribution) => (
                  <div key={contribution.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">Year {contribution.contribution_year}</p>
                      <p className="text-sm text-muted-foreground">
                        ₦{parseFloat(contribution.monthly_amount).toLocaleString()} × 11 months
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">₦{parseFloat(contribution.total_contributed || 0).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Total Contributed</p>
                      </div>
                      {getStatusBadge(contribution.application_status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <SpecialContributionApplicationModal
        open={showApplicationModal}
        onOpenChange={setShowApplicationModal}
        onSuccess={loadContributions}
      />
    </DashboardLayout>
  );
}