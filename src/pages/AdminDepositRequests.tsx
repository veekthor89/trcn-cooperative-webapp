import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { AdminRoute } from "@/components/AdminRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, Loader2, Search } from "lucide-react";

interface DepositRequest {
  id: string;
  user_id: string;
  deposit_type: string;
  amount: number;
  loan_id: string | null;
  payment_type: string | null;
  receipt_url: string;
  reference_number: string | null;
  notes: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  member_name?: string;
  member_number?: string;
}

const DEPOSIT_TYPE_LABELS: Record<string, string> = {
  savings: "Add to Savings",
  loan_repayment: "Loan Repayment",
  special_contribution: "Special Contribution",
  buy_shares: "Buy Shares",
};

export default function AdminDepositRequests() {
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DepositRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("deposit_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch member profiles
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, member_number")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const enriched = (data || []).map(r => ({
        ...r,
        member_name: profileMap.get(r.user_id)?.full_name || "Unknown",
        member_number: profileMap.get(r.user_id)?.member_number || "N/A",
      }));

      setRequests(enriched);
    } catch (error) {
      console.error("Error fetching deposit requests:", error);
      toast.error("Failed to load deposit requests");
    } finally {
      setLoading(false);
    }
  };

  const viewReceipt = async (receiptPath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("deposit-receipts")
        .createSignedUrl(receiptPath, 3600);
      if (error) throw error;
      setReceiptUrl(data.signedUrl);
      setShowReceiptDialog(true);
    } catch (error) {
      toast.error("Failed to load receipt");
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Update deposit request status
      const { error } = await supabase
        .from("deposit_requests")
        .update({
          status: "approved",
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);
      if (error) throw error;

      // Notify member
      await supabase.from("notifications").insert({
        user_id: selectedRequest.user_id,
        type: "deposit_approved",
        message: `Your deposit of ₦${selectedRequest.amount.toLocaleString("en-NG")} has been verified and added to your account.`,
      });

      toast.success("Deposit approved successfully");
      setShowApproveDialog(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve deposit");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("deposit_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: selectedRequest.user_id,
        type: "deposit_rejected",
        message: `Your deposit of ₦${selectedRequest.amount.toLocaleString("en-NG")} was rejected. Reason: ${rejectionReason}`,
      });

      toast.success("Deposit rejected");
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject deposit");
    } finally {
      setProcessing(false);
    }
  };

  const filtered = requests.filter(r =>
    r.member_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.member_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.reference_number?.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "approved": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case "rejected": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Deposit Requests</h1>
            <p className="text-muted-foreground">Review and verify member deposit submissions</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, member ID, or reference..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2">
              {["pending", "approved", "rejected", "all"].map(f => (
                <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize">
                  {f}
                </Button>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No {filter !== "all" ? filter : ""} deposit requests found
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(req => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{req.member_name}</p>
                              <p className="text-xs text-muted-foreground">{req.member_number}</p>
                            </div>
                          </TableCell>
                          <TableCell>{DEPOSIT_TYPE_LABELS[req.deposit_type] || req.deposit_type}</TableCell>
                          <TableCell className="font-semibold">₦{req.amount.toLocaleString("en-NG")}</TableCell>
                          <TableCell className="text-sm">{req.reference_number || "—"}</TableCell>
                          <TableCell className="text-sm">{new Date(req.created_at).toLocaleDateString("en-GB")}</TableCell>
                          <TableCell>{statusBadge(req.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => viewReceipt(req.receipt_url)} title="View Receipt">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {req.status === "pending" && (
                                <>
                                  <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => { setSelectedRequest(req); setShowApproveDialog(true); }} title="Approve">
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => { setSelectedRequest(req); setShowRejectDialog(true); }} title="Reject">
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
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

        {/* View Receipt Dialog */}
        <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Transaction Receipt</DialogTitle></DialogHeader>
            {receiptUrl && (
              receiptUrl.includes(".pdf") ? (
                <iframe src={receiptUrl} className="w-full h-[500px] rounded-md" title="Receipt" />
              ) : (
                <img src={receiptUrl} alt="Receipt" className="w-full rounded-md" />
              )
            )}
          </DialogContent>
        </Dialog>

        {/* Approve Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirm Approval</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to approve this deposit of <strong>₦{selectedRequest?.amount.toLocaleString("en-NG")}</strong> from <strong>{selectedRequest?.member_name}</strong> for <strong>{DEPOSIT_TYPE_LABELS[selectedRequest?.deposit_type || ""]}</strong>?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={processing}>Cancel</Button>
              <Button onClick={handleApprove} disabled={processing} className="bg-green-600 hover:bg-green-700 text-white">
                {processing ? "Processing..." : "Approve Deposit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject Deposit</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Please provide a reason for rejecting this deposit from <strong>{selectedRequest?.member_name}</strong>.
              </p>
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectionReason(""); }} disabled={processing}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectionReason.trim()}>
                {processing ? "Processing..." : "Reject Deposit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </AdminRoute>
  );
}
