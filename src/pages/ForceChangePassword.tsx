import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import cooperativeLogo from "@/assets/cooperative-logo.png";
import DeveloperFooter from "@/components/DeveloperFooter";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionError";
import PasswordInput from "@/components/PasswordInput";
const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const ForceChangePassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = passwordSchema.safeParse({ newPassword, confirmPassword });
    if (!result.success) {
      const fieldErrors: { newPassword?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "newPassword") fieldErrors.newPassword = err.message;
        else if (err.path[0] === "confirmPassword") fieldErrors.confirmPassword = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) throw new Error("Session expired. Please sign in again.");

      const { data, error } = await supabase.functions.invoke('change-password', {
        body: { new_password: newPassword },
      });

      if (error) {
        const message = await getEdgeFunctionErrorMessage(error, "Failed to change password");
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: newPassword,
      });

      if (signInError) {
        toast.success("Password changed successfully. Please sign in with your new password.");
        navigate("/auth", { replace: true });
        return;
      }

      toast.success("Password changed successfully! Redirecting to dashboard...");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Password change error:", error);
      const message = await getEdgeFunctionErrorMessage(error, "Failed to change password");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-lg shadow-elevated">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={cooperativeLogo} alt="TRCN SMCS Logo" className="h-20 w-20" />
          </div>
          <div className="flex justify-center">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Change Your Password</CardTitle>
          <CardDescription>
            You are using a default password. For security, you must set a new password before accessing your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                showDisclaimer
              />
              {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword}</p>}
              <p className="text-xs text-muted-foreground">Min 6 characters with at least one number</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : "Set New Password"}
            </Button>

            <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={handleSignOut}>
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
      <DeveloperFooter />
    </div>
  );
};

export default ForceChangePassword;
