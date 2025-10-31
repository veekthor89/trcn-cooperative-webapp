import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ShareSubscriptionForm from "@/components/ShareSubscriptionForm";
import { TrendingUp, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
const PRICE_PER_SHARE = 1000;
const MAX_SHARES = 3500;
export default function Shares() {
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [shareHoldings, setShareHoldings] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  useEffect(() => {
    fetchShareData();
  }, []);
  const fetchShareData = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch share holdings
      const {
        data: shares
      } = await supabase.from("shares").select("*").eq("user_id", user.id).single();
      setShareHoldings(shares || {
        total_shares: 0,
        current_value: 0,
        last_dividend_amount: 0
      });

      // Fetch applications
      const {
        data: apps
      } = await supabase.from("share_subscriptions").select("*").eq("user_id", user.id).order("created_at", {
        ascending: false
      });
      setApplications(apps || []);
    } catch (error) {
      console.error("Error fetching share data:", error);
      toast.error("Failed to load share data");
    } finally {
      setLoading(false);
    }
  };
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }> = {
      draft: {
        label: "Draft",
        variant: "secondary"
      },
      pending: {
        label: "Pending",
        variant: "default"
      },
      payment_verified: {
        label: "Payment Verified",
        variant: "default"
      },
      approved: {
        label: "Approved",
        variant: "default"
      },
      rejected: {
        label: "Rejected",
        variant: "destructive"
      },
      completed: {
        label: "Completed",
        variant: "outline"
      }
    };
    const config = statusConfig[status] || {
      label: status,
      variant: "outline"
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "payment_verified":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "approved":
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };
  const totalShares = shareHoldings?.total_shares || 0;
  const currentValue = totalShares * PRICE_PER_SHARE;
  const availableShares = MAX_SHARES - totalShares;
  const lastDividend = shareHoldings?.last_dividend_amount || 0;
  if (loading) {
    return <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </DashboardLayout>;
  }
  return <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Share Ownership</h1>
            <p className="text-muted-foreground">Manage your cooperative shares</p>
          </div>
          <Button onClick={() => setShowDialog(true)} size="lg">
            Apply for More Shares
          </Button>
        </div>

        {/* Share Holdings Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Shares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalShares}</div>
              <p className="text-xs text-muted-foreground mt-1">of {MAX_SHARES} maximum</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₦{currentValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">@ ₦{PRICE_PER_SHARE}/share</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available to Buy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{availableShares}</div>
              <p className="text-xs text-muted-foreground mt-1">shares remaining</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Last Dividend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₦{lastDividend.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {shareHoldings?.last_dividend_date || "No dividend yet"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Applications */}
        <Card>
          <CardHeader>
            <CardTitle>Share Applications</CardTitle>
            <CardDescription>Track your share subscription applications</CardDescription>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No applications yet</p>
                <Button onClick={() => setShowDialog(true)}>Apply for Shares</Button>
              </div> : <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Shares</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map(app => <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.application_number}</TableCell>
                      <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{app.shares_requested}</TableCell>
                      <TableCell>₦{app.total_cost.toLocaleString()}</TableCell>
                      <TableCell className="capitalize">
                        {app.payment_method.replace("_", " ")}
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Share Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>✓ Earn annual dividends based on cooperative performance</li>
              <li>✓ Voting rights in cooperative decisions</li>
              <li>✓ Shares are transferable subject to board approval</li>
              <li>✓ Priority access to cooperative services</li>
              <li>✓ Maximum ownership: 3,500 shares per member</li>
              <li>✓ Current price: ₦25per share</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Application Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Apply for Share Subscription</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)] px-6 pb-6">
            <ShareSubscriptionForm onSuccess={() => {
            setShowDialog(false);
            fetchShareData();
          }} onCancel={() => setShowDialog(false)} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </DashboardLayout>;
}