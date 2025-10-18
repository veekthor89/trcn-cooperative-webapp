import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const NIGERIAN_BANKS = [
  "Access Bank", "Citibank", "Ecobank", "Fidelity Bank", "First Bank of Nigeria",
  "First City Monument Bank (FCMB)", "Globus Bank", "Guaranty Trust Bank",
  "Heritage Bank", "Keystone Bank", "Polaris Bank", "Providus Bank",
  "Stanbic IBTC Bank", "Standard Chartered", "Sterling Bank", "SunTrust Bank",
  "Union Bank", "United Bank for Africa", "Unity Bank", "Wema Bank", "Zenith Bank"
];

const PURPOSE_OPTIONS = [
  { value: "emergency_fund", label: "Emergency Fund" },
  { value: "house_purchase", label: "House Purchase" },
  { value: "car_purchase", label: "Car Purchase" },
  { value: "children_education", label: "Children's Education" },
  { value: "wedding", label: "Wedding" },
  { value: "medical", label: "Medical" },
  { value: "business_capital", label: "Business Capital" },
  { value: "end_of_year_expenses", label: "End of Year Expenses" },
  { value: "other", label: "Other" }
];

export default function SpecialContributionApplication() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [hasActiveContribution, setHasActiveContribution] = useState(false);

  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    department: "",
    state_of_assignment: "",
    monthly_amount: "",
    contribution_year: currentYear.toString(),
    purpose_category: "",
    purpose_description: "",
    bank_name: "",
    account_number: "",
    account_name: "",
    salary_deduction_auth: false,
    terms_understanding: false,
    terms_acceptance: false
  });

  useEffect(() => {
    loadProfile();
    checkActiveContribution();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setFormData(prev => ({
        ...prev,
        department: data.department || "",
        state_of_assignment: data.state_of_deployment || "",
        bank_name: data.bank_name || "",
        account_number: data.account_number || "",
        account_name: data.account_name || ""
      }));
    }
  };

  const checkActiveContribution = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("special_contributions")
      .select("id")
      .eq("user_id", user.id)
      .eq("contribution_year", currentYear)
      .in("application_status", ["pending", "approved", "active"])
      .maybeSingle();

    setHasActiveContribution(!!data);
  };

  const totalExpected = formData.monthly_amount ? parseFloat(formData.monthly_amount) * 11 : 0;
  const maturityDate = `November 30, ${formData.contribution_year}`;

  const handleSubmit = async (isDraft = false) => {
    if (hasActiveContribution && !isDraft) {
      toast({
        title: "Active Contribution Exists",
        description: `You already have an active contribution for ${currentYear}. Complete it before applying for a new one.`,
        variant: "destructive"
      });
      return;
    }

    if (!isDraft) {
      if (!formData.salary_deduction_auth || !formData.terms_understanding || !formData.terms_acceptance) {
        toast({
          title: "Authorization Required",
          description: "Please accept all authorizations before submitting.",
          variant: "destructive"
        });
        return;
      }
    }

    const amount = parseFloat(formData.monthly_amount);
    if (amount < 5000 || amount > 500000) {
      toast({
        title: "Invalid Amount",
        description: "Monthly amount must be between ₦5,000 and ₦500,000.",
        variant: "destructive"
      });
      return;
    }

    if (formData.account_number.length !== 10) {
      toast({
        title: "Invalid Account Number",
        description: "Account number must be 10 digits.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("special_contributions")
        .insert([{
          user_id: user.id,
          member_number: profile?.staff_id,
          contribution_year: parseInt(formData.contribution_year),
          monthly_amount: amount,
          purpose_category: formData.purpose_category as any,
          purpose_description: formData.purpose_description,
          department: formData.department,
          state_of_assignment: formData.state_of_assignment,
          bank_name: formData.bank_name,
          account_number: formData.account_number,
          account_name: formData.account_name,
          application_status: (isDraft ? "draft" : "pending") as any
        }]);

      if (error) throw error;

      if (!isDraft) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "contribution_application",
          message: `Your special contribution application for ${formData.contribution_year} has been submitted successfully.`
        });
      }

      toast({
        title: isDraft ? "Draft Saved" : "Application Submitted",
        description: isDraft 
          ? "Your application has been saved as a draft."
          : "Your application has been submitted for review."
      });

      navigate("/dashboard/special-contributions");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const showNameMismatchWarning = formData.account_name && profile?.full_name && 
    formData.account_name.toLowerCase() !== profile.full_name.toLowerCase();

  if (!profile) return <div>Loading...</div>;

  if (showPreview) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setShowPreview(false)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Edit
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Application Preview</CardTitle>
              <CardDescription>Review your application before submitting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Member Information</h3>
                  <p><strong>Name:</strong> {profile.full_name}</p>
                  <p><strong>Member Number:</strong> {profile.staff_id}</p>
                  <p><strong>Department:</strong> {formData.department}</p>
                  <p><strong>State of Assignment:</strong> {formData.state_of_assignment}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Contribution Details</h3>
                  <p><strong>Monthly Amount:</strong> ₦{parseFloat(formData.monthly_amount).toLocaleString()}</p>
                  <p><strong>Year:</strong> {formData.contribution_year}</p>
                  <p><strong>Period:</strong> January to November (11 months)</p>
                  <p><strong>Total Expected:</strong> ₦{totalExpected.toLocaleString()}</p>
                  <p><strong>Maturity Date:</strong> {maturityDate}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Purpose</h3>
                  <p>{PURPOSE_OPTIONS.find(p => p.value === formData.purpose_category)?.label}</p>
                  {formData.purpose_description && (
                    <p className="text-sm text-muted-foreground mt-1">{formData.purpose_description}</p>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Bank Details</h3>
                  <p><strong>Bank:</strong> {formData.bank_name}</p>
                  <p><strong>Account Number:</strong> {formData.account_number}</p>
                  <p><strong>Account Name:</strong> {formData.account_name}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={() => handleSubmit(false)} disabled={loading}>
                  {loading ? "Submitting..." : "Submit Application"}
                </Button>
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Edit Application
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard/special-contributions")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Special Contribution Application</h1>
            <p className="text-muted-foreground">Apply for special contribution savings</p>
          </div>
        </div>

        {hasActiveContribution && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You already have an active contribution for {currentYear}. Complete it before applying for a new one.
            </AlertDescription>
          </Alert>
        )}

        <form className="space-y-6">
          {/* Member Info */}
          <Card>
            <CardHeader>
              <CardTitle>Member Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name (Display Only)</Label>
                  <Input value={profile.full_name} disabled />
                </div>
                <div>
                  <Label>Member Number (Display Only)</Label>
                  <Input value={profile.staff_id || "N/A"} disabled />
                </div>
                <div>
                  <Label>Email (Display Only)</Label>
                  <Input value={profile.email} disabled />
                </div>
                <div>
                  <Label>Phone (Display Only)</Label>
                  <Input value={profile.phone || "N/A"} disabled />
                </div>
                <div>
                  <Label>Department</Label>
                  <Input 
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  />
                </div>
                <div>
                  <Label>State of Assignment</Label>
                  <Input 
                    value={formData.state_of_assignment}
                    onChange={(e) => setFormData({...formData, state_of_assignment: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contribution Details */}
          <Card>
            <CardHeader>
              <CardTitle>Contribution Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Monthly Amount (₦)</Label>
                  <Input 
                    type="number"
                    min="5000"
                    max="500000"
                    value={formData.monthly_amount}
                    onChange={(e) => setFormData({...formData, monthly_amount: e.target.value})}
                    placeholder="Enter amount between ₦5,000 - ₦500,000"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Minimum: ₦5,000 | Maximum: ₦500,000
                  </p>
                </div>
                <div>
                  <Label>Contribution Year</Label>
                  <Select value={formData.contribution_year} onValueChange={(value) => setFormData({...formData, contribution_year: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 5}, (_, i) => currentYear + i).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>Period:</strong> January to November ({formData.contribution_year})</p>
                <p><strong>Duration:</strong> 11 months (Fixed)</p>
                <p className="text-lg"><strong>Total Expected:</strong> ₦{totalExpected.toLocaleString()}</p>
                <p><strong>Maturity Date:</strong> {maturityDate}</p>
              </div>

              <div>
                <Label>Purpose</Label>
                <Select value={formData.purpose_category} onValueChange={(value) => setFormData({...formData, purpose_category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {PURPOSE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.purpose_category === "other" && (
                <div>
                  <Label>Describe Purpose</Label>
                  <Textarea 
                    value={formData.purpose_description}
                    onChange={(e) => setFormData({...formData, purpose_description: e.target.value})}
                    placeholder="Please describe your purpose"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Bank Name</Label>
                  <Select value={formData.bank_name} onValueChange={(value) => setFormData({...formData, bank_name: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {NIGERIAN_BANKS.map(bank => (
                        <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input 
                    maxLength={10}
                    value={formData.account_number}
                    onChange={(e) => setFormData({...formData, account_number: e.target.value.replace(/\D/g, '')})}
                    placeholder="10-digit account number"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Account Name</Label>
                  <Input 
                    value={formData.account_name}
                    onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                    placeholder="Account name"
                  />
                  {showNameMismatchWarning && (
                    <Alert className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Account name doesn't match your registered name. Please verify.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Authorization */}
          <Card>
            <CardHeader>
              <CardTitle>Authorization & Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox 
                  checked={formData.salary_deduction_auth}
                  onCheckedChange={(checked) => setFormData({...formData, salary_deduction_auth: checked as boolean})}
                />
                <Label className="font-normal">
                  I authorize monthly deductions from my salary for this contribution
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox 
                  checked={formData.terms_understanding}
                  onCheckedChange={(checked) => setFormData({...formData, terms_understanding: checked as boolean})}
                />
                <Label className="font-normal">
                  I understand that this is a fixed 11-month period (January to November) with no withdrawals or changes allowed
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox 
                  checked={formData.terms_acceptance}
                  onCheckedChange={(checked) => setFormData({...formData, terms_acceptance: checked as boolean})}
                />
                <Label className="font-normal">
                  I accept the terms and conditions
                </Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="button" onClick={() => setShowPreview(true)} disabled={!formData.monthly_amount || !formData.purpose_category}>
              Preview Application
            </Button>
            <Button type="button" variant="outline" onClick={() => handleSubmit(true)} disabled={loading}>
              Save as Draft
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}