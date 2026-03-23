import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MAX_SHARES = 3500;
const PRICE_PER_SHARE = 25;

const formSchema = z.object({
  sharesRequested: z.number().min(1, "Must request at least 1 share"),
  paymentMethod: z.enum(["cash_deposit", "bank_transfer"]),
  paymentReference: z.string().optional(),
  termsAccepted: z.boolean().refine((val) => val === true, "You must accept the terms"),
  declaration1: z.boolean().refine((val) => val === true, "This declaration is required"),
  declaration2: z.boolean().refine((val) => val === true, "This declaration is required"),
  declaration3: z.boolean().refine((val) => val === true, "This declaration is required")
});

type FormData = z.infer<typeof formSchema>;

interface ShareSubscriptionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ShareSubscriptionForm({ onSuccess, onCancel }: ShareSubscriptionFormProps) {
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentShares, setCurrentShares] = useState<any>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState("");

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sharesRequested: 1,
      paymentMethod: "cash_deposit",
      termsAccepted: false,
      declaration1: false,
      declaration2: false,
      declaration3: false
    }
  });

  const sharesRequested = watch("sharesRequested") || 0;
  const paymentMethod = watch("paymentMethod");

  const currentSharesOwned = currentShares?.total_shares || 0;
  const totalCost = sharesRequested * PRICE_PER_SHARE;
  const newTotalShares = currentSharesOwned + sharesRequested;
  const remainingCapacity = MAX_SHARES - newTotalShares;

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.
      from("profiles").
      select("*").
      eq("id", user.id).
      single();

      setUserProfile(profile);

      const { data: shares } = await supabase.
      from("shares").
      select("*").
      eq("user_id", user.id).
      single();

      setCurrentShares(shares || { total_shares: 0, current_value: 0 });
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProofFile(e.target.files[0]);
    }
  };

  const uploadPaymentProof = async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `payment-proofs/${fileName}`;

    const { error: uploadError } = await supabase.storage.
    from("profile-photos").
    upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: signedUrlData } = await supabase.storage.
    from("profile-photos").
    createSignedUrl(filePath, 3600);

    if (!signedUrlData?.signedUrl) throw new Error("Failed to get signed URL");
    return signedUrlData.signedUrl;
  };

  const onSubmit = async (data: FormData) => {
    if (newTotalShares > MAX_SHARES) {
      toast.error(`Total shares cannot exceed ${MAX_SHARES}`);
      return;
    }

    if ((paymentMethod === "cash_deposit" || paymentMethod === "bank_transfer") && !paymentProofFile) {
      toast.error("Please upload payment proof");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check for active applications
      const { data: activeApps } = await supabase.
      from("share_subscriptions").
      select("id").
      eq("user_id", user.id).
      in("status", ["pending", "payment_verified"]).
      maybeSingle();

      if (activeApps) {
        toast.error("You already have an active application. Please wait for it to be processed.");
        setLoading(false);
        return;
      }

      let paymentProofUrl = "";
      if (paymentProofFile) {
        paymentProofUrl = await uploadPaymentProof(paymentProofFile);
      }

      const { data: subscription, error } = await supabase.
      from("share_subscriptions").
      insert({
        user_id: user.id,
        application_number: "",
        shares_requested: data.sharesRequested,
        price_per_share: PRICE_PER_SHARE,
        total_cost: totalCost,
        current_shares_before: currentSharesOwned,
        shares_after: newTotalShares,
        payment_method: data.paymentMethod,
        payment_reference: data.paymentReference || null,
        payment_proof_url: paymentProofUrl || null,
        deduction_months: null,
        monthly_deduction_amount: null,
        status: "pending",
        terms_accepted: data.termsAccepted,
        declaration_1: data.declaration1,
        declaration_2: data.declaration2,
        declaration_3: data.declaration3
      }).
      select().
      single();

      if (error) throw error;

      // Create initial payment record
      await supabase.from("share_subscription_payments").insert({
        subscription_id: subscription.id,
        amount: totalCost,
        payment_type: "initial",
        reference_number: data.paymentReference || null,
        status: "pending"
      });

      // Create notification
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "share_application",
        message: `Your share subscription application ${subscription.application_number} has been submitted successfully.`
      });

      setApplicationNumber(subscription.application_number);
      setShowSuccess(true);
      toast.success("Application submitted successfully!");

      setTimeout(() => {
        onSuccess?.();
      }, 3000);
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="p-6 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
          <p className="text-muted-foreground">Application Number: <span className="font-semibold">{applicationNumber}</span></p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shares Requested:</span>
              <span className="font-semibold">{sharesRequested}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Cost:</span>
              <span className="font-semibold">₦{totalCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="font-semibold capitalize">{paymentMethod?.replace("_", " ")}</span>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Next Steps:</strong></p>
          <ol className="list-decimal list-inside space-y-1 text-left">
            <li>Your application will be reviewed by the admin</li>
            <li>Payment will be verified</li>
            <li>Upon approval, shares will be allocated to your account</li>
            <li>You'll receive a share certificate</li>
          </ol>
        </div>
      </div>);

  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Member Information */}
      <Card>
        <CardHeader>
          <CardTitle>Member Information</CardTitle>
          <CardDescription>Your details from profile</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Full Name</Label>
            <Input value={userProfile?.full_name || ""} disabled />
          </div>
          <div>
            <Label>TRCN Number</Label>
            <Input value={userProfile?.member_number || "N/A"} disabled />
          </div>
          <div>
            <Label>Department</Label>
            <Input value={userProfile?.department || "N/A"} disabled />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input value={userProfile?.phone || "N/A"} disabled />
          </div>
          <div className="col-span-2">
            <Label>Address</Label>
            <Input value={userProfile?.address || "N/A"} disabled />
          </div>
        </CardContent>
      </Card>

      {/* Current Share Holdings */}
      <Card>
        <CardHeader>
          <CardTitle>Current Share Holdings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Shares Owned</Label>
              <p className="text-2xl font-bold">{currentSharesOwned}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Current Value</Label>
              <p className="text-2xl font-bold">₦{(currentSharesOwned * PRICE_PER_SHARE).toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Maximum Allowed</Label>
              <p className="text-2xl font-bold">{MAX_SHARES}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Available to Purchase</Label>
              <p className="text-2xl font-bold">{MAX_SHARES - currentSharesOwned}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Purchase Request */}
      <Card>
        <CardHeader>
          <CardTitle>Share Purchase Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Number of Shares *</Label>
            <Input
              type="number"
              min={1}
              max={MAX_SHARES - currentSharesOwned}
              {...register("sharesRequested", { valueAsNumber: true })} />
            
            {errors.sharesRequested &&
            <p className="text-sm text-destructive mt-1">{errors.sharesRequested.message}</p>
            }
          </div>

          <Separator />

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-semibold">Calculation Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span>Shares Requested:</span>
              <span className="font-semibold">{sharesRequested}</span>
              <span>Price per Share:</span>
              <span className="font-semibold">₦{PRICE_PER_SHARE.toLocaleString()}</span>
              <span>Total Cost:</span>
              <span className="font-semibold text-lg">₦{totalCost.toLocaleString()}</span>
              <span>New Total Shares:</span>
              <span className="font-semibold">{newTotalShares}</span>
              <span>Remaining Capacity:</span>
              <span className={`font-semibold ${remainingCapacity < 0 ? "text-destructive" : ""}`}>
                {remainingCapacity}
              </span>
            </div>
          </div>

          {remainingCapacity < 0 &&
          <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your request exceeds the maximum allowed shares. Please reduce your request.
              </AlertDescription>
            </Alert>
          }
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Payment Method *</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setValue("paymentMethod", value as any)}>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash_deposit" id="cash" />
                <Label htmlFor="cash">Cash Deposit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank_transfer" id="transfer" />
                <Label htmlFor="transfer">Bank Transfer</Label>
              </div>
            </RadioGroup>
          </div>

          {(paymentMethod === "cash_deposit" || paymentMethod === "bank_transfer") &&
          <>
              <div>
                <Label>Reference Number *</Label>
                <Input {...register("paymentReference")} placeholder="Enter payment reference" />
              </div>
              <div>
                <Label>Upload Payment Proof *</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/*,.pdf" onChange={handleFileChange} />
                  {paymentProofFile && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                </div>
              </div>
            </>
          }

          <Alert>
            <AlertDescription>
              <strong>TRCN Account Details:</strong>
              <br />
              Bank: First Bank
              <br />
              Account Number: 2006186959
              <br />
              Account Name: TRCN Staff Multipurpose Cooperative Society
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Important Information */}
      <Card>
        <CardHeader>
          <CardTitle>Important Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc list-inside space-y-1">
            <li>Maximum of 3,500 shares per member</li>
            <li>Current share price: ₦25 per share</li>
            <li>Shares earn annual dividends based on cooperative performance</li>
            <li>Application period: Open year-round</li>
            <li>Shares are transferable subject to board approval</li>
          </ul>
        </CardContent>
      </Card>

      {/* Declaration */}
      <Card>
        <CardHeader>
          <CardTitle>Declaration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-2">
            <Checkbox id="terms" checked={watch("termsAccepted")}
            onCheckedChange={(checked) => setValue("termsAccepted", checked as boolean)} />
            
            <Label htmlFor="terms" className="text-sm leading-relaxed">
              I have read and accept the Terms and Conditions governing share ownership in TRCN Multipurpose Cooperative
            </Label>
          </div>
          {errors.termsAccepted &&
          <p className="text-sm text-destructive">{errors.termsAccepted.message}</p>
          }

          <div className="flex items-start space-x-2">
            <Checkbox
              id="dec1"
              checked={watch("declaration1")}
              onCheckedChange={(checked) => setValue("declaration1", checked as boolean)} />
            
            <Label htmlFor="dec1" className="text-sm leading-relaxed">
              I declare that all information provided is true and accurate to the best of my knowledge
            </Label>
          </div>
          {errors.declaration1 &&
          <p className="text-sm text-destructive">{errors.declaration1.message}</p>
          }

          <div className="flex items-start space-x-2">
            <Checkbox
              id="dec2"
              checked={watch("declaration2")}
              onCheckedChange={(checked) => setValue("declaration2", checked as boolean)} />
            
            <Label htmlFor="dec2" className="text-sm leading-relaxed">
              I understand that shares are subject to availability and board approval
            </Label>
          </div>
          {errors.declaration2 &&
          <p className="text-sm text-destructive">{errors.declaration2.message}</p>
          }

          <div className="flex items-start space-x-2">
            <Checkbox
              id="dec3"
              checked={watch("declaration3")}
              onCheckedChange={(checked) => setValue("declaration3", checked as boolean)} />
            
            <Label htmlFor="dec3" className="text-sm leading-relaxed">
              I commit to making payment as per the selected payment method and understand that my application is subject to payment verification
            </Label>
          </div>
          {errors.declaration3 &&
          <p className="text-sm text-destructive">{errors.declaration3.message}</p>
          }
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={loading || remainingCapacity < 0} className="flex-1">
          {loading ? "Submitting..." : "Submit Application"}
        </Button>
      </div>
    </form>);

}