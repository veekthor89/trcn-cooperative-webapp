import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, Eye, CheckCircle, XCircle, TrendingUp, Users, DollarSign, Printer } from "lucide-react";
import PrintableShareSubscription from "@/components/PrintableShareSubscription";

export default function AdminShareSubscriptions() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, totalValue: 0 });
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("share_subscriptions")
        .select(`
          *,
          profiles:user_id (full_name, member_number, email, phone)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: allApps } = await supabase
        .from("share_subscriptions")
        .select("status, total_cost");

      if (allApps) {
        setStats({
          total: allApps.length,
          pending: allApps.filter((a) => a.status === "pending" || a.status === "payment_verified").length,
          approved: allApps.filter((a) => a.status === "approved" || a.status === "completed").length,
          totalValue: allApps
            .filter((a) => a.status === "approved" || a.status === "completed")
            .reduce((sum, a) => sum + parseFloat(a.total_cost.toString()), 0),
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleVerifyPayment = async (appId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("share_subscriptions")
        .update({
          status: "payment_verified",
        })
        .eq("id", appId);

      if (error) throw error;

      // Update payment record
      await supabase
        .from("share_subscription_payments")
        .update({ status: "verified", verified_by: user.id, verified_date: new Date().toISOString() })
        .eq("subscription_id", appId);

      toast.success("Payment verified successfully");
      fetchApplications();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to verify payment");
    }
  };

  const handleApprove = async (app: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update application status
      const { error: appError } = await supabase
        .from("share_subscriptions")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_date: new Date().toISOString(),
        })
        .eq("id", app.id);

      if (appError) throw appError;

      // Update or create share holdings
      const { data: existingShares } = await supabase
        .from("shares")
        .select("*")
        .eq("user_id", app.user_id)
        .single();

      if (existingShares) {
        await supabase
          .from("shares")
          .update({
            total_shares: existingShares.total_shares + app.shares_requested,
            current_value: (existingShares.total_shares + app.shares_requested) * 1000,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", app.user_id);
      } else {
        await supabase.from("shares").insert({
          user_id: app.user_id,
          total_shares: app.shares_requested,
          current_value: app.shares_requested * 1000,
        });
      }

      // Create transaction record
      await supabase.from("share_transactions").insert({
        user_id: app.user_id,
        subscription_id: app.id,
        transaction_type: "purchase",
        shares_quantity: app.shares_requested,
        amount: app.total_cost,
        reference_number: app.application_number,
        description: `Share purchase - Application ${app.application_number}`,
      });

      // Create notification
      await supabase.from("notifications").insert({
        user_id: app.user_id,
        type: "share_approved",
        message: `Your share subscription application ${app.application_number} has been approved. ${app.shares_requested} shares have been allocated to your account.`,
      });

      toast.success("Application approved successfully");
      setShowDetailDialog(false);
      fetchApplications();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve application");
    }
  };

  const handleReject = async (app: any) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      const { error } = await supabase
        .from("share_subscriptions")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
        })
        .eq("id", app.id);

      if (error) throw error;

      // Create notification
      await supabase.from("notifications").insert({
        user_id: app.user_id,
        type: "share_rejected",
        message: `Your share subscription application ${app.application_number} has been rejected. Reason: ${rejectionReason}`,
      });

      toast.success("Application rejected");
      setShowDetailDialog(false);
      setRejectionReason("");
      fetchApplications();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject application");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Draft", variant: "secondary" },
      pending: { label: "Pending", variant: "default" },
      payment_verified: { label: "Payment Verified", variant: "default" },
      approved: { label: "Approved", variant: "default" },
      rejected: { label: "Rejected", variant: "destructive" },
      completed: { label: "Completed", variant: "outline" },
    };

    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filterApplications = (status: string) => {
    if (status === "all") return applications;
    if (status === "pending_review") {
      return applications.filter((app) => app.status === "pending" || app.status === "payment_verified");
    }
    return applications.filter((app) => app.status === status);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Share Subscriptions</h1>
          <p className="text-muted-foreground">Manage member share applications</p>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₦{stats.totalValue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>Review and manage share subscription applications</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending_review">Pending Review</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>

              {["all", "pending_review", "approved", "rejected"].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Application #</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Shares</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterApplications(tab).map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.application_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{app.profiles?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{app.profiles?.member_number}</p>
                            </div>
                          </TableCell>
                          <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{app.shares_requested}</TableCell>
                          <TableCell>₦{app.total_cost.toLocaleString()}</TableCell>
                          <TableCell className="capitalize">{app.payment_method.replace("_", " ")}</TableCell>
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
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      {selectedApp && (
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
              <DialogDescription>{selectedApp.application_number}</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
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

              {/* Application Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Share Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shares Requested:</span>
                    <span className="font-semibold">{selectedApp.shares_requested}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price per Share:</span>
                    <span className="font-semibold">₦{selectedApp.price_per_share.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="font-semibold text-lg">₦{selectedApp.total_cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Shares Before:</span>
                    <span className="font-semibold">{selectedApp.current_shares_before}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shares After Approval:</span>
                    <span className="font-semibold">{selectedApp.shares_after}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-semibold capitalize">{selectedApp.payment_method.replace("_", " ")}</span>
                  </div>
                  {selectedApp.payment_reference && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference Number:</span>
                      <span className="font-semibold">{selectedApp.payment_reference}</span>
                    </div>
                  )}
                  {selectedApp.deduction_months && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deduction Period:</span>
                        <span className="font-semibold">{selectedApp.deduction_months} months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Deduction:</span>
                        <span className="font-semibold">
                          ₦{selectedApp.monthly_deduction_amount?.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                  {selectedApp.payment_proof_url && (
                    <div>
                      <Label className="text-muted-foreground">Payment Proof:</Label>
                      <a
                        href={selectedApp.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View Proof
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              {selectedApp.status === "pending" && (
                <div className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => handleVerifyPayment(selectedApp.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify Payment
                  </Button>
                </div>
              )}

              {selectedApp.status === "payment_verified" && (
                <div className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => handleApprove(selectedApp)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Application
                  </Button>
                  <div className="space-y-2">
                    <Label>Rejection Reason</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                    />
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleReject(selectedApp)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Application
                  </Button>
                </div>
              )}

              {selectedApp.status === "rejected" && selectedApp.rejection_reason && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-destructive">Rejection Reason</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedApp.rejection_reason}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Print Dialog */}
      {selectedApp && (
        <PrintableShareSubscription
          subscription={selectedApp}
          isOpen={showPrintDialog}
          onClose={() => setShowPrintDialog(false)}
        />
      )}
    </DashboardLayout>
  );
}
