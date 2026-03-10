import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Landmark, Copy, CheckCircle2 } from "lucide-react";

interface MakeDepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ActiveLoan {
  id: string;
  loan_type: string;
  outstanding_balance: number;
  monthly_payment: number | null;
}

const MakeDepositModal = ({ open, onOpenChange, onSuccess }: MakeDepositModalProps) => {
  const [depositType, setDepositType] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [paymentType, setPaymentType] = useState("full");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      fetchActiveLoans();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (depositType === "loan_repayment" && selectedLoanId && paymentType === "full") {
      const loan = activeLoans.find(l => l.id === selectedLoanId);
      if (loan) setAmount(loan.outstanding_balance.toString());
    }
  }, [depositType, selectedLoanId, paymentType, activeLoans]);

  const resetForm = () => {
    setDepositType("");
    setAmount("");
    setSelectedLoanId("");
    setPaymentType("full");
    setReferenceNumber("");
    setNotes("");
    setReceiptFile(null);
    setReceiptPreview(null);
    setErrors({});
  };

  const fetchActiveLoans = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from("loans")
      .select("id, loan_type, outstanding_balance, monthly_payment")
      .eq("user_id", session.user.id)
      .eq("status", "active");
    setActiveLoans(data || []);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or PDF file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    setReceiptFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
    setErrors(prev => ({ ...prev, receipt: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!depositType) newErrors.depositType = "Please select a deposit type";
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = "Amount must be greater than ₦0";
    if (!receiptFile) newErrors.receipt = "Please upload your transaction receipt";
    if (depositType === "loan_repayment" && !selectedLoanId) newErrors.loan = "Please select a loan";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Upload receipt
      const fileExt = receiptFile!.name.split(".").pop();
      const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("deposit-receipts")
        .upload(filePath, receiptFile!);
      if (uploadError) throw uploadError;

      // Create deposit request
      const { error: insertError } = await supabase
        .from("deposit_requests")
        .insert({
          user_id: session.user.id,
          deposit_type: depositType,
          amount: parseFloat(amount),
          loan_id: depositType === "loan_repayment" ? selectedLoanId : null,
          payment_type: depositType === "loan_repayment" ? paymentType : null,
          receipt_url: filePath,
          reference_number: referenceNumber || null,
          notes: notes || null,
        });
      if (insertError) throw insertError;

      // Get user profile for notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      const depositLabels: Record<string, string> = {
        savings: "Savings",
        loan_repayment: "Loan Repayment",
        special_contribution: "Special Contribution",
        buy_shares: "Share Purchase",
      };

      // Notify admin/EXCO roles
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "president", "general_secretary", "financial_secretary", "treasurer"]);

      const uniqueUserIds = [...new Set(adminRoles?.map(r => r.user_id) || [])];
      const notifMessage = `${profile?.full_name || "A member"} submitted a deposit of ₦${parseFloat(amount).toLocaleString("en-NG")} for ${depositLabels[depositType] || depositType}. Please review and verify.`;

      if (uniqueUserIds.length > 0) {
        await supabase.from("notifications").insert(
          uniqueUserIds.map(uid => ({
            user_id: uid,
            type: "deposit_request",
            message: notifMessage,
          }))
        );
      }

      toast.success("Deposit request submitted successfully! Your transaction will be verified and processed by admin.");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting deposit:", error);
      toast.error(error.message || "Failed to submit deposit request");
    } finally {
      setSubmitting(false);
    }
  };

  const copyAccountNumber = () => {
    navigator.clipboard.writeText("2006186959");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl font-bold">Make a Deposit</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-140px)] px-6 pb-2">
          <div className="space-y-5 pt-2">
            {/* Bank Account Details */}
            <div className="rounded-lg p-4 border-2 border-[hsl(216,95%,93%)] bg-[hsl(216,95%,95%)]">
              <div className="flex items-center gap-2 mb-3">
                <Landmark className="h-5 w-5 text-[hsl(216,100%,50%)]" />
                <h3 className="font-semibold text-[hsl(216,100%,30%)]">Bank Account Details</h3>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank Name:</span>
                  <span className="font-semibold">First Bank</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Account Number:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold font-mono text-lg">2006186959</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyAccountNumber}>
                      {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Name:</span>
                  <span className="font-semibold">TRCN Staff Multipurpose Cooperative Society</span>
                </div>
              </div>
              <p className="text-xs text-[hsl(216,100%,40%)] mt-3 italic">
                Please transfer to this account and upload your receipt below.
              </p>
            </div>

            {/* Deposit Type */}
            <div className="space-y-2">
              <Label>Deposit Type <span className="text-destructive">*</span></Label>
              <Select value={depositType} onValueChange={(v) => { setDepositType(v); setSelectedLoanId(""); setAmount(""); }}>
                <SelectTrigger><SelectValue placeholder="Select deposit type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Add to Savings</SelectItem>
                  <SelectItem value="loan_repayment">Loan Repayment</SelectItem>
                  <SelectItem value="special_contribution">Special Contribution</SelectItem>
                  <SelectItem value="buy_shares">Buy Shares</SelectItem>
                </SelectContent>
              </Select>
              {errors.depositType && <p className="text-sm text-destructive">{errors.depositType}</p>}
            </div>

            {/* Loan-specific fields */}
            {depositType === "loan_repayment" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Loan <span className="text-destructive">*</span></Label>
                  <Select value={selectedLoanId} onValueChange={setSelectedLoanId}>
                    <SelectTrigger><SelectValue placeholder="Select a loan" /></SelectTrigger>
                    <SelectContent>
                      {activeLoans.length === 0 ? (
                        <SelectItem value="none" disabled>No active loans</SelectItem>
                      ) : (
                        activeLoans.map(loan => (
                          <SelectItem key={loan.id} value={loan.id}>
                            {loan.loan_type.charAt(0).toUpperCase() + loan.loan_type.slice(1)} Loan - ₦{loan.outstanding_balance.toLocaleString("en-NG")} outstanding
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.loan && <p className="text-sm text-destructive">{errors.loan}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <RadioGroup value={paymentType} onValueChange={setPaymentType} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="full" id="full" />
                      <Label htmlFor="full" className="font-normal cursor-pointer">Full Payment</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="partial" id="partial" />
                      <Label htmlFor="partial" className="font-normal cursor-pointer">Partial Payment</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Amount */}
            {(depositType !== "loan_repayment" || paymentType === "partial" || !selectedLoanId) && depositType && (
              <div className="space-y-2">
                <Label>Amount Deposited <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₦</span>
                  <Input
                    type="number"
                    placeholder="Enter amount in Naira"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8"
                    min="0"
                  />
                </div>
                {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
              </div>
            )}

            {/* Full payment amount display */}
            {depositType === "loan_repayment" && paymentType === "full" && selectedLoanId && (
              <div className="space-y-2">
                <Label>Amount (Full Outstanding Balance)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₦</span>
                  <Input value={amount} readOnly className="pl-8 bg-muted" />
                </div>
              </div>
            )}

            {/* Receipt Upload */}
            <div className="space-y-2">
              <Label>Upload Transaction Receipt <span className="text-destructive">*</span></Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="receipt-upload"
                />
                <label htmlFor="receipt-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {receiptFile ? receiptFile.name : "Click to upload JPG, PNG or PDF (max 5MB)"}
                  </span>
                </label>
                {receiptPreview && (
                  <img src={receiptPreview} alt="Receipt preview" className="mt-3 max-h-32 mx-auto rounded-md" />
                )}
                {receiptFile && !receiptPreview && (
                  <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> PDF file selected
                  </p>
                )}
              </div>
              {errors.receipt && <p className="text-sm text-destructive">{errors.receipt}</p>}
            </div>

            {/* Reference Number */}
            <div className="space-y-2">
              <Label>Transaction Reference Number <span className="text-muted-foreground text-xs">(Optional)</span></Label>
              <Input
                placeholder="e.g., FBN/12345/2024"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Additional Notes <span className="text-muted-foreground text-xs">(Optional)</span></Label>
              <Textarea
                placeholder="Any additional information"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-[hsl(216,100%,50%)] hover:bg-[hsl(216,100%,40%)] text-white">
            {submitting ? "Submitting..." : "Submit Deposit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MakeDepositModal;
