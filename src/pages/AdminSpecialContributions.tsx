import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { AdminRoute } from "@/components/AdminRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";

export default function AdminSpecialContributions() {
  const [contributions, setContributions] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, active: 0, maturing: 0, completed: 0 });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [selectedContribution, setSelectedContribution] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContributions();
    loadStats();
  }, [statusFilter, yearFilter]);

  const loadStats = async () => {
    const { data } = await supabase
      .from("special_contributions")
      .select("application_status, maturity_date");

    if (data) {
      const now = new Date();
      const currentMonth = now.getMonth();
      
      setStats({
        pending: data.filter(c => c.application_status === "pending").length,
        active: data.filter(c => c.application_status === "active").length,
        maturing: data.filter(c => {
          const maturityDate = new Date(c.maturity_date);
          return maturityDate.getMonth() === currentMonth && c.application_status === "active";
        }).length,
        completed: data.filter(c => c.application_status === "completed").length
      });
    }
  };

  const loadContributions = async () => {
    let query = supabase
      .from("special_contributions")
      .select(`
        *,
        profiles!special_contributions_user_id_fkey(full_name, email, staff_id)
      `)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("application_status", statusFilter as any);
    }

    if (yearFilter !== "all") {
      query = query.eq("contribution_year", parseInt(yearFilter));
    }

    const { data } = await query;
    setContributions(data || []);
  };

  const handleApprove = async (contribution: any) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("special_contributions")
        .update({
          application_status: "approved",
          approved_by: user.id,
          approved_date: new Date().toISOString()
        })
        .eq("id", contribution.id);

      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: contribution.user_id,
        type: "contribution_approved",
        message: `Your special contribution application for ${contribution.contribution_year} has been approved.`
      });

      toast({ title: "Application Approved" });
      loadContributions();
      loadStats();
      setSelectedContribution(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (contribution: any) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("special_contributions")
        .update({ application_status: "rejected" })
        .eq("id", contribution.id);

      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: contribution.user_id,
        type: "contribution_rejected",
        message: `Your special contribution application for ${contribution.contribution_year} has been rejected.`
      });

      toast({ title: "Application Rejected" });
      loadContributions();
      loadStats();
      setSelectedContribution(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <AdminRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Special Contributions Management</h1>
            <p className="text-muted-foreground">Manage member special contributions</p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.pending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.active}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Maturing This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.maturing}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.completed}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Applications</CardTitle>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {years.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Monthly Amount</TableHead>
                    <TableHead>Total Expected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributions.map((contribution) => (
                    <TableRow key={contribution.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{contribution.profiles?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{contribution.profiles?.staff_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{contribution.contribution_year}</TableCell>
                      <TableCell>₦{parseFloat(contribution.monthly_amount).toLocaleString()}</TableCell>
                      <TableCell>₦{parseFloat(contribution.total_expected).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(contribution.application_status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedContribution(contribution)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!selectedContribution} onOpenChange={() => setSelectedContribution(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Contribution Details</DialogTitle>
            </DialogHeader>
            {selectedContribution && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Member</p>
                    <p className="font-medium">{selectedContribution.profiles?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Member Number</p>
                    <p className="font-medium">{selectedContribution.profiles?.staff_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Year</p>
                    <p className="font-medium">{selectedContribution.contribution_year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Amount</p>
                    <p className="font-medium">₦{parseFloat(selectedContribution.monthly_amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expected</p>
                    <p className="font-medium">₦{parseFloat(selectedContribution.total_expected).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bank</p>
                    <p className="font-medium">{selectedContribution.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Number</p>
                    <p className="font-medium">{selectedContribution.account_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Name</p>
                    <p className="font-medium">{selectedContribution.account_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{selectedContribution.department || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">State of Assignment</p>
                    <p className="font-medium">{selectedContribution.state_of_assignment || "N/A"}</p>
                  </div>
                </div>

                {selectedContribution.application_status === "pending" && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleApprove(selectedContribution)}
                      disabled={loading}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => handleReject(selectedContribution)}
                      disabled={loading}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </AdminRoute>
  );
}