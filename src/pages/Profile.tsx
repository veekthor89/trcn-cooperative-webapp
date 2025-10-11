import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Edit, Save, X, Camera, User, Briefcase, Users, Wallet, CreditCard, Settings, ArrowLeft } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { ImageCropper } from "@/components/ImageCropper";
const nigerianBanks = ["Access Bank", "Citibank", "Ecobank", "Fidelity Bank", "First Bank of Nigeria", "First City Monument Bank (FCMB)", "Globus Bank", "Guaranty Trust Bank (GTBank)", "Heritage Bank", "Keystone Bank", "Polaris Bank", "Providus Bank", "Stanbic IBTC Bank", "Standard Chartered", "Sterling Bank", "SunTrust Bank", "Titan Trust Bank", "Union Bank of Nigeria", "United Bank for Africa (UBA)", "Unity Bank", "Wema Bank", "Zenith Bank"];
const nigerianStates = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];
const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    email: "",
    phone: "",
    alternative_phone: "",
    date_of_birth: "",
    gender: "",
    address: "",
    city: "",
    state_of_residence: "",
    designation: "",
    department: "",
    school_name: "",
    state_of_deployment: "",
    lga: "",
    staff_id: "",
    years_of_service: 0,
    next_of_kin_name: "",
    next_of_kin_relationship: "",
    next_of_kin_phone: "",
    next_of_kin_email: "",
    next_of_kin_address: "",
    bank_name: "",
    account_number: "",
    account_name: "",
    bvn: "",
    profile_photo_url: "",
    email_notifications: true,
    sms_notifications: true
  });
  const [financialSummary, setFinancialSummary] = useState({
    totalSavings: 0,
    totalShares: 0,
    activeLoansCount: 0,
    outstandingBalance: 0
  });
  useEffect(() => {
    fetchProfile();
  }, []);
  const fetchProfile = async () => {
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      setUserId(session.user.id);

      // Fetch profile data
      const {
        data: profile,
        error: profileError
      } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (profileError) throw profileError;
      if (profile) {
        setProfileData({
          full_name: profile.full_name || "",
          email: profile.email || "",
          phone: profile.phone || "",
          alternative_phone: profile.alternative_phone || "",
          date_of_birth: profile.date_of_birth || "",
          gender: profile.gender || "",
          address: profile.address || "",
          city: profile.city || "",
          state_of_residence: profile.state_of_residence || "",
          designation: profile.designation || "",
          department: profile.department || "",
          school_name: profile.school_name || "",
          state_of_deployment: profile.state_of_deployment || "",
          lga: profile.lga || "",
          staff_id: profile.staff_id || "",
          years_of_service: profile.years_of_service || 0,
          next_of_kin_name: profile.next_of_kin_name || "",
          next_of_kin_relationship: profile.next_of_kin_relationship || "",
          next_of_kin_phone: profile.next_of_kin_phone || "",
          next_of_kin_email: profile.next_of_kin_email || "",
          next_of_kin_address: profile.next_of_kin_address || "",
          bank_name: profile.bank_name || "",
          account_number: profile.account_number || "",
          account_name: profile.account_name || "",
          bvn: profile.bvn || "",
          profile_photo_url: profile.profile_photo_url || "",
          email_notifications: profile.email_notifications ?? true,
          sms_notifications: profile.sms_notifications ?? true
        });
      }

      // Fetch financial summary
      const {
        data: accounts
      } = await supabase.from("accounts").select("balance, account_type").eq("user_id", session.user.id);
      const {
        data: loans
      } = await supabase.from("loans").select("outstanding_balance, status").eq("user_id", session.user.id);
      const totalSavings = accounts?.filter(a => a.account_type === "savings").reduce((sum, a) => sum + Number(a.balance), 0) || 0;
      const totalShares = 0; // Shares calculated from special_contributions

      // Fetch special contributions (shares)
      const {
        data: contributions
      } = await supabase.from("special_contributions").select("current_amount").eq("user_id", session.user.id);
      const contributionsTotal = contributions?.reduce((sum, c) => sum + Number(c.current_amount), 0) || 0;
      const activeLoans = loans?.filter(l => l.status === "active") || [];
      const outstandingBalance = activeLoans.reduce((sum, l) => sum + Number(l.outstanding_balance), 0);
      setFinancialSummary({
        totalSavings,
        totalShares: contributionsTotal,
        activeLoansCount: activeLoans.length,
        outstandingBalance
      });
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      if (!userId) throw new Error("User not authenticated");
      const {
        error
      } = await supabase.from("profiles").update({
        full_name: profileData.full_name,
        phone: profileData.phone,
        alternative_phone: profileData.alternative_phone,
        date_of_birth: profileData.date_of_birth,
        gender: profileData.gender,
        address: profileData.address,
        city: profileData.city,
        state_of_residence: profileData.state_of_residence,
        designation: profileData.designation,
        department: profileData.department,
        school_name: profileData.school_name,
        state_of_deployment: profileData.state_of_deployment,
        lga: profileData.lga,
        staff_id: profileData.staff_id,
        years_of_service: profileData.years_of_service,
        next_of_kin_name: profileData.next_of_kin_name,
        next_of_kin_relationship: profileData.next_of_kin_relationship,
        next_of_kin_phone: profileData.next_of_kin_phone,
        next_of_kin_email: profileData.next_of_kin_email,
        next_of_kin_address: profileData.next_of_kin_address,
        bank_name: profileData.bank_name,
        account_number: profileData.account_number,
        account_name: profileData.account_name,
        bvn: profileData.bvn,
        email_notifications: profileData.email_notifications,
        sms_notifications: profileData.sms_notifications
      }).eq("id", userId);
      if (error) throw error;
      toast.success("Profile updated successfully");
      setEditMode(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Create preview URL for cropping
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = "";
  };

  const handleCropComplete = async (croppedImage: Blob) => {
    if (!userId) return;

    setUploading(true);
    try {
      // Use timestamp in filename to avoid caching issues
      const timestamp = Date.now();
      const filePath = `${userId}/profile-${timestamp}.jpg`;

      // Delete old photo if exists
      if (profileData.profile_photo_url) {
        const oldPath = profileData.profile_photo_url.split("/profile-photos/")[1]?.split("?")[0];
        if (oldPath) {
          await supabase.storage.from("profile-photos").remove([oldPath]);
        }
      }

      // Upload cropped photo
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, croppedImage, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL with cache busting
      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-photos").getPublicUrl(filePath);

      const urlWithCacheBust = `${publicUrl}?v=${timestamp}`;

      // Update profile with new photo URL (with cache buster)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          profile_photo_url: urlWithCacheBust,
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      setCropperOpen(false);
      setImageToCrop(null);

      // Force a page reload to update the sidebar avatar
      window.location.reload();
      toast.success("Profile photo updated successfully");
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setCropperOpen(false);
    setImageToCrop(null);
  };
  const handleChangePassword = async () => {
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password: prompt("Enter new password:") || ""
      });
      if (error) throw error;
      toast.success("Password changed successfully");
    } catch (error: any) {
      toast.error("Failed to change password");
    }
  };
  if (loading) {
    return <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>;
  }
  return <DashboardLayout>
      <div className="space-y-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Member Profile</h1>
              <p className="text-muted-foreground">Manage your personal information</p>
            </div>
          </div>
          <div className="flex gap-2">
            {editMode ? <>
                <Button variant="outline" onClick={() => setEditMode(false)} disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </> : <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>}
                </Button>
              </> : <Button onClick={() => setEditMode(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>}
          </div>
        </div>

        {/* Profile Photo */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profileData.profile_photo_url} />
                  <AvatarFallback className="text-2xl">
                    {profileData.full_name?.charAt(0) || <User />}
                  </AvatarFallback>
                </Avatar>
                {editMode && <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90">
                    <Camera className="h-4 w-4" />
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" disabled={uploading} />
                  </label>}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{profileData.full_name}</h2>
                <p className="text-muted-foreground">{profileData.email}</p>
                <p className="text-sm text-muted-foreground mt-1">Staff ID: {profileData.staff_id || "Not set"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle>Financial Summary</CardTitle>
            </div>
            <CardDescription>Your current financial status at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Savings</p>
                <p className="text-2xl font-bold">₦{financialSummary.totalSavings.toLocaleString()}</p>
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/dashboard/savings")}>
                  View Details →
                </Button>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Special Contributions</p>
                <p className="text-2xl font-bold">₦{financialSummary.totalShares.toLocaleString()}</p>
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/dashboard/savings")}>
                  View Details →
                </Button>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Active Loans</p>
                <p className="text-2xl font-bold">{financialSummary.activeLoansCount}</p>
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/dashboard/loans")}>
                  View Details →
                </Button>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className="text-2xl font-bold">₦{financialSummary.outstandingBalance.toLocaleString()}</p>
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/dashboard/loans")}>
                  View Details →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Personal Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" value={profileData.full_name} onChange={e => setProfileData({
                ...profileData,
                full_name: e.target.value
              })} disabled={!editMode} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profileData.email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={profileData.phone} onChange={e => setProfileData({
                ...profileData,
                phone: e.target.value
              })} disabled={!editMode} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternative_phone">Alternative Phone</Label>
                <Input id="alternative_phone" value={profileData.alternative_phone} onChange={e => setProfileData({
                ...profileData,
                alternative_phone: e.target.value
              })} disabled={!editMode} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input id="date_of_birth" type="date" value={profileData.date_of_birth} onChange={e => setProfileData({
                ...profileData,
                date_of_birth: e.target.value
              })} disabled={!editMode} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={profileData.gender} onValueChange={value => setProfileData({
                ...profileData,
                gender: value
              })} disabled={!editMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Residential Address</Label>
                <Input id="address" value={profileData.address} onChange={e => setProfileData({
                ...profileData,
                address: e.target.value
              })} disabled={!editMode} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={profileData.city} onChange={e => setProfileData({
                ...profileData,
                city: e.target.value
              })} disabled={!editMode} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state_of_residence">State of Residence</Label>
                <Select value={profileData.state_of_residence} onValueChange={value => setProfileData({
                ...profileData,
                state_of_residence: value
              })} disabled={!editMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {nigerianStates.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <CardTitle>Employment Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state_of_deployment">State of Deployment</Label>
                <Select value={profileData.state_of_deployment} onValueChange={value => setProfileData({
                ...profileData,
                state_of_deployment: value
              })} disabled={!editMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {nigerianStates.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" value={profileData.department} onChange={e => setProfileData({
                ...profileData,
                department: e.target.value
              })} disabled={!editMode} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Division</Label>
                <Input id="designation" value={profileData.designation} onChange={e => setProfileData({
                ...profileData,
                designation: e.target.value
              })} disabled={!editMode} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school_name">Unit</Label>
                <Input id="school_name" value={profileData.school_name} onChange={e => setProfileData({
                ...profileData,
                school_name: e.target.value
              })} disabled={!editMode} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff_id">Staff ID</Label>
                <Input id="staff_id" value={profileData.staff_id} onChange={e => setProfileData({
                ...profileData,
                staff_id: e.target.value
              })} disabled={!editMode} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="years_of_service">Years of Service</Label>
                <Input id="years_of_service" type="number" value={profileData.years_of_service} onChange={e => setProfileData({
                ...profileData,
                years_of_service: parseInt(e.target.value) || 0
              })} disabled={!editMode} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next of Kin */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Next of Kin</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="next_of_kin_name">Name</Label>
                <Input id="next_of_kin_name" value={profileData.next_of_kin_name} onChange={e => setProfileData({
                ...profileData,
                next_of_kin_name: e.target.value
              })} disabled={!editMode} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_of_kin_relationship">Relationship</Label>
                <Input id="next_of_kin_relationship" value={profileData.next_of_kin_relationship} onChange={e => setProfileData({
                ...profileData,
                next_of_kin_relationship: e.target.value
              })} disabled={!editMode} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_of_kin_phone">Phone</Label>
                <Input id="next_of_kin_phone" value={profileData.next_of_kin_phone} onChange={e => setProfileData({
                ...profileData,
                next_of_kin_phone: e.target.value
              })} disabled={!editMode} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_of_kin_email">Email</Label>
                <Input id="next_of_kin_email" type="email" value={profileData.next_of_kin_email} onChange={e => setProfileData({
                ...profileData,
                next_of_kin_email: e.target.value
              })} disabled={!editMode} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="next_of_kin_address">Address</Label>
                <Input id="next_of_kin_address" value={profileData.next_of_kin_address} onChange={e => setProfileData({
                ...profileData,
                next_of_kin_address: e.target.value
              })} disabled={!editMode} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Account Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Bank Account Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Select value={profileData.bank_name} onValueChange={value => setProfileData({
                ...profileData,
                bank_name: value
              })} disabled={!editMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {nigerianBanks.map(bank => <SelectItem key={bank} value={bank}>{bank}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input id="account_number" value={profileData.account_number} onChange={e => setProfileData({
                ...profileData,
                account_number: e.target.value
              })} disabled={!editMode} maxLength={10} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_name">Account Name</Label>
                <Input id="account_name" value={profileData.account_name} onChange={e => setProfileData({
                ...profileData,
                account_name: e.target.value
              })} disabled={!editMode} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bvn">BVN</Label>
                <Input id="bvn" value={profileData.bvn} onChange={e => setProfileData({
                ...profileData,
                bvn: e.target.value
              })} disabled={!editMode} maxLength={11} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle>Account Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email_notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch id="email_notifications" checked={profileData.email_notifications} onCheckedChange={checked => setProfileData({
                ...profileData,
                email_notifications: checked
              })} disabled={!editMode} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms_notifications">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via SMS</p>
                </div>
                <Switch id="sms_notifications" checked={profileData.sms_notifications} onCheckedChange={checked => setProfileData({
                ...profileData,
                sms_notifications: checked
              })} disabled={!editMode} />
              </div>
              <Separator />
              <div>
                <Button variant="outline" onClick={handleChangePassword}>
                  Change Password
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image Cropper Modal */}
      {imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          isOpen={cropperOpen}
        />
      )}
    </DashboardLayout>;
};
export default Profile;