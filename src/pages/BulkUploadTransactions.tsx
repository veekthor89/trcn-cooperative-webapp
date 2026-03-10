import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { AdminRoute } from "@/components/AdminRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BulkUploadTransactions = () => {
  const [includedInOpeningBalance, setIncludedInOpeningBalance] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentTransactions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('New transaction:', payload);
          setRecentTransactions(prev => [payload.new, ...prev].slice(0, 10));
          toast.success('New transaction added!');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecentTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
      setRecentTransactions(data);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate MIME type
    if (selectedFile.type !== "text/csv") {
      toast.error("Please select a valid CSV file");
      return;
    }

    // Validate file size (max 2MB)
    if (selectedFile.size > 2 * 1024 * 1024) {
      toast.error("CSV file must be less than 2MB");
      return;
    }

    setFile(selectedFile);
    setResults(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("included_in_opening_balance", String(includedInOpeningBalance));

      const response = await supabase.functions.invoke("bulk-upload-transactions", {
        body: formData,
      });

      if (response.error) throw response.error;

      setResults(response.data);
      
      if (response.data.successful > 0) {
        toast.success(`Successfully uploaded ${response.data.successful} transactions`);
        await fetchRecentTransactions();
      }
      
      if (response.data.failed > 0) {
        toast.error(`Failed to upload ${response.data.failed} transactions`);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload transactions");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = "email,type,amount,description\nuser@example.com,deposit,1000.00,Salary Payment\nuser2@example.com,withdrawal,500.00,ATM Withdrawal";
    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions_template.csv";
    a.click();
  };

  return (
    <DashboardLayout>
      <AdminRoute>
        <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bulk Upload Transactions</h1>
          <p className="text-muted-foreground mt-2">
            Upload multiple transactions at once using a CSV file
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Download the template, fill it with your transaction data, and upload it here
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>

            <div className="space-y-4">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Transactions"}
              </Button>
            </div>

            {results && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">
                    Successfully uploaded: {results.successful}
                  </span>
                </div>
                {results.failed > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">Failed: {results.failed}</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {results.errors.map((error, index) => (
                        <div key={index}>• {error}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions (Real-time)</CardTitle>
            <CardDescription>
              Newly uploaded transactions will appear here automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentTransactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No transactions yet</p>
              ) : (
                recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{transaction.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₦{parseFloat(transaction.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.reference_number}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </AdminRoute>
    </DashboardLayout>
  );
};

export default BulkUploadTransactions;
