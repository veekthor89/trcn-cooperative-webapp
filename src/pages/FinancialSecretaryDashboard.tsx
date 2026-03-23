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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, CheckCircle, XCircle, Clock, MessageSquare, FileText } from "lucide-react";
import { useLoanWorkflow, WORKFLOW_STATUS_LABELS } from "@/hooks/useLoanWorkflow";
import LoanEligibilityCheck from "@/components/LoanEligibilityCheck";
import LoanApprovalTimeline from "@/components/LoanApprovalTimeline";

export default function FinancialSecretaryDashboard() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [comments, setComments] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({ pending: 0, approvedThisMonth: 0, rejectedThisMonth: 0 });
  const [memberLoans, setMemberLoans] = useState<any[]>([]);
  
  const workflow = useLoanWorkflow();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("loan_applications")
        .select("*")
        .order("application_date", { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately to avoid relationship ambiguity
      const apps = data || [];
      const userIds = [...new Set(apps.map(a => a.user_id))];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, member_number, email, phone")
        .in("id", userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const enriched = apps.map(app => ({ ...app, profile: profileMap.get(app.user_id) }));
      
      setApplications(enriched);
      
      // Stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStats({
        pending: enriched.filter(a => a.status === 'pending_financial_review').length,
        approvedThisMonth: enriched.filter(a => 
          a.financial_review_date && new Date(a.financial_review_date) >= startOfMonth && 
          ['pending_presidential_approval', 'approved_awaiting_disbursement', 'disbursed'].includes(a.status)
        ).length,
        rejectedThisMonth: enriched.filter(a => 
          a.status === 'rejected' && a.financial_review_date && new Date(a.financial_review_date) >= startOfMonth
        ).length,
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberLoans = async (userId: string) => {
    const { data } = await supabase
      .from("loans")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active");
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
      await workflow.financialApprove({
        applicationId: selectedApp.id,
        userId: selectedApp.user_id,
        comments,
      });
      toast.success("Application approved and forwarded to President");
      setShowDetailDialog(false);
      setComments("");
      fetchApplications();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !comments) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setActionLoading(true);
    try {
      await workflow.financialReject({
        applicationId: selectedApp.id,
        userId: selectedApp.user_id,
        comments,
      });
      toast.success("Application rejected");
      setShowRejectDialog(false);
      setShowDetailDialog(false);
      setComments("");
      fetchApplications();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!selectedApp || !comments) {
      toast.error("Please specify what information is needed");
      return;
    }
    setActionLoading(true);
    try {
      await workflow.requestMoreInfo({
        applicationId: selectedApp.id,
        userId: selectedApp.user_id,
        comments,
      });
      toast.success("Information request sent to member");
      setShowInfoDialog(false);
      setShowDetailDialog(false);
      setComments("");
      fetchApplications();
    } catch (error: any) {
      toast.error(error.message || "Failed to request info");
    } finally {
      setActionLoading(false);
    }
  };

  const pendingApps = applications.filter(a => a.status === 'pending_financial_review');
  const filteredPending = searchTerm 
    ? pendingApps.filter(a => 
        a.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.profile?.member_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : pendingApps;

  const recentlyReviewed = applications
    .filter(a => a.financial_reviewer_id && a.status !== 'pending_financial_review')
    .slice(0, 20);

  if (loading) {
    return (
      <ExcoRoute allowedRoles={['financial_secretary', 'assistant_financial_secretary']}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DashboardLayout>
      </ExcoRoute>
    );
  }

  return (
    <ExcoRoute allowedRoles={['financial_secretary', 'assistant_financial_secretary']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Financial Review Dashboard</h1>
            <p className="text-muted-foreground">Review loan applications for financial eligibility</p>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Pending Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.pending}</div>
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
          </div>

          {/* Search */}
          <div>
            <Input
              placeholder="Search by name or TRCN number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Pending Applications */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Financial Review ({filteredPending.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPending.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No applications pending review</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Loan Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Monthly Income</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPending.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{app.profile?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{app.profile?.member_number}</p>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{app.loan_type?.replace("_", " ")}</TableCell>
                          <TableCell className="font-semibold">₦{app.requested_amount?.toLocaleString()}</TableCell>
                          <TableCell>₦{app.monthly_income?.toLocaleString() || 'N/A'}</TableCell>
                          <TableCell>{new Date(app.application_date).toLocaleDateString()}</TableCell>
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

          {/* Recently Reviewed */}
          {recentlyReviewed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recently Reviewed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Loan Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Review Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentlyReviewed.map((app) => {
                        const statusInfo = WORKFLOW_STATUS_LABELS[app.status] || { label: app.status, color: '' };
                        return (
                          <TableRow key={app.id}>
                            <TableCell>{app.profile?.full_name}</TableCell>
                            <TableCell className="capitalize">{app.loan_type?.replace("_", " ")}</TableCell>
                            <TableCell>₦{app.requested_amount?.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge>
                            </TableCell>
                            <TableCell>{app.financial_review_date ? new Date(app.financial_review_date).toLocaleDateString() : '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Detail Dialog */}
        {selectedApp && (
          <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Financial Review - Loan Application</DialogTitle>
                <DialogDescription>
                  Review the financial eligibility of this loan application
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Member Info */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Member Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div><Label className="text-muted-foreground">Name</Label><p className="font-medium">{selectedApp.profile?.full_name}</p></div>
                    <div><Label className="text-muted-foreground">TRCN #</Label><p className="font-medium">{selectedApp.profile?.member_number}</p></div>
                    <div><Label className="text-muted-foreground">Email</Label><p className="font-medium">{selectedApp.profile?.email}</p></div>
                    <div><Label className="text-muted-foreground">Phone</Label><p className="font-medium">{selectedApp.profile?.phone}</p></div>
                  </CardContent>
                </Card>

                {/* Loan Details */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Loan Details</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Loan Type:</span><span className="font-semibold capitalize">{selectedApp.loan_type?.replace("_", " ")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="font-semibold">₦{selectedApp.requested_amount?.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Period:</span><span className="font-semibold">{selectedApp.repayment_period} months</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Monthly Payment:</span><span className="font-semibold">₦{selectedApp.monthly_payment?.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Interest:</span><span className="font-semibold">₦{selectedApp.interest_amount?.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Monthly Income:</span><span className="font-semibold">₦{selectedApp.monthly_income?.toLocaleString()}</span></div>
                  </CardContent>
                </Card>

                {/* Eligibility Check */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Eligibility Assessment</CardTitle></CardHeader>
                  <CardContent>
                    <LoanEligibilityCheck
                      monthlyIncome={selectedApp.monthly_income || 0}
                      monthlyPayment={selectedApp.monthly_payment || 0}
                      existingLoanCount={memberLoans.length}
                      requestedAmount={selectedApp.requested_amount || 0}
                      loanType={selectedApp.loan_type || ''}
                      existingMonthlyDeductions={memberLoans.reduce((sum: number, l: any) => sum + (l.monthly_payment || 0), 0)}
                    />
                  </CardContent>
                </Card>

                {/* Active Loans */}
                {memberLoans.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">Active Loans ({memberLoans.length})</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {memberLoans.map(loan => (
                          <div key={loan.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                            <span className="capitalize">{loan.loan_type?.replace("_", " ")} - ₦{loan.principal_amount?.toLocaleString()}</span>
                            <span>₦{loan.monthly_payment?.toLocaleString()}/month</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Approval Timeline */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Approval History</CardTitle></CardHeader>
                  <CardContent>
                    <LoanApprovalTimeline applicationId={selectedApp.id} />
                  </CardContent>
                </Card>

                {/* Comments */}
                <div>
                  <Label>Review Comments (Optional)</Label>
                  <Textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add your review comments..."
                    rows={3}
                  />
                </div>
              </div>

              {selectedApp.status === 'pending_financial_review' && (
                <DialogFooter className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => { setComments(""); setShowInfoDialog(true); }}>
                    <MessageSquare className="w-4 h-4 mr-2" /> Request Info
                  </Button>
                  <Button variant="destructive" onClick={() => { setComments(""); setShowRejectDialog(true); }}>
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button onClick={handleApprove} disabled={actionLoading}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve & Forward to President
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Application</DialogTitle>
              <DialogDescription>Provide a reason for rejection</DialogDescription>
            </DialogHeader>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Rejection reason..." rows={4} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>Reject</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Request Info Dialog */}
        <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request More Information</DialogTitle>
              <DialogDescription>Specify what information is needed</DialogDescription>
            </DialogHeader>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="What information do you need?" rows={4} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInfoDialog(false)}>Cancel</Button>
              <Button onClick={handleRequestInfo} disabled={actionLoading}>Send Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ExcoRoute>
  );
}
