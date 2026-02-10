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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Banknote, Clock, FileText, AlertTriangle } from "lucide-react";
import { useLoanWorkflow, WORKFLOW_STATUS_LABELS } from "@/hooks/useLoanWorkflow";
import LoanApprovalTimeline from "@/components/LoanApprovalTimeline";

export default function TreasurerDashboard() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showDisbursementDialog, setShowDisbursementDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [disbursementMethod, setDisbursementMethod] = useState("");
  const [disbursementReference, setDisbursementReference] = useState("");
  const [disbursementNotes, setDisbursementNotes] = useState("");
  const [stats, setStats] = useState({ pending: 0, pendingAmount: 0, disbursedThisMonth: 0, disbursedAmount: 0, disbursedThisYear: 0, disbursedYearAmount: 0 });

  const workflow = useLoanWorkflow();

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("loan_applications")
        .select("*")
        .in("status", ["approved_awaiting_disbursement", "disbursed"])
        .order("application_date", { ascending: false });

      if (error) throw error;

      const apps = data || [];
      const userIds = [...new Set(apps.map(a => a.user_id))];

      const { data: profiles } = await supabase.from("profiles")
        .select("id, full_name, member_number, bank_name, account_number, account_name")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const enriched = apps.map(app => ({ ...app, profile: profileMap.get(app.user_id) }));

      setApplications(enriched);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const pendingApps = enriched.filter(a => a.status === 'approved_awaiting_disbursement');
      const disbursedMonth = enriched.filter(a => a.status === 'disbursed' && a.disbursement_date && new Date(a.disbursement_date) >= startOfMonth);
      const disbursedYear = enriched.filter(a => a.status === 'disbursed' && a.disbursement_date && new Date(a.disbursement_date) >= startOfYear);

      setStats({
        pending: pendingApps.length,
        pendingAmount: pendingApps.reduce((s, a) => s + (a.requested_amount || 0), 0),
        disbursedThisMonth: disbursedMonth.length,
        disbursedAmount: disbursedMonth.reduce((s, a) => s + (a.requested_amount || 0), 0),
        disbursedThisYear: disbursedYear.length,
        disbursedYearAmount: disbursedYear.reduce((s, a) => s + (a.requested_amount || 0), 0),
      });
    } catch (error) {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleDisbursement = async () => {
    if (!selectedApp || !disbursementMethod || !disbursementReference) {
      toast.error("Please fill all required fields");
      return;
    }
    setActionLoading(true);
    try {
      await workflow.markAsDisbursed(selectedApp.id, selectedApp.user_id, {
        method: disbursementMethod,
        reference: disbursementReference,
        notes: disbursementNotes,
        amount: selectedApp.requested_amount,
        loanType: selectedApp.loan_type,
        interestAmount: selectedApp.interest_amount || 0,
        repaymentPeriod: selectedApp.repayment_period,
        monthlyPayment: selectedApp.monthly_payment,
      });
      toast.success("Loan disbursed successfully");
      setShowDisbursementDialog(false);
      resetDisbursementForm();
      fetchApplications();
    } catch (error: any) {
      toast.error(error.message || "Failed to process disbursement");
    } finally {
      setActionLoading(false);
    }
  };

  const resetDisbursementForm = () => {
    setDisbursementMethod("");
    setDisbursementReference("");
    setDisbursementNotes("");
  };

  const pendingApps = applications.filter(a => a.status === 'approved_awaiting_disbursement');
  const disbursedApps = applications.filter(a => a.status === 'disbursed');

  const getDaysSinceApproval = (approvalDate: string) => {
    const days = Math.floor((Date.now() - new Date(approvalDate).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  // Calculate amount to disburse (for Normal loans, 10% interest is deducted upfront)
  const getAmountToDisburse = (app: any) => {
    if (app.loan_type === 'normal') {
      return app.requested_amount - (app.interest_amount || 0);
    }
    return app.requested_amount;
  };

  if (loading) {
    return (
      <ExcoRoute allowedRoles={['treasurer', 'assistant_treasurer']}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DashboardLayout>
      </ExcoRoute>
    );
  }

  return (
    <ExcoRoute allowedRoles={['treasurer', 'assistant_treasurer']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Treasurer's Dashboard</h1>
            <p className="text-muted-foreground">Process loan disbursements</p>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Pending Disbursements
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
                  <Banknote className="w-4 h-4" /> Disbursed This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.disbursedThisMonth}</div>
                <p className="text-xs text-muted-foreground">₦{stats.disbursedAmount.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Banknote className="w-4 h-4" /> Disbursed This Year
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.disbursedThisYear}</div>
                <p className="text-xs text-muted-foreground">₦{stats.disbursedYearAmount.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Disbursements */}
          <Card>
            <CardHeader>
              <CardTitle>Approved Loans Awaiting Disbursement ({pendingApps.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingApps.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No loans awaiting disbursement</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Loan Type</TableHead>
                        <TableHead>Amount to Disburse</TableHead>
                        <TableHead>Approved On</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApps.map(app => {
                        const daysSince = app.presidential_approval_date ? getDaysSinceApproval(app.presidential_approval_date) : 0;
                        const isUrgent = daysSince > 3;
                        return (
                          <TableRow key={app.id}>
                            <TableCell>
                              <div><p className="font-medium">{app.profile?.full_name}</p><p className="text-xs text-muted-foreground">{app.profile?.member_number}</p></div>
                            </TableCell>
                            <TableCell className="capitalize">{app.loan_type?.replace("_", " ")}</TableCell>
                            <TableCell className="font-semibold">₦{getAmountToDisburse(app).toLocaleString()}</TableCell>
                            <TableCell>{app.presidential_approval_date ? new Date(app.presidential_approval_date).toLocaleDateString() : '-'}</TableCell>
                            <TableCell>
                              {isUrgent ? (
                                <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" /> Urgent ({daysSince}d)
                                </Badge>
                              ) : (
                                <Badge variant="outline">{daysSince}d ago</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" onClick={() => { setSelectedApp(app); setShowDisbursementDialog(true); }}>
                                <Banknote className="w-4 h-4 mr-1" /> Disburse
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

          {/* Disbursement History */}
          {disbursedApps.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Disbursement History</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {disbursedApps.slice(0, 30).map(app => (
                        <TableRow key={app.id}>
                          <TableCell>{app.profile?.full_name}</TableCell>
                          <TableCell className="capitalize">{app.loan_type?.replace("_", " ")}</TableCell>
                          <TableCell>₦{getAmountToDisburse(app).toLocaleString()}</TableCell>
                          <TableCell className="capitalize">{app.disbursement_method?.replace("_", " ") || '-'}</TableCell>
                          <TableCell>{app.disbursement_reference || '-'}</TableCell>
                          <TableCell>{app.disbursement_date ? new Date(app.disbursement_date).toLocaleDateString() : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Disbursement Dialog */}
        {selectedApp && (
          <Dialog open={showDisbursementDialog} onOpenChange={(open) => { setShowDisbursementDialog(open); if (!open) resetDisbursementForm(); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Process Loan Disbursement</DialogTitle>
                <DialogDescription>Confirm and record the disbursement of this approved loan</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Loan Summary */}
                <Card>
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Member:</span><span className="font-medium">{selectedApp.profile?.full_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Loan Type:</span><span className="font-medium capitalize">{selectedApp.loan_type?.replace("_", " ")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Loan Amount:</span><span className="font-semibold">₦{selectedApp.requested_amount?.toLocaleString()}</span></div>
                    {selectedApp.loan_type === 'normal' && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Interest (Deducted):</span><span className="font-medium text-red-600">-₦{selectedApp.interest_amount?.toLocaleString()}</span></div>
                    )}
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Amount to Disburse:</span>
                      <span className="text-lg font-bold">₦{getAmountToDisburse(selectedApp).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Bank Details */}
                {selectedApp.profile?.bank_name && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Bank Details</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Bank:</span><span>{selectedApp.profile.bank_name}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Account:</span><span>{selectedApp.profile.account_number}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Name:</span><span>{selectedApp.profile.account_name}</span></div>
                    </CardContent>
                  </Card>
                )}

                {/* Disbursement Form */}
                <div className="space-y-3">
                  <div>
                    <Label>Disbursement Method *</Label>
                    <Select value={disbursementMethod} onValueChange={setDisbursementMethod}>
                      <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reference Number *</Label>
                    <Input value={disbursementReference} onChange={(e) => setDisbursementReference(e.target.value)} placeholder="Transaction reference number" />
                  </div>
                  <div>
                    <Label>Additional Notes</Label>
                    <Textarea value={disbursementNotes} onChange={(e) => setDisbursementNotes(e.target.value)} placeholder="Optional notes..." rows={3} />
                  </div>
                </div>

                {/* Approval Timeline */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Approval History</CardTitle></CardHeader>
                  <CardContent><LoanApprovalTimeline applicationId={selectedApp.id} /></CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDisbursementDialog(false)}>Cancel</Button>
                <Button onClick={handleDisbursement} disabled={actionLoading}>
                  <Banknote className="w-4 h-4 mr-2" /> Mark as Disbursed
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DashboardLayout>
    </ExcoRoute>
  );
}
