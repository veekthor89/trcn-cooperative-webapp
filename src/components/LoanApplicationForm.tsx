import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2, Info, AlertTriangle } from "lucide-react";
import GuarantorAutocomplete from "@/components/GuarantorAutocomplete";

interface LoanTypeConfig {
  max: number;
  min: number;
  maxPeriod: number;
  interestRate: number;
  requirePurpose: boolean;
}

const LOAN_TYPES: Record<string, LoanTypeConfig> = {
  special: { max: 150000, min: 10000, maxPeriod: 6, interestRate: 0.105, requirePurpose: false },
  trade: { max: 400000, min: 10000, maxPeriod: 8, interestRate: 0.075, requirePurpose: false },
  normal: { max: 3000000, min: 10000, maxPeriod: 36, interestRate: 0.1, requirePurpose: false },
  housing: { max: 7000000, min: 10000, maxPeriod: 84, interestRate: 0.1, requirePurpose: true },
};

const NIGERIAN_BANKS = [
  "Access Bank", "Citibank", "Ecobank", "Fidelity Bank", "First Bank of Nigeria",
  "First City Monument Bank", "Globus Bank", "Guaranty Trust Bank", "Heritage Bank",
  "Keystone Bank", "Polaris Bank", "Providus Bank", "Stanbic IBTC Bank",
  "Standard Chartered Bank", "Sterling Bank", "Union Bank", "United Bank for Africa",
  "Unity Bank", "Wema Bank", "Zenith Bank"
];

interface LoanApplicationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function LoanApplicationForm({ onSuccess, onCancel }: LoanApplicationFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [profile, setProfile] = useState<any>(null);
  const [existingLoans, setExistingLoans] = useState<any[]>([]);

  const [loanType, setLoanType] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [repaymentPeriod, setRepaymentPeriod] = useState("");
  const [purpose, setPurpose] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  
  const [guarantor1, setGuarantor1] = useState<any>(null);
  const [guarantor2, setGuarantor2] = useState<any>(null);

  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("");

  const [terms1, setTerms1] = useState(false);
  const [terms2, setTerms2] = useState(false);
  const [terms3, setTerms3] = useState(false);
  const [terms4, setTerms4] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      if (profileData.bank_name) setBankName(profileData.bank_name);
      if (profileData.account_number) setAccountNumber(profileData.account_number);
      if (profileData.account_name) setAccountName(profileData.account_name);

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

  const loanConfig = loanType ? LOAN_TYPES[loanType] : null;
  const interestRate = loanConfig?.interestRate || 0.1;
  const adminCharge = 200;
  
  // Calculate based on loan type
  // Normal loan: Interest deducted upfront
  // Special, Trade, Housing: Interest added to loan amount
  const principal = loanAmount ? parseFloat(loanAmount) : 0;
  const interest = principal * interestRate;
  
  const calculations = {
    interest: interest,
    amountReceived: loanType === 'normal' ? principal - interest : principal,
    totalRepay: loanType === 'normal' ? principal : principal + interest,
    monthlyPayment: loanAmount && repaymentPeriod ? 
      (loanType === 'normal' ? principal : principal + interest) / parseInt(repaymentPeriod) : 0,
    adminCharge: adminCharge,
  };

  const totalExistingMonthly = existingLoans.reduce((sum, loan) => sum + (loan.monthly_payment || 0), 0);
  const maxAllowedMonthly = monthlyIncome ? parseFloat(monthlyIncome) * 0.2 : 0;
  const remainingCapacity = maxAllowedMonthly - totalExistingMonthly;
  const newTotalMonthly = totalExistingMonthly + calculations.monthlyPayment;
  const exceeds20Percent = newTotalMonthly > maxAllowedMonthly;

  const getPeriodOptions = () => {
    if (!loanType) return [];
    const maxPeriod = LOAN_TYPES[loanType].maxPeriod;
    
    // Special handling for different loan types
    if (loanType === 'special') {
      return [3, 6]; // Only 3 and 6 months
    }
    if (loanType === 'trade') {
      return [3, 6, 8]; // 3, 6, and 8 months
    }
    if (loanType === 'housing') {
      const housingPeriods = [3, 6, 12, 24, 36, 48, 60, 72, 84];
      return housingPeriods.filter(p => p <= maxPeriod);
    }
    // Normal loan - multiples of 3 up to 36 months
    const options = [];
    for (let i = 3; i <= maxPeriod; i += 3) {
      options.push(i);
    }
    return options;
  };

  const validateForm = async () => {
    const newErrors: Record<string, string> = {};

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
    if (loanType === "housing" && (!purpose || purpose.length < 20)) {
      newErrors.purpose = "Purpose is required for housing loans (minimum 20 characters)";
    }

    if (existingLoans.length >= 3) {
      newErrors.loanType = "You already have 3 active loans. Maximum allowed is 3.";
    }

    if (!monthlyIncome) {
      newErrors.monthlyIncome = "Please enter your monthly income";
    }

    if (!guarantor1) {
      newErrors.guarantor1 = "Please select guarantor 1";
    }
    if (!guarantor2) {
      newErrors.guarantor2 = "Please select guarantor 2";
    }

    if (guarantor1 && guarantor2 && guarantor1.id === guarantor2.id) {
      newErrors.guarantor2 = "Guarantors must be different members";
    }

    if (!bankName) newErrors.bankName = "Please select your bank";
    if (!accountNumber || accountNumber.length !== 10) {
      newErrors.accountNumber = "Account number must be 10 digits";
    }
    if (!accountName) newErrors.accountName = "Please enter account name";
    if (!accountType) newErrors.accountType = "Please select account type";

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
          guarantor_1_name: guarantor1?.full_name || "",
          guarantor_1_member_number: guarantor1?.member_number || "",
          guarantor_1_phone: guarantor1?.phone || "",
          guarantor_2_name: guarantor2?.full_name || "",
          guarantor_2_member_number: guarantor2?.member_number || "",
          guarantor_2_phone: guarantor2?.phone || "",
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

      // If not draft, send guarantor approval requests
      if (!isDraft && data) {
        const guarantorPromises = [];

        // Send notification to Guarantor 1
        if (guarantor1?.id) {
          const approval1 = supabase.from("loan_guarantor_approvals").insert({
            loan_application_number: data.id,
            guarantor_user_id: guarantor1.id,
            guarantor_position: 1,
            loan_amount: parseFloat(loanAmount),
            loan_type: loanType as any,
            guarantor_member_id: guarantor1.member_number,
            guarantor_name: guarantor1.full_name,
            applicant_member_id: profile?.member_number,
            applicant_name: profile?.full_name,
            status: "pending",
          });

          const notification1 = supabase.from("notifications").insert({
            user_id: guarantor1.id,
            type: "guarantor_request",
            message: `${profile?.full_name} (${profile?.member_number}) has requested you to be a guarantor for their ${loanType} loan of ₦${parseFloat(loanAmount).toLocaleString()}. Please review and respond.`,
          });

          guarantorPromises.push(approval1, notification1);
        }

        // Send notification to Guarantor 2
        if (guarantor2?.id) {
          const approval2 = supabase.from("loan_guarantor_approvals").insert({
            loan_application_number: data.id,
            guarantor_user_id: guarantor2.id,
            guarantor_position: 2,
            loan_amount: parseFloat(loanAmount),
            loan_type: loanType as any,
            guarantor_member_id: guarantor2.member_number,
            guarantor_name: guarantor2.full_name,
            applicant_member_id: profile?.member_number,
            applicant_name: profile?.full_name,
            status: "pending",
          });

          const notification2 = supabase.from("notifications").insert({
            user_id: guarantor2.id,
            type: "guarantor_request",
            message: `${profile?.full_name} (${profile?.member_number}) has requested you to be a guarantor for their ${loanType} loan of ₦${parseFloat(loanAmount).toLocaleString()}. Please review and respond.`,
          });

          guarantorPromises.push(approval2, notification2);
        }

        if (guarantorPromises.length > 0) {
          await Promise.all(guarantorPromises);
        }
      }

      toast({
        title: isDraft ? "Draft Saved" : "Application Submitted",
        description: isDraft 
          ? "Your loan application has been saved as draft" 
          : `Your loan application has been submitted successfully. Guarantors have been notified.`,
      });

      onSuccess();
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
           (loanType !== "housing" || (purpose && purpose.length >= 20)) &&
           monthlyIncome && guarantor1 && guarantor2 &&
           bankName && accountNumber && accountName && accountType &&
           terms1 && terms2 && terms3 && terms4 &&
           existingLoans.length < 3;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          {existingLoans.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You have {existingLoans.length} active loan(s). You can have up to 3 active loans.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="loanType">Loan Type *</Label>
            <Select value={loanType} onValueChange={(value) => {
              setLoanType(value);
              setRepaymentPeriod("");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select loan type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="special">Special Loan (Max ₦150,000, 6 months, 10.5%)</SelectItem>
                <SelectItem value="trade">Trade Loan (Max ₦400,000, 8 months, 7.5%)</SelectItem>
                <SelectItem value="normal">Normal Loan (Max ₦3,000,000, 36 months, 10%)</SelectItem>
                <SelectItem value="housing">Land/Housing Loan (Max ₦7,000,000, 84 months, 10%)</SelectItem>
              </SelectContent>
            </Select>
            {errors.loanType && <p className="text-sm text-destructive mt-1">{errors.loanType}</p>}
            
            {loanConfig && (
              <div className="mt-2 p-3 bg-muted rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum Amount:</span>
                  <span className="font-semibold">₦{loanConfig.max.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum Period:</span>
                  <span className="font-semibold">{loanConfig.maxPeriod} months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interest Rate:</span>
                  <span className="font-semibold">{loanConfig.interestRate * 100}%</span>
                </div>
              </div>
            )}
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
            <Select 
              value={repaymentPeriod} 
              onValueChange={setRepaymentPeriod}
              disabled={!loanType}
            >
              <SelectTrigger>
                <SelectValue placeholder={loanType ? "Select period" : "Select loan type first"} />
              </SelectTrigger>
              <SelectContent>
                {getPeriodOptions().map((months) => (
                  <SelectItem key={months} value={months.toString()}>
                    {months} months {months >= 12 ? `(${(months / 12).toFixed(1)} years)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.repaymentPeriod && <p className="text-sm text-destructive mt-1">{errors.repaymentPeriod}</p>}
          </div>

          {loanType === "housing" && (
            <div>
              <Label htmlFor="purpose">Purpose (Required for Housing Loans) *</Label>
              <Textarea
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Describe your land/housing project (minimum 20 characters)"
                rows={4}
              />
              <p className="text-sm text-muted-foreground mt-1">{purpose.length}/20 characters</p>
              {errors.purpose && <p className="text-sm text-destructive mt-1">{errors.purpose}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>3. Loan Breakdown</CardTitle>
          <CardDescription>Auto-calculated based on your inputs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Loan Amount Requested</Label>
              <div className="text-2xl font-bold">₦{principal.toLocaleString()}</div>
            </div>
            <div>
              <Label>Interest ({(interestRate * 100)}%)</Label>
              <div className="text-2xl font-bold">₦{calculations.interest.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {loanType === 'normal' ? 'Deducted upfront' : 'Added to repayment'}
              </p>
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
            <div>
              <Label>Admin Charge</Label>
              <div className="text-2xl font-bold">₦{calculations.adminCharge.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Deducted from 1st payment</p>
            </div>
          </div>

          {monthlyIncome && calculations.monthlyPayment > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Salary Deduction Percentage</span>
                <span className={exceeds20Percent ? "text-destructive font-semibold" : ""}>
                  {((newTotalMonthly / parseFloat(monthlyIncome)) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={(newTotalMonthly / parseFloat(monthlyIncome)) * 100} 
                className="h-2"
              />
              {exceeds20Percent && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Warning: Total monthly loan deductions ({((newTotalMonthly / parseFloat(monthlyIncome)) * 100).toFixed(1)}%) 
                    exceed the recommended 20% of salary capacity.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
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
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h4 className="font-semibold">Existing Active Loans ({existingLoans.length}/3)</h4>
              {existingLoans.map((loan) => (
                <div key={loan.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{loan.loan_type}</span>
                    <span>₦{loan.monthly_payment?.toLocaleString()}/month</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Balance: ₦{loan.outstanding_balance?.toLocaleString()}</span>
                    <span>{loan.repayment_period} months</span>
                  </div>
                </div>
              ))}
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Total Monthly Deduction:</span>
                  <span>₦{totalExistingMonthly.toLocaleString()}</span>
                </div>
                {calculations.monthlyPayment > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>New Loan Payment:</span>
                    <span>₦{calculations.monthlyPayment.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-primary">
                  <span>New Total:</span>
                  <span>₦{newTotalMonthly.toLocaleString()}</span>
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
          <CardDescription>
            Search and select two guarantors. They will receive approval requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <GuarantorAutocomplete
            label="Guarantor 1 *"
            value={guarantor1}
            onChange={setGuarantor1}
            excludeUserIds={[profile?.id, guarantor2?.id].filter(Boolean)}
            error={errors.guarantor1}
          />

          <GuarantorAutocomplete
            label="Guarantor 2 *"
            value={guarantor2}
            onChange={setGuarantor2}
            excludeUserIds={[profile?.id, guarantor1?.id].filter(Boolean)}
            error={errors.guarantor2}
          />
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
    </div>
  );
}
