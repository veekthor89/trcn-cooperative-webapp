import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft } from "lucide-react";

interface LoanTypeConfig {
  max: number;
  min: number;
  requirePurpose: boolean;
}

const LOAN_TYPES: Record<string, LoanTypeConfig> = {
  normal: { max: 150000, min: 50000, requirePurpose: false },
  trade: { max: 200000, min: 50000, requirePurpose: false },
  special: { max: 3000000, min: 50000, requirePurpose: false },
  long_term: { max: 5000000, min: 50000, requirePurpose: true },
};

const NIGERIAN_BANKS = [
  "Access Bank", "Citibank", "Ecobank", "Fidelity Bank", "First Bank of Nigeria",
  "First City Monument Bank", "Globus Bank", "Guaranty Trust Bank", "Heritage Bank",
  "Keystone Bank", "Polaris Bank", "Providus Bank", "Stanbic IBTC Bank",
  "Standard Chartered Bank", "Sterling Bank", "Union Bank", "United Bank for Africa",
  "Unity Bank", "Wema Bank", "Zenith Bank"
];

export default function LoanApplication() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Applicant info (auto-filled)
  const [profile, setProfile] = useState<any>(null);
  const [existingLoans, setExistingLoans] = useState<any[]>([]);

  // Form data
  const [loanType, setLoanType] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [repaymentPeriod, setRepaymentPeriod] = useState("");
  const [purpose, setPurpose] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  
  const [guarantor1Name, setGuarantor1Name] = useState("");
  const [guarantor1MemberNumber, setGuarantor1MemberNumber] = useState("");
  const [guarantor1Phone, setGuarantor1Phone] = useState("");
  const [guarantor2Name, setGuarantor2Name] = useState("");
  const [guarantor2MemberNumber, setGuarantor2MemberNumber] = useState("");
  const [guarantor2Phone, setGuarantor2Phone] = useState("");

  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("");

  const [terms1, setTerms1] = useState(false);
  const [terms2, setTerms2] = useState(false);
  const [terms3, setTerms3] = useState(false);
  const [terms4, setTerms4] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Auto-fill bank details
      if (profileData.bank_name) setBankName(profileData.bank_name);
      if (profileData.account_number) setAccountNumber(profileData.account_number);
      if (profileData.account_name) setAccountName(profileData.account_name);

      // Fetch existing loans
      const { data: loansData } = await supabase
        .from("loans")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active");

      setExistingLoans(loansData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Real-time calculations
  const calculations = {
    interest: loanAmount ? parseFloat(loanAmount) * 0.1 : 0,
    amountReceived: loanAmount ? parseFloat(loanAmount) - (parseFloat(loanAmount) * 0.1) : 0,
    totalRepay: loanAmount ? parseFloat(loanAmount) : 0,
    monthlyPayment: loanAmount && repaymentPeriod ? parseFloat(loanAmount) / parseInt(repaymentPeriod) : 0,
  };

  // Calculate remaining capacity
  const totalExistingMonthly = existingLoans.reduce((sum, loan) => sum + (loan.monthly_payment || 0), 0);
  const maxAllowedMonthly = monthlyIncome ? parseFloat(monthlyIncome) * 0.4 : 0;
  const remainingCapacity = maxAllowedMonthly - totalExistingMonthly;

  const validateForm = async () => {
    const newErrors: Record<string, string> = {};

    // Loan details validation
    if (!loanType) newErrors.loanType = "Please select a loan type";
    if (!loanAmount) {
      newErrors.loanAmount = "Please enter loan amount";
    } else {
      const amount = parseFloat(loanAmount);
      const config = LOAN_TYPES[loanType];
      if (config) {
        if (amount < config.min) newErrors.loanAmount = `Minimum amount is ₦${config.min.toLocaleString()}`;
        if (amount > config.max) newErrors.loanAmount = `Maximum amount for ${loanType} loan is ₦${config.max.toLocaleString()}`;
      }
    }
    if (!repaymentPeriod) newErrors.repaymentPeriod = "Please select repayment period";
    if (loanType === "long_term" && (!purpose || purpose.length < 20)) {
      newErrors.purpose = "Purpose is required for long term loans (minimum 20 characters)";
    }

    // Monthly income validation
    if (!monthlyIncome) {
      newErrors.monthlyIncome = "Please enter your monthly income";
    } else if (calculations.monthlyPayment > remainingCapacity) {
      newErrors.monthlyIncome = "Loan payment exceeds your remaining capacity (40% rule)";
    }

    // Guarantor validation
    if (!guarantor1Name || !guarantor1MemberNumber || !guarantor1Phone) {
      newErrors.guarantor1 = "Please complete all guarantor 1 details";
    }
    if (!guarantor2Name || !guarantor2MemberNumber || !guarantor2Phone) {
      newErrors.guarantor2 = "Please complete all guarantor 2 details";
    }

    if (guarantor1MemberNumber === guarantor2MemberNumber) {
      newErrors.guarantor2 = "Guarantors must be different members";
    }

    if (guarantor1MemberNumber === profile?.staff_id || guarantor2MemberNumber === profile?.staff_id) {
      newErrors.guarantor1 = "You cannot be your own guarantor";
    }

    // Validate guarantors exist
    if (guarantor1MemberNumber) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("staff_id", guarantor1MemberNumber)
        .single();
      if (!data) newErrors.guarantor1 = "Guarantor 1 member number not found";
    }

    if (guarantor2MemberNumber) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("staff_id", guarantor2MemberNumber)
        .single();
      if (!data) newErrors.guarantor2 = "Guarantor 2 member number not found";
    }

    // Bank details validation
    if (!bankName) newErrors.bankName = "Please select your bank";
    if (!accountNumber || accountNumber.length !== 10) {
      newErrors.accountNumber = "Account number must be 10 digits";
    }
    if (!accountName) newErrors.accountName = "Please enter account name";
    if (!accountType) newErrors.accountType = "Please select account type";

    // Terms validation
    if (!terms1 || !terms2 || !terms3 || !terms4) {
      newErrors.terms = "You must accept all terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (isDraft = false) => {
    if (!isDraft && !(await validateForm())) {
      toast({
        title: "Validation Error",
        description: "Please fix all errors before submitting",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmDialog(false);
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("loan_applications")
        .insert([{
          user_id: user.id,
          loan_type: loanType as any,
          requested_amount: parseFloat(loanAmount),
          repayment_period: parseInt(repaymentPeriod),
          purpose: purpose || null,
          monthly_income: parseFloat(monthlyIncome),
          interest_amount: calculations.interest,
          amount_received: calculations.amountReceived,
          monthly_payment: calculations.monthlyPayment,
          guarantor_1_name: guarantor1Name,
          guarantor_1_member_number: guarantor1MemberNumber,
          guarantor_1_phone: guarantor1Phone,
          guarantor_2_name: guarantor2Name,
          guarantor_2_member_number: guarantor2MemberNumber,
          guarantor_2_phone: guarantor2Phone,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          account_type: accountType,
          terms_accepted: !isDraft,
          draft: isDraft,
          status: isDraft ? "pending" : "pending" as any,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: isDraft ? "Draft Saved" : "Application Submitted",
        description: isDraft 
          ? "Your loan application has been saved as draft" 
          : `Your loan application (ID: ${data.id.slice(0, 8)}) has been submitted successfully`,
      });

      navigate("/loans");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = () => {
    return loanType && loanAmount && repaymentPeriod && 
           (loanType !== "long_term" || (purpose && purpose.length >= 20)) &&
           monthlyIncome && guarantor1Name && guarantor1MemberNumber && guarantor1Phone &&
           guarantor2Name && guarantor2MemberNumber && guarantor2Phone &&
           bankName && accountNumber && accountName && accountType &&
           terms1 && terms2 && terms3 && terms4;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/loans")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Loan Application</h1>
            <p className="text-muted-foreground">Complete the form below to apply for a loan</p>
          </div>
        </div>

        {/* Applicant Info */}
        <Card>
          <CardHeader>
            <CardTitle>1. Applicant Information</CardTitle>
            <CardDescription>Auto-filled from your profile</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input value={profile?.full_name || ""} disabled />
            </div>
            <div>
              <Label>Member Number</Label>
              <Input value={profile?.staff_id || ""} disabled />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={profile?.email || ""} disabled />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={profile?.phone || ""} disabled />
            </div>
          </CardContent>
        </Card>

        {/* Loan Request Details */}
        <Card>
          <CardHeader>
            <CardTitle>2. Loan Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="loanType">Loan Type *</Label>
              <Select value={loanType} onValueChange={setLoanType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select loan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal (Max ₦150,000)</SelectItem>
                  <SelectItem value="trade">Trade (Max ₦200,000)</SelectItem>
                  <SelectItem value="special">Special (Max ₦3,000,000)</SelectItem>
                  <SelectItem value="long_term">Long Term (Max ₦5,000,000)</SelectItem>
                </SelectContent>
              </Select>
              {errors.loanType && <p className="text-sm text-destructive mt-1">{errors.loanType}</p>}
            </div>

            <div>
              <Label htmlFor="loanAmount">Loan Amount (₦) *</Label>
              <Input
                id="loanAmount"
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                placeholder="50000 - 5000000"
              />
              {errors.loanAmount && <p className="text-sm text-destructive mt-1">{errors.loanAmount}</p>}
            </div>

            <div>
              <Label htmlFor="repaymentPeriod">Repayment Period *</Label>
              <Select value={repaymentPeriod} onValueChange={setRepaymentPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                  <SelectItem value="18">18 months</SelectItem>
                  <SelectItem value="24">24 months</SelectItem>
                  <SelectItem value="36">36 months</SelectItem>
                </SelectContent>
              </Select>
              {errors.repaymentPeriod && <p className="text-sm text-destructive mt-1">{errors.repaymentPeriod}</p>}
            </div>

            {loanType === "long_term" && (
              <div>
                <Label htmlFor="purpose">Purpose (Required for Long Term Loans) *</Label>
                <Textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Minimum 20 characters"
                  rows={4}
                />
                <p className="text-sm text-muted-foreground mt-1">{purpose.length}/20 characters</p>
                {errors.purpose && <p className="text-sm text-destructive mt-1">{errors.purpose}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Real-time Calculations */}
        <Card>
          <CardHeader>
            <CardTitle>3. Loan Breakdown</CardTitle>
            <CardDescription>Auto-calculated based on your inputs</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Interest (10%)</Label>
              <div className="text-2xl font-bold">₦{calculations.interest.toLocaleString()}</div>
            </div>
            <div>
              <Label>Amount You'll Receive</Label>
              <div className="text-2xl font-bold text-primary">₦{calculations.amountReceived.toLocaleString()}</div>
            </div>
            <div>
              <Label>Total to Repay</Label>
              <div className="text-2xl font-bold">₦{calculations.totalRepay.toLocaleString()}</div>
            </div>
            <div>
              <Label>Monthly Payment</Label>
              <div className="text-2xl font-bold">₦{calculations.monthlyPayment.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle>4. Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="monthlyIncome">Monthly Income (after deductions) *</Label>
              <Input
                id="monthlyIncome"
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                placeholder="Enter your monthly income"
              />
              {errors.monthlyIncome && <p className="text-sm text-destructive mt-1">{errors.monthlyIncome}</p>}
            </div>

            {existingLoans.length > 0 && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Existing Loans</h4>
                {existingLoans.map((loan) => (
                  <div key={loan.id} className="flex justify-between text-sm mb-1">
                    <span>{loan.loan_type}</span>
                    <span>₦{loan.monthly_payment?.toLocaleString()}/month</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total Existing Monthly:</span>
                    <span>₦{totalExistingMonthly.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Max Allowed (40%):</span>
                    <span>₦{maxAllowedMonthly.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold mt-1">
                    <span>Remaining Capacity:</span>
                    <span className={remainingCapacity < calculations.monthlyPayment ? "text-destructive" : "text-primary"}>
                      ₦{remainingCapacity.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guarantor Details */}
        <Card>
          <CardHeader>
            <CardTitle>5. Guarantor Details</CardTitle>
            <CardDescription>Two guarantors required</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-semibold">Guarantor 1 *</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={guarantor1Name} onChange={(e) => setGuarantor1Name(e.target.value)} />
                </div>
                <div>
                  <Label>Member Number</Label>
                  <Input value={guarantor1MemberNumber} onChange={(e) => setGuarantor1MemberNumber(e.target.value)} />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input value={guarantor1Phone} onChange={(e) => setGuarantor1Phone(e.target.value)} />
                </div>
              </div>
              {errors.guarantor1 && <p className="text-sm text-destructive">{errors.guarantor1}</p>}
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Guarantor 2 *</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={guarantor2Name} onChange={(e) => setGuarantor2Name(e.target.value)} />
                </div>
                <div>
                  <Label>Member Number</Label>
                  <Input value={guarantor2MemberNumber} onChange={(e) => setGuarantor2MemberNumber(e.target.value)} />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input value={guarantor2Phone} onChange={(e) => setGuarantor2Phone(e.target.value)} />
                </div>
              </div>
              {errors.guarantor2 && <p className="text-sm text-destructive">{errors.guarantor2}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Bank Account */}
        <Card>
          <CardHeader>
            <CardTitle>6. Bank Account Details</CardTitle>
            <CardDescription>Auto-filled from profile, editable</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bankName">Bank Name *</Label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_BANKS.map((bank) => (
                      <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bankName && <p className="text-sm text-destructive mt-1">{errors.bankName}</p>}
              </div>

              <div>
                <Label htmlFor="accountNumber">Account Number *</Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  maxLength={10}
                  placeholder="10 digits"
                />
                {errors.accountNumber && <p className="text-sm text-destructive mt-1">{errors.accountNumber}</p>}
              </div>

              <div>
                <Label htmlFor="accountName">Account Name *</Label>
                <Input
                  id="accountName"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
                {errors.accountName && <p className="text-sm text-destructive mt-1">{errors.accountName}</p>}
              </div>

              <div>
                <Label htmlFor="accountType">Account Type *</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                  </SelectContent>
                </Select>
                {errors.accountType && <p className="text-sm text-destructive mt-1">{errors.accountType}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms & Conditions */}
        <Card>
          <CardHeader>
            <CardTitle>7. Terms & Conditions</CardTitle>
            <CardDescription>All checkboxes must be checked to proceed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox id="terms1" checked={terms1} onCheckedChange={(checked) => setTerms1(checked === true)} />
              <Label htmlFor="terms1" className="text-sm leading-relaxed cursor-pointer">
                I confirm that all information provided is accurate and complete
              </Label>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox id="terms2" checked={terms2} onCheckedChange={(checked) => setTerms2(checked === true)} />
              <Label htmlFor="terms2" className="text-sm leading-relaxed cursor-pointer">
                I understand that this loan carries a 10% interest rate
              </Label>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox id="terms3" checked={terms3} onCheckedChange={(checked) => setTerms3(checked === true)} />
              <Label htmlFor="terms3" className="text-sm leading-relaxed cursor-pointer">
                I authorize the cooperative to deduct monthly payments from my salary
              </Label>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox id="terms4" checked={terms4} onCheckedChange={(checked) => setTerms4(checked === true)} />
              <Label htmlFor="terms4" className="text-sm leading-relaxed cursor-pointer">
                I have read and agree to the{" "}
                <a href="#" className="text-primary underline">full terms and conditions</a>
              </Label>
            </div>
            {errors.terms && <p className="text-sm text-destructive">{errors.terms}</p>}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={submitting}
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={!isFormValid() || submitting}
            className="flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Loan Application</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Please review your application details:</p>
              <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Loan Type:</span>
                  <span className="font-semibold">{loanType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Loan Amount:</span>
                  <span className="font-semibold">₦{parseFloat(loanAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount to Receive:</span>
                  <span className="font-semibold text-primary">₦{calculations.amountReceived.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Payment:</span>
                  <span className="font-semibold">₦{calculations.monthlyPayment.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Period:</span>
                  <span className="font-semibold">{repaymentPeriod} months</span>
                </div>
              </div>
              <p className="text-muted-foreground text-xs mt-4">
                By clicking "Confirm & Submit", you agree that all information provided is accurate and you accept the loan terms.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit(false)}>
              Confirm & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
