import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface GuarantorApprovalModalProps {
  request: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GuarantorApprovalModal({ request, open, onClose, onSuccess }: GuarantorApprovalModalProps) {
  const [responding, setResponding] = useState(false);
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<"approve" | "deny" | null>(null);

  const handleResponse = async (approved: boolean) => {
    setResponding(true);
    try {
      const { error } = await supabase
        .from("loan_guarantor_approvals")
        .update({
          status: approved ? "approved" : "denied",
          response_date: new Date().toISOString(),
          response_reason: approved ? null : reason,
        })
        .eq("id", request.id);

      if (error) throw error;

      // Get applicant's user_id to notify them
      const { data: applicantProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("member_number", request.applicant_member_id)
        .single();

      if (applicantProfile) {
        // Notify applicant
        await supabase.from("notifications").insert({
          user_id: applicantProfile.id,
          type: approved ? "guarantor_approved" : "guarantor_denied",
          message: `${request.guarantor_name} has ${approved ? "agreed" : "declined"} to be your guarantor for your ${request.loan_type} loan of ₦${request.loan_amount.toLocaleString()}${approved ? "." : `. Reason: ${reason}`}`,
        });
      }

      toast.success(approved ? "Guarantor request approved" : "Guarantor request declined");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to respond to guarantor request");
    } finally {
      setResponding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            Guarantor Request
          </DialogTitle>
          <DialogDescription>
            You have been requested to be a guarantor for a loan application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Applicant:</span>
              <span className="font-semibold">{request.applicant_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">TRCN Number:</span>
              <span className="font-semibold">{request.applicant_member_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Loan Type:</span>
              <span className="font-semibold capitalize">{request.loan_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Loan Amount:</span>
              <span className="font-semibold text-lg">₦{request.loan_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Position:</span>
              <span className="font-semibold">Guarantor {request.guarantor_position}</span>
            </div>
          </div>

          {action === "deny" && (
            <div>
              <Label htmlFor="reason">Reason for Declining *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a reason for declining this request..."
                rows={3}
                className="mt-1"
              />
            </div>
          )}

          {!action && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 p-3 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Important:</strong> By approving this request, you agree to guarantee this loan. This means you may be liable if the borrower defaults.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {action === null ? (
            <>
              <Button
                variant="outline"
                onClick={() => setAction("deny")}
                className="w-full sm:w-auto"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Decline
              </Button>
              <Button
                onClick={() => setAction("approve")}
                className="w-full sm:w-auto"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </>
          ) : action === "approve" ? (
            <>
              <Button variant="outline" onClick={() => setAction(null)} disabled={responding}>
                Back
              </Button>
              <Button onClick={() => handleResponse(true)} disabled={responding}>
                {responding ? "Approving..." : "Confirm Approval"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setAction(null)} disabled={responding}>
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleResponse(false)}
                disabled={responding || !reason.trim()}
              >
                {responding ? "Declining..." : "Confirm Decline"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
