import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { AdminRoute } from "@/components/AdminRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye, Download, Search, Calendar, TrendingUp, PiggyBank, User, Printer } from "lucide-react";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import PrintableSpecialContribution from "@/components/PrintableSpecialContribution";

export default function AdminSpecialContributions() {
  const [contributions, setContributions] = useState<any[]>([]);
  const [filteredContributions, setFilteredContributions] = useState<any[]>([]);
  const [stats, setStats] = useState({ 
    pending: 0, 
    approvedThisYear: 0, 
    rejectedThisYear: 0, 
    totalApprovedAmount: 0 
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContribution, setSelectedContribution] = useState<any>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  useEffect(() => {
    loadContributions();
    loadStats();
  }, [yearFilter]);

  useEffect(() => {
    filterContributions();
  }, [contributions, statusFilter, searchTerm]);

  const loadStats = async () => {
    const currentYear = new Date().getFullYear();
    
    const { data } = await supabase
      .from("special_contributions")
      .select("application_status, total_expected, contribution_year");

    if (data) {
      const approvedThisYear = data.filter(c => 
        c.application_status === "approved" && c.contribution_year === currentYear
      );
      
      setStats({
        pending: data.filter(c => c.application_status === "pending").length,
        approvedThisYear: approvedThisYear.length,
        rejectedThisYear: data.filter(c => 
          c.application_status === "rejected" && c.contribution_year === currentYear
        ).length,
        totalApprovedAmount: approvedThisYear.reduce((sum, c) => 
          sum + parseFloat(String(c.total_expected || 0)), 0
        )
      });
    }
  };

  const loadContributions = async () => {
    let query = supabase
      .from("special_contributions")
      .select(`
        *,
        profiles!special_contributions_user_id_fkey(full_name, email, member_number)
      `)
      .order("created_at", { ascending: false });

    if (yearFilter !== "all") {
      query = query.eq("contribution_year", parseInt(yearFilter));
    }

    const { data } = await query;
    setContributions(data || []);
  };

  const filterContributions = () => {
    let filtered = [...contributions];

    if (statusFilter !== "all") {
      filtered = filtered.filter(c => c.application_status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.profiles?.member_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredContributions(filtered);
  };

  const handleApprove = async () => {
    if (!selectedContribution) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Calculate maturity date (November of contribution year)
      const maturityDate = new Date(selectedContribution.contribution_year, 10, 30);

      const { error } = await supabase
        .from("special_contributions")
        .update({
          application_status: "approved",
          approved_by: user.id,
          approved_date: new Date().toISOString(),
          maturity_date: maturityDate.toISOString(),
          balance: selectedContribution.total_expected
        })
        .eq("id", selectedContribution.id);

      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: selectedContribution.user_id,
        type: "contribution_approved",
        message: `Your special contribution application for ${selectedContribution.contribution_year} has been approved. Monthly deductions of ₦${parseFloat(selectedContribution.monthly_amount).toLocaleString()} will commence from January to November ${selectedContribution.contribution_year}.`
      });

      toast({ 
        title: "Application Approved", 
        description: "Member will be notified of the approval."
      });
      
      loadContributions();
      loadStats();
      setShowApproveDialog(false);
      setSelectedContribution(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedContribution) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("special_contributions")
        .update({ 
          application_status: "rejected"
        })
        .eq("id", selectedContribution.id);

      if (error) throw error;

      const message = rejectionReason 
        ? `Your special contribution application for ${selectedContribution.contribution_year} has been rejected. Reason: ${rejectionReason}`
        : `Your special contribution application for ${selectedContribution.contribution_year} has been rejected.`;

      await supabase.from("notifications").insert({
        user_id: selectedContribution.user_id,
        type: "contribution_rejected",
        message
      });

      toast({ 
        title: "Application Rejected",
        description: "Member will be notified of the rejection."
      });
      
      loadContributions();
      loadStats();
      setShowRejectDialog(false);
      setSelectedContribution(null);
      setRejectionReason("");
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
    const colors: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
      approved: "bg-green-500/10 text-green-700 border-green-300",
      rejected: "bg-red-500/10 text-red-700 border-red-300"
    };
    return (
      <Badge 
        variant={variants[status] || "default"}
        className={colors[status] || ""}
      >
        {status.toUpperCase()}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const headers = ["Member Name", "TRCN Number", "Year", "Monthly Amount", "Total Expected", "Status", "Date Submitted"];
    const rows = filteredContributions.map(c => [
      c.profiles?.full_name || "",
      c.profiles?.member_number || "",
      c.contribution_year,
      c.monthly_amount,
      c.total_expected,
      c.application_status,
      format(new Date(c.created_at), "MMM dd, yyyy")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `special-contributions-${yearFilter}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({ title: "Export Successful", description: "CSV file downloaded" });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <AdminRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Special Contribution Applications</h1>
              <p className="text-muted-foreground">Manage 11-month contribution deduction plans</p>
            </div>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Pending Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{stats.pending}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Approved This Year
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{stats.approvedThisYear}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Rejected This Year
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{stats.rejectedThisYear}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Approved Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  ₦{stats.totalApprovedAmount.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Applications</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search member..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-full sm:w-[200px]"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="w-full sm:w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredContributions.length === 0 ? (
                <div className="text-center py-12">
                  <PiggyBank className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Applications Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== "all" 
                      ? "Try adjusting your filters"
                      : "No special contribution applications yet"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Member ID</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Monthly Amount</TableHead>
                        <TableHead>Total (11 months)</TableHead>
                        <TableHead>Date Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContributions.map((contribution) => (
                        <TableRow key={contribution.id} className="hover:bg-muted/50">
                          <TableCell>
                            <p className="font-medium">{contribution.profiles?.full_name}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-muted-foreground">{contribution.profiles?.member_number || "N/A"}</p>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{contribution.contribution_year}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-primary">
                              ₦{parseFloat(contribution.monthly_amount).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">
                              ₦{parseFloat(contribution.total_expected).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(contribution.created_at), "MMM dd, yyyy")}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(contribution.application_status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedContribution(contribution)}
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedContribution(contribution);
                                  setShowPrintDialog(true);
                                }}
                                className="gap-2"
                              >
                                <Printer className="h-4 w-4" />
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

        {/* View Details Dialog */}
        <Dialog open={!!selectedContribution} onOpenChange={() => setSelectedContribution(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Contribution Application Details</DialogTitle>
              <DialogDescription>
                Review member's special contribution application
              </DialogDescription>
            </DialogHeader>
            {selectedContribution && (
              <div className="space-y-6">
                {/* Member Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Member Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{selectedContribution.profiles?.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Member ID</p>
                      <p className="font-medium">{selectedContribution.profiles?.member_number || "N/A"}</p>
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
                </div>

                {/* Contribution Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Contribution Breakdown
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 bg-primary/5 p-4 rounded-lg border border-primary/20">
                    <div>
                      <p className="text-sm text-muted-foreground">Contribution Year</p>
                      <p className="text-xl font-bold text-primary">{selectedContribution.contribution_year}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Deduction</p>
                      <p className="text-xl font-bold text-primary">
                        ₦{parseFloat(selectedContribution.monthly_amount).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">11 months (January - November)</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Expected</p>
                      <p className="text-xl font-bold">
                        ₦{parseFloat(selectedContribution.total_expected).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Schedule */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Payment Schedule
                  </h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm mb-2">Monthly deductions will be processed for:</p>
                    <div className="flex flex-wrap gap-2">
                      {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November"].map((month, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {month} {selectedContribution.contribution_year}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      Maturity: November {selectedContribution.contribution_year}
                    </p>
                  </div>
                </div>

                {/* Bank Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Bank Account Details</h3>
                  <div className="grid md:grid-cols-3 gap-4 bg-muted/50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Bank Name</p>
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
                  </div>
                </div>

                {/* Purpose */}
                {selectedContribution.purpose_description && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Purpose</h3>
                    <p className="text-sm bg-muted/50 p-4 rounded-lg">
                      {selectedContribution.purpose_description}
                    </p>
                  </div>
                )}

                {/* Application Info */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Application Status</p>
                    <div className="mt-1">{getStatusBadge(selectedContribution.application_status)}</div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Submitted On</p>
                    <p className="font-medium">{format(new Date(selectedContribution.created_at), "MMM dd, yyyy")}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedContribution.application_status === "pending" && (
                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={() => setShowApproveDialog(true)}
                      disabled={loading}
                      className="flex-1 gap-2"
                      size="lg"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve Application
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={loading}
                      className="flex-1 gap-2"
                      size="lg"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Application
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approve Confirmation Dialog */}
        <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve Special Contribution?</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedContribution && (
                  <div className="space-y-3 mt-4">
                    <p>You are about to approve the following deduction schedule:</p>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="font-semibold">{selectedContribution.profiles?.full_name}</p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Monthly Deduction:</span>{" "}
                        <span className="font-bold text-primary">
                          ₦{parseFloat(selectedContribution.monthly_amount).toLocaleString()}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Period:</span> January - November {selectedContribution.contribution_year}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Total Amount:</span>{" "}
                        <span className="font-bold">
                          ₦{parseFloat(selectedContribution.total_expected).toLocaleString()}
                        </span>
                      </p>
                    </div>
                    <p className="text-sm">The member will be notified of the approval.</p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleApprove} disabled={loading}>
                {loading ? "Processing..." : "Confirm Approval"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Application</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting this application (optional)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason("");
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleReject}
                disabled={loading}
              >
                {loading ? "Processing..." : "Confirm Rejection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Print Dialog */}
        {selectedContribution && (
          <PrintableSpecialContribution
            contribution={selectedContribution}
            isOpen={showPrintDialog}
            onClose={() => setShowPrintDialog(false)}
          />
        )}
      </DashboardLayout>
    </AdminRoute>
  );
}