import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { ExcoRoute } from "@/components/ExcoRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, CheckCircle, XCircle, Clock, ArrowLeft, FileText, Banknote } from "lucide-react";
import { useLoanWorkflow, WORKFLOW_STATUS_LABELS } from "@/hooks/useLoanWorkflow";
import LoanEligibilityCheck from "@/components/LoanEligibilityCheck";
import LoanApprovalTimeline from "@/components/LoanApprovalTimeline";

export default function PresidentDashboard() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showSendBackDialog, setShowSendBackDialog] = useState(false);
  const [comments, setComments] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [memberLoans, setMemberLoans] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, pendingAmount: 0, approvedThisMonth: 0, approvedAmount: 0, rejectedThisMonth: 0, disbursedThisMonth: 0, disbursedAmount: 0 });

  const workflow = useLoanWorkflow();

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
      const reviewerIds = [...new Set(apps.filter(a => a.financial_reviewer_id).map(a => a.financial_reviewer_id))];
      const allIds = [...new Set([...userIds, ...reviewerIds])];

      const { data: profiles } = await supabase.from("profiles").select("id, full_name, member_number, email, phone").in("id", allIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const enriched = apps.map(app => ({
        ...app,
        profile: profileMap.get(app.user_id),
        reviewer_profile: app.financial_reviewer_id ? profileMap.get(app.financial_reviewer_id) : null,
      }));

      setApplications(enriched);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const pendingApps = enriched.filter(a => a.status === 'pending_presidential_approval');

      setStats({
        pending: pendingApps.length,
        pendingAmount: pendingApps.reduce((s, a) => s + (a.requested_amount || 0), 0),
        approvedThisMonth: enriched.filter(a =>
          a.presidential_approval_date && new Date(a.presidential_approval_date) >= startOfMonth &&
          ['approved_awaiting_disbursement', 'disbursed'].includes(a.status)
        ).length,
        approvedAmount: enriched.filter(a =>
          a.presidential_approval_date && new Date(a.presidential_approval_date) >= startOfMonth &&
          ['approved_awaiting_disbursement', 'disbursed'].includes(a.status)
        ).reduce((s, a) => s + (a.requested_amount || 0), 0),
        rejectedThisMonth: enriched.filter(a =>
          a.status === 'rejected' && a.presidential_comments
        ).length,
        disbursedThisMonth: enriched.filter(a =>
          a.status === 'disbursed' && a.disbursement_date && new Date(a.disbursement_date) >= startOfMonth
        ).length,
        disbursedAmount: enriched.filter(a =>
          a.status === 'disbursed' && a.disbursement_date && new Date(a.disbursement_date) >= startOfMonth
        ).reduce((s, a) => s + (a.requested_amount || 0), 0),
      });
    } catch (error) {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberLoans = async (userId: string) => {
    const { data } = await supabase.from("loans").select("*").eq("user_id", userId).eq("status", "active");
    setMemberLoans(data || []);
  };

  const handleViewDetails = async (app: any) => {
    setSelectedApp(app);
    await fetchMemberLoans(app.user_id);
    setShowDetailDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      await workflow.presidentialApprove({ applicationId: selectedApp.id, userId: selectedApp.user_id, comments });
      toast.success("Loan approved and forwarded to Treasurer for disbursement");
      setShowDetailDialog(false);
      setComments("");
      fetchApplications();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve");
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!selectedApp || !comments) { toast.error("Please provide a reason"); return; }
    setActionLoading(true);
    try {
      await workflow.presidentialReject({ applicationId: selectedApp.id, userId: selectedApp.user_id, comments });
      toast.success("Application rejected");
      setShowRejectDialog(false);
      setShowDetailDialog(false);
      setComments("");
      fetchApplications();
    } catch (error: any) { toast.error(error.message); } finally { setActionLoading(false); }
  };

  const handleSendBack = async () => {
    if (!selectedApp || !comments) { toast.error("Please provide a reason"); return; }
    setActionLoading(true);
    try {
      await workflow.sendBackForReview({ applicationId: selectedApp.id, userId: selectedApp.user_id, comments });
      toast.success("Sent back to Financial Secretary for re-review");
      setShowSendBackDialog(false);
      setShowDetailDialog(false);
      setComments("");
      fetchApplications();
    } catch (error: any) { toast.error(error.message); } finally { setActionLoading(false); }
  };

  const pendingApps = applications.filter(a => a.status === 'pending_presidential_approval');

  if (loading) {
    return (
      <ExcoRoute allowedRoles={['president']}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DashboardLayout>
      </ExcoRoute>
    );
  }

  return (
    <ExcoRoute allowedRoles={['president']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">President's Dashboard</h1>
            <p className="text-muted-foreground">Review and approve loan applications</p>
          </div>

          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Awaiting Approval
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">₦{stats.pendingAmount.toLocaleString()} total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Approved This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.approvedThisMonth}</div>
                <p className="text-xs text-muted-foreground">₦{stats.approvedAmount.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Rejected This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats.rejectedThisMonth}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Banknote className="w-4 h-4" /> Disbursed This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{stats.disbursedThisMonth}</div>
                <p className="text-xs text-muted-foreground">₦{stats.disbursedAmount.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Presidential Approval */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Presidential Approval ({pendingApps.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingApps.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No applications awaiting your approval</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Loan Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reviewed By</TableHead>
                        <TableHead>Review Comments</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApps.map(app => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <div><p className="font-medium">{app.profile?.full_name}</p><p className="text-xs text-muted-foreground">{app.profile?.member_number}</p></div>
                          </TableCell>
                          <TableCell className="capitalize">{app.loan_type?.replace("_", " ")}</TableCell>
                          <TableCell className="font-semibold">₦{app.requested_amount?.toLocaleString()}</TableCell>
                          <TableCell>{app.reviewer_profile?.full_name || '-'}</TableCell>
                          <TableCell><p className="max-w-xs truncate text-sm">{app.financial_review_comments || '-'}</p></TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => handleViewDetails(app)}>
                              <Eye className="w-4 h-4 mr-1" /> Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Applications Overview */}
          <Card>
            <CardHeader><CardTitle>All Applications Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.slice(0, 50).map(app => {
                      const statusInfo = WORKFLOW_STATUS_LABELS[app.status] || { label: app.status, color: '' };
                      return (
                        <TableRow key={app.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(app)}>
                          <TableCell>{app.profile?.full_name}</TableCell>
                          <TableCell className="capitalize">{app.loan_type?.replace("_", " ")}</TableCell>
                          <TableCell>₦{app.requested_amount?.toLocaleString()}</TableCell>
                          <TableCell><Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge></TableCell>
                          <TableCell>{new Date(app.application_date).toLocaleDateString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail Dialog */}
        {selectedApp && (
          <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Loan Application - Presidential Review</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Member Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div><Label className="text-muted-foreground">Name</Label><p className="font-medium">{selectedApp.profile?.full_name}</p></div>
                    <div><Label className="text-muted-foreground">Member #</Label><p className="font-medium">{selectedApp.profile?.member_number}</p></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Loan Details</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Type:</span><span className="font-semibold capitalize">{selectedApp.loan_type?.replace("_", " ")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="font-semibold">₦{selectedApp.requested_amount?.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Period:</span><span className="font-semibold">{selectedApp.repayment_period} months</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Monthly Payment:</span><span className="font-semibold">₦{selectedApp.monthly_payment?.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Interest:</span><span className="font-semibold">₦{selectedApp.interest_amount?.toLocaleString()}</span></div>
                  </CardContent>
                </Card>

                {selectedApp.reviewer_profile && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">Financial Secretary's Review</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between"><span className="text-muted-foreground">Reviewed by:</span><span className="font-medium">{selectedApp.reviewer_profile.full_name}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Review date:</span><span>{selectedApp.financial_review_date ? new Date(selectedApp.financial_review_date).toLocaleDateString() : '-'}</span></div>
                      {selectedApp.financial_review_comments && (
                        <div className="mt-2 p-3 bg-muted rounded-lg"><p className="text-sm italic">"{selectedApp.financial_review_comments}"</p></div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader><CardTitle className="text-base">Eligibility Assessment</CardTitle></CardHeader>
                  <CardContent>
                    <LoanEligibilityCheck
                      monthlyIncome={selectedApp.monthly_income || 0}
                      monthlyPayment={selectedApp.monthly_payment || 0}
                      existingLoanCount={memberLoans.length}
                      requestedAmount={selectedApp.requested_amount || 0}
                      loanType={selectedApp.loan_type || ''}
                      existingMonthlyDeductions={memberLoans.reduce((s: number, l: any) => s + (l.monthly_payment || 0), 0)}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Approval History</CardTitle></CardHeader>
                  <CardContent><LoanApprovalTimeline applicationId={selectedApp.id} /></CardContent>
                </Card>

                <div>
                  <Label>Presidential Comments (Optional)</Label>
                  <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Add your comments..." rows={3} />
                </div>
              </div>

              {selectedApp.status === 'pending_presidential_approval' && (
                <DialogFooter className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => { setComments(""); setShowSendBackDialog(true); }}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Send Back
                  </Button>
                  <Button variant="destructive" onClick={() => { setComments(""); setShowRejectDialog(true); }}>
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button onClick={handleApprove} disabled={actionLoading}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve & Send to Treasurer
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject Application</DialogTitle></DialogHeader>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Reason..." rows={4} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>Reject</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send Back Dialog */}
        <Dialog open={showSendBackDialog} onOpenChange={setShowSendBackDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Send Back for Re-Review</DialogTitle></DialogHeader>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Reason for sending back..." rows={4} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSendBackDialog(false)}>Cancel</Button>
              <Button onClick={handleSendBack} disabled={actionLoading}>Send Back</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ExcoRoute>
  );
}
