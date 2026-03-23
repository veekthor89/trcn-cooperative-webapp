import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { AdminRoute } from "@/components/AdminRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { KeyRound, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ResetRequest {
  id: string;
  message: string;
  created_at: string;
  read_status: boolean;
  memberName: string;
  memberIdentifier: string;
  completed: boolean;
}

const AdminPasswordResetRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; request: ResetRequest | null }>({ open: false, request: null });

  const fetchRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get all password_reset_request notifications for this admin
      const { data: notifications, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("type", "password_reset_request")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const parsed: ResetRequest[] = (notifications || []).map((n) => {
        // Parse "Password reset requested by Full Name (TRCN123 or email)"
        const match = n.message.match(/Password reset requested by (.+?) \((.+?)\)/);
        const memberName = match ? match[1] : "Unknown Member";
        const memberIdentifier = match ? match[2] : "";
        // Consider read notifications as "completed" for display
        return {
          id: n.id,
          message: n.message,
          created_at: n.created_at || "",
          read_status: n.read_status || false,
          memberName,
          memberIdentifier,
          completed: n.read_status || false,
        };
      });

      setRequests(parsed);
    } catch (error) {
      console.error("Error fetching reset requests:", error);
      toast.error("Failed to load password reset requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleResetPassword = async (request: ResetRequest) => {
    setResettingId(request.id);
    try {
      // Find the member by member_number or email
      const identifier = request.memberIdentifier;
      let query = supabase.from("profiles").select("id, full_name, email, member_number");
      
      // Try member_number first, then email
      const { data: byMember } = await query.eq("member_number", identifier).maybeSingle();
      let member = byMember;
      
      if (!member) {
        const { data: byEmail } = await supabase.from("profiles").select("id, full_name, email, member_number").eq("email", identifier).maybeSingle();
        member = byEmail;
      }

      if (!member) {
        toast.error(`Could not find member with identifier: ${identifier}`);
        return;
      }

      // Call admin reset password edge function
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { member_id: member.id },
      });

      if (error) throw error;

      // Mark the notification as read
      await supabase
        .from("notifications")
        .update({ read_status: true })
        .eq("id", request.id);

      toast.success(data?.message || `Password reset successfully for ${member.full_name}`);
      setConfirmDialog({ open: false, request: null });
      fetchRequests();
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setResettingId(null);
    }
  };

  const pendingCount = requests.filter(r => !r.completed).length;

  return (
    <AdminRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Password Reset Requests</h1>
              <p className="text-muted-foreground mt-1">
                Manage member password reset requests
              </p>
            </div>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-sm px-3 py-1">
                {pendingCount} Pending
              </Badge>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Reset Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <KeyRound className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No password reset requests</p>
                  <p className="text-sm mt-1">When members request password resets, they'll appear here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member Name</TableHead>
                      <TableHead>TRCN Number / Email</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.memberName}</TableCell>
                        <TableCell>{request.memberIdentifier}</TableCell>
                        <TableCell>
                          {new Date(request.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          {request.completed ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle className="h-3 w-3" /> Completed
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <Clock className="h-3 w-3" /> Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!request.completed && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setConfirmDialog({ open: true, request })}
                              disabled={resettingId === request.id}
                            >
                              {resettingId === request.id ? "Resetting..." : "Reset Password"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, request: open ? confirmDialog.request : null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirm Password Reset
              </DialogTitle>
              <DialogDescription>
                Reset <strong>{confirmDialog.request?.memberName}</strong>'s password to the default (<code>trcn2026</code>)?
                They will be required to change it on their next login.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialog({ open: false, request: null })}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => confirmDialog.request && handleResetPassword(confirmDialog.request)}
                disabled={resettingId !== null}
              >
                {resettingId ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </AdminRoute>
  );
};

export default AdminPasswordResetRequests;
