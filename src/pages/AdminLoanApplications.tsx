import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { AdminRoute } from "@/components/AdminRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Eye, CheckCircle, XCircle, AlertCircle, Clock, FileText, Printer } from "lucide-react";
import PrintableLoanApplication from "@/components/PrintableLoanApplication";

export default function AdminLoanApplications() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [stats, setStats] = useState({ pending: 0, approvedThisMonth: 0, rejectedThisMonth: 0 });
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, []);

  useEffect(() => {
    filterApplicationsList();
  }, [applications, filterStatus, searchTerm]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("loan_applications")
        .select(`
          *,
          profiles:user_id (full_name, member_number, email, phone)
        `)
        .order("application_date", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load loan applications");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: allApps } = await supabase
        .from("loan_applications")
        .select("status, approval_date");

      if (allApps) {
        setStats({
          pending: allApps.filter((a) => a.status === "pending").length,
          approvedThisMonth: allApps.filter(
            (a) => a.status === "approved" && a.approval_date && new Date(a.approval_date) >= startOfMonth
          ).length,
          rejectedThisMonth: allApps.filter(
            (a) => a.status === "rejected" && a.approval_date && new Date(a.approval_date) >= startOfMonth
          ).length,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const filterApplicationsList = () => {
    let filtered = applications;

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((app) => app.status === filterStatus);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.profiles?.member_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredApplications(filtered);
  };

  const handleApprove = async () => {
    if (!selectedApp) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update application status
      const { error: appError } = await supabase
        .from("loan_applications")
        .update({
          status: "approved",
          approved_by: user.id,
          approval_date: new Date().toISOString(),
        })
        .eq("id", selectedApp.id);

      if (appError) throw appError;

      // Create loan record
      const { error: loanError } = await supabase.from("loans").insert({
        user_id: selectedApp.user_id,
        loan_type: selectedApp.loan_type,
        principal_amount: selectedApp.requested_amount,
        interest_rate: (selectedApp.interest_amount / selectedApp.requested_amount) * 100,
        repayment_period: selectedApp.repayment_period,
        outstanding_balance: selectedApp.requested_amount + selectedApp.interest_amount,
        monthly_payment: selectedApp.monthly_payment,
        status: "active",
        next_payment_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split("T")[0],
      });

      if (loanError) throw loanError;

      // Create notification for applicant
      await supabase.from("notifications").insert({
        user_id: selectedApp.user_id,
        type: "loan_approved",
        message: `Your ${selectedApp.loan_type} loan application for ₦${selectedApp.requested_amount.toLocaleString()} has been approved.`,
      });

      toast.success("Loan application approved");
      setShowApproveDialog(false);
      setShowDetailDialog(false);
      fetchApplications();
      fetchStats();
    } catch (error: any) {
      console.error("Error approving loan:", error);
      toast.error(error.message || "Failed to approve loan application");
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;

    try {
      const { error } = await supabase
        .from("loan_applications")
        .update({
          status: "rejected",
          notes: rejectionReason,
        })
        .eq("id", selectedApp.id);

      if (error) throw error;

      // Create notification
      await supabase.from("notifications").insert({
        user_id: selectedApp.user_id,
        type: "loan_rejected",
        message: `Your ${selectedApp.loan_type} loan application has been rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`,
      });

      toast.success("Loan application rejected");
      setShowRejectDialog(false);
      setShowDetailDialog(false);
      setRejectionReason("");
      fetchApplications();
      fetchStats();
    } catch (error: any) {
      console.error("Error rejecting loan:", error);
      toast.error(error.message || "Failed to reject loan application");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }
    > = {
      pending: { label: "Pending", variant: "default", icon: Clock },
      approved: { label: "Approved", variant: "outline", icon: CheckCircle },
      rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
      draft: { label: "Draft", variant: "secondary", icon: FileText },
    };

    const config = statusConfig[status] || { label: status, variant: "outline", icon: AlertCircle };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <AdminRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DashboardLayout>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Loan Applications</h1>
            <p className="text-muted-foreground">Review and manage member loan applications</p>
          </div>

          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pending Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.pending}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Approved This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.approvedThisMonth}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Rejected This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats.rejectedThisMonth}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Applications</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Search Member</Label>
                  <Input
                    placeholder="Search by name or TRCN number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
              <CardDescription>
                {filteredApplications.length} application{filteredApplications.length !== 1 ? "s" : ""} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredApplications.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No applications found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || filterStatus !== "all"
                      ? "Try adjusting your filters"
                      : "No loan applications have been submitted yet"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Loan Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Date Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{app.profiles?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{app.profiles?.member_number}</p>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{app.loan_type.replace("_", " ")}</TableCell>
                          <TableCell className="font-semibold">₦{app.requested_amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <p className="max-w-xs truncate">{app.purpose || "N/A"}</p>
                          </TableCell>
                          <TableCell>{new Date(app.application_date).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedApp(app);
                                  setShowDetailDialog(true);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedApp(app);
                                  setShowPrintDialog(true);
                                }}
                              >
                                <Printer className="w-4 h-4 mr-1" />
                                Print
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail Dialog */}
        {selectedApp && (
          <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Loan Application Details</DialogTitle>
                <DialogDescription>
                  Application submitted on {new Date(selectedApp.application_date).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Member Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Member Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium">{selectedApp.profiles?.full_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Member Number</Label>
                      <p className="font-medium">{selectedApp.profiles?.member_number}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{selectedApp.profiles?.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium">{selectedApp.profiles?.phone}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Loan Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Loan Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Loan Type:</span>
                      <span className="font-semibold capitalize">{selectedApp.loan_type.replace("_", " ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Requested Amount:</span>
                      <span className="font-semibold text-lg">₦{selectedApp.requested_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Repayment Period:</span>
                      <span className="font-semibold">{selectedApp.repayment_period} months</span>
                    </div>
                    {selectedApp.monthly_payment && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Payment:</span>
                        <span className="font-semibold">₦{selectedApp.monthly_payment.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedApp.interest_amount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interest Amount:</span>
                        <span className="font-semibold">₦{selectedApp.interest_amount.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedApp.amount_received && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount to Receive:</span>
                        <span className="font-semibold">₦{selectedApp.amount_received.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly Income:</span>
                      <span className="font-semibold">
                        {selectedApp.monthly_income ? `₦${selectedApp.monthly_income.toLocaleString()}` : "N/A"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Purpose */}
                {selectedApp.purpose && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Loan Purpose</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedApp.purpose}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Guarantors */}
                {(selectedApp.guarantor_1_name || selectedApp.guarantor_2_name) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Guarantors</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedApp.guarantor_1_name && (
                        <div>
                          <Label className="text-muted-foreground">Guarantor 1</Label>
                          <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                            <div>
                              <span className="text-muted-foreground">Name: </span>
                              <span className="font-medium">{selectedApp.guarantor_1_name}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Member #: </span>
                              <span className="font-medium">{selectedApp.guarantor_1_member_number}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Phone: </span>
                              <span className="font-medium">{selectedApp.guarantor_1_phone}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedApp.guarantor_2_name && (
                        <div>
                          <Label className="text-muted-foreground">Guarantor 2</Label>
                          <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                            <div>
                              <span className="text-muted-foreground">Name: </span>
                              <span className="font-medium">{selectedApp.guarantor_2_name}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Member #: </span>
                              <span className="font-medium">{selectedApp.guarantor_2_member_number}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Phone: </span>
                              <span className="font-medium">{selectedApp.guarantor_2_phone}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Bank Details */}
                {selectedApp.bank_name && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Bank Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Bank Name</Label>
                        <p className="font-medium">{selectedApp.bank_name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Account Number</Label>
                        <p className="font-medium">{selectedApp.account_number}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Account Name</Label>
                        <p className="font-medium">{selectedApp.account_name}</p>
                      </div>
                      {selectedApp.account_type && (
                        <div>
                          <Label className="text-muted-foreground">Account Type</Label>
                          <p className="font-medium capitalize">{selectedApp.account_type}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Admin Notes */}
                {selectedApp.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Admin Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedApp.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Action Buttons */}
              {selectedApp.status === "pending" && (
                <DialogFooter className="flex gap-2">
                  <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button onClick={() => setShowApproveDialog(true)}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Approve Confirmation Dialog */}
        <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve Loan Application</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve this loan application for{" "}
                <strong>₦{selectedApp?.requested_amount.toLocaleString()}</strong>? This will create an active loan
                record and notify the member.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleApprove}>Approve Loan</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Loan Application</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this application (optional)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rejection Reason</Label>
                <Textarea
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Reject Application
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Print Dialog */}
        {selectedApp && (
          <PrintableLoanApplication
            application={selectedApp}
            isOpen={showPrintDialog}
            onClose={() => setShowPrintDialog(false)}
          />
        )}
      </DashboardLayout>
    </AdminRoute>
  );
}
