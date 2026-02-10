import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { ExcoRoute } from "@/components/ExcoRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, FileText } from "lucide-react";
import { WORKFLOW_STATUS_LABELS } from "@/hooks/useLoanWorkflow";
import LoanApprovalTimeline from "@/components/LoanApprovalTimeline";

export default function ExcoViewDashboard() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("loan_applications")
        .select("*")
        .order("application_date", { ascending: false });

      if (error) throw error;

      const apps = data || [];
      const userIds = [...new Set(apps.map(a => a.user_id))];

      const { data: profiles } = await supabase.from("profiles")
        .select("id, full_name, member_number")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      setApplications(apps.map(app => ({ ...app, profile: profileMap.get(app.user_id) })));
    } catch (error) {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <ExcoRoute allowedRoles={['vice_president', 'general_secretary', 'assistant_general_secretary', 'pro']}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DashboardLayout>
      </ExcoRoute>
    );
  }

  return (
    <ExcoRoute allowedRoles={['vice_president', 'general_secretary', 'assistant_general_secretary', 'pro']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">EXCO Dashboard</h1>
            <p className="text-muted-foreground">View-only access to loan applications and reports</p>
          </div>

          {/* Status Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            {Object.entries(statusCounts).map(([status, count]) => {
              const info = WORKFLOW_STATUS_LABELS[status] || { label: status, color: '' };
              return (
                <Card key={status}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{info.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{count as number}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* All Applications */}
          <Card>
            <CardHeader><CardTitle>All Loan Applications</CardTitle></CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No applications found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Loan Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map(app => {
                        const statusInfo = WORKFLOW_STATUS_LABELS[app.status] || { label: app.status, color: '' };
                        return (
                          <TableRow key={app.id}>
                            <TableCell>
                              <div><p className="font-medium">{app.profile?.full_name}</p><p className="text-xs text-muted-foreground">{app.profile?.member_number}</p></div>
                            </TableCell>
                            <TableCell className="capitalize">{app.loan_type?.replace("_", " ")}</TableCell>
                            <TableCell>₦{app.requested_amount?.toLocaleString()}</TableCell>
                            <TableCell><Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge></TableCell>
                            <TableCell>{new Date(app.application_date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" onClick={() => { setSelectedApp(app); setShowDetailDialog(true); }}>
                                <Eye className="w-4 h-4 mr-1" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedApp && (
          <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Loan Application Details (View Only)</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Member:</span><span className="font-medium">{selectedApp.profile?.full_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Loan Type:</span><span className="capitalize font-medium">{selectedApp.loan_type?.replace("_", " ")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="font-semibold">₦{selectedApp.requested_amount?.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Period:</span><span>{selectedApp.repayment_period} months</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Monthly Payment:</span><span>₦{selectedApp.monthly_payment?.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Purpose:</span><span>{selectedApp.purpose || 'N/A'}</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Approval History</CardTitle></CardHeader>
                  <CardContent><LoanApprovalTimeline applicationId={selectedApp.id} /></CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DashboardLayout>
    </ExcoRoute>
  );
}
