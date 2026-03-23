import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailX, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already_unsubscribed" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already_unsubscribed");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      setStatus(data?.success ? "success" : "error");
    } catch {
      setStatus("error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex flex-col items-center gap-3">
            {status === "loading" && <Loader2 className="h-10 w-10 animate-spin text-primary" />}
            {status === "valid" && <MailX className="h-10 w-10 text-destructive" />}
            {(status === "success" || status === "already_unsubscribed") && (
              <CheckCircle className="h-10 w-10 text-green-600" />
            )}
            {(status === "invalid" || status === "error") && (
              <AlertTriangle className="h-10 w-10 text-destructive" />
            )}
            <span>
              {status === "loading" && "Verifying..."}
              {status === "valid" && "Unsubscribe from Emails"}
              {status === "success" && "Unsubscribed Successfully"}
              {status === "already_unsubscribed" && "Already Unsubscribed"}
              {status === "invalid" && "Invalid Link"}
              {status === "error" && "Something Went Wrong"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "valid" && (
            <>
              <p className="text-muted-foreground">
                Are you sure you want to unsubscribe from TRCN SMCS emails?
              </p>
              <Button variant="destructive" onClick={handleUnsubscribe} disabled={processing}>
                {processing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  "Confirm Unsubscribe"
                )}
              </Button>
            </>
          )}
          {status === "success" && (
            <p className="text-muted-foreground">
              You have been successfully unsubscribed from TRCN SMCS emails.
            </p>
          )}
          {status === "already_unsubscribed" && (
            <p className="text-muted-foreground">
              You have already been unsubscribed from TRCN SMCS emails.
            </p>
          )}
          {status === "invalid" && (
            <p className="text-muted-foreground">
              This unsubscribe link is invalid or has expired.
            </p>
          )}
          {status === "error" && (
            <p className="text-muted-foreground">
              We couldn't process your request. Please try again later.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
