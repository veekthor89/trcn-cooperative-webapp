import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import cooperativeLogo from "@/assets/cooperative-logo.png";
import PasswordInput from "@/components/PasswordInput";

const authSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters" }).optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgotPassword) {
        // Send password reset request to admin
        const { error } = await supabase.functions.invoke('request-password-reset', {
          body: { email: formData.email },
        });

        if (error) {
          toast.error("Failed to submit reset request. Please try again.");
        } else {
          toast.success("Your password reset request has been sent to the admin. You will be contacted shortly.");
          setIsForgotPassword(false);
          setFormData({ email: "", password: "", fullName: "" });
        }
      } else {
        // Validate form data
        const validationData = isSignUp 
          ? authSchema.parse(formData)
          : authSchema.omit({ fullName: true }).parse(formData);

        if (isSignUp) {
          const { error } = await supabase.auth.signUp({
            email: validationData.email,
            password: validationData.password,
            options: {
              emailRedirectTo: `${window.location.origin}/dashboard`,
              data: {
                full_name: formData.fullName,
              },
            },
          });

          if (error) {
            if (error.message.includes("already registered")) {
              toast.error("This email is already registered. Please sign in instead.");
            } else {
              toast.error(error.message);
            }
          } else {
            toast.success("Account created successfully! Redirecting to dashboard...");
            setTimeout(() => navigate("/dashboard"), 1000);
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email: validationData.email,
            password: validationData.password,
          });

          if (error) {
            toast.error(error.message);
          } else {
            // Check if user must change password
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("must_change_password")
                .eq("id", user.id)
                .single();
              
              if (profile?.must_change_password) {
                toast.info("Please change your default password to continue.");
                navigate("/change-password");
                return;
              }
            }
            toast.success("Signed in successfully!");
            navigate("/dashboard");
          }
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      } else {
        toast.error("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Left side - Logo */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
        <div className="max-w-md space-y-6 text-center">
          <img 
            src={cooperativeLogo} 
            alt="TRCN Staff Multipurpose Cooperative Society" 
            className="w-full max-w-sm mx-auto"
          />
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              TRCN Staff Multipurpose Cooperative Society
            </h1>
            <p className="text-lg text-muted-foreground">
              Bridging The Wealth Divide
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-elevated">
          <CardHeader className="text-center space-y-4 py-8">
            <div className="flex justify-center mb-4 lg:hidden">
              <img 
                src={cooperativeLogo} 
                alt="TRCN SMCS Logo" 
                className="h-24 w-24"
              />
            </div>
            <CardTitle className="text-2xl">
              {isForgotPassword ? "Reset your password" : isSignUp ? "Create your account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isForgotPassword
                ? "Enter your email to receive a password reset link"
                : isSignUp
                ? "Join your cooperative society today"
                : "Sign into your Cooperative Account"}
            </CardDescription>
          </CardHeader>
          <CardContent className="py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignUp && !isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required={isSignUp}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              {!isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    showDisclaimer
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait...
                  </>
                ) : isForgotPassword ? (
                  "Send Reset Link"
                ) : isSignUp ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
            
            <div className="mt-6 space-y-3 text-center text-sm">
              {!isForgotPassword && !isSignUp && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-primary hover:underline block w-full"
                >
                  Forgot password?
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setIsForgotPassword(false);
                }}
                className="text-primary hover:underline"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </button>
              {isForgotPassword && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-primary hover:underline"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
