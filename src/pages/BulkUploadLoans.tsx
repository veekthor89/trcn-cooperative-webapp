import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { AdminRoute } from "@/components/AdminRoute";

interface LoanData {
  email: string;
  loan_type: 'normal' | 'trade' | 'special' | 'long_term';
  principal_amount: number;
  interest_rate: number;
  repayment_period: number;
  status?: 'pending' | 'active' | 'paid' | 'defaulted';
  outstanding_balance?: number;
  monthly_payment?: number;
  next_payment_date?: string;
}

const BulkUploadLoans = () => {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{ success: string[]; errors: Array<{ email: string; error: string }> } | null>(null);

  const parseCsv = (text: string): LoanData[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const loans: LoanData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < 5 || !values[0]?.trim()) continue;
      
      const loan: LoanData = {
        email: values[0]?.trim() || '',
        loan_type: (values[1]?.trim()?.toLowerCase() || 'normal') as 'normal' | 'trade' | 'special' | 'long_term',
        principal_amount: values[2]?.trim() ? parseFloat(values[2].trim()) : 0,
        interest_rate: values[3]?.trim() ? parseFloat(values[3].trim()) : 0,
        repayment_period: values[4]?.trim() ? parseInt(values[4].trim()) : 12,
        status: (values[5]?.trim()?.toLowerCase() || 'pending') as 'pending' | 'active' | 'paid' | 'defaulted',
        outstanding_balance: values[6]?.trim() ? parseFloat(values[6].trim()) : undefined,
        monthly_payment: values[7]?.trim() ? parseFloat(values[7].trim()) : undefined,
        next_payment_date: values[8]?.trim() || undefined
      };
      
      if (loan.email && loan.principal_amount > 0) {
        loans.push(loan);
      }
    }
    
    return loans;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    if (file.type !== "text/csv") {
      toast.error("Please select a valid CSV file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("CSV file must be less than 2MB");
      return;
    }

    setUploading(true);
    setResults(null);

    try {
      const text = await file.text();
      const loans = parseCsv(text);

      if (loans.length === 0) {
        toast.error("No valid loans found in CSV");
        setUploading(false);
        return;
      }

      toast.info(`Uploading ${loans.length} loans...`);

      const { data, error } = await supabase.functions.invoke('bulk-upload-loans', {
        body: { loans }
      });

      if (error) throw error;

      setResults(data);
      
      if (data.success.length > 0) {
        toast.success(`Successfully created ${data.success.length} loans`);
      }
      if (data.errors.length > 0) {
        toast.error(`Failed to create ${data.errors.length} loans`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload loans');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `email,loan_type,principal_amount,interest_rate,repayment_period,status,outstanding_balance,monthly_payment,next_payment_date
johndoe@example.com,normal,5000.00,5.5,12,active,5000.00,440.00,2025-11-10
janesmith@example.com,trade,15000.00,7.0,24,active,15000.00,655.00,2025-11-10
bobwilson@example.com,special,2000.00,4.5,6,pending,2000.00,340.00,2025-11-10
alicesmith@example.com,long_term,50000.00,6.0,60,active,50000.00,966.00,2025-11-10`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'loans_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <AdminRoute>
        <div className="container mx-auto p-6 space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Bulk Upload Loans</h1>
              <p className="text-muted-foreground mt-1">Create multiple loan records at once using a CSV file</p>
            </div>
          </div>

          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Upload CSV File</CardTitle>
              <CardDescription>
                Upload a CSV file with loan details. Members must already exist in the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>

                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <Button disabled={uploading} className="gap-2">
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Upload CSV'}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                <p className="font-semibold text-foreground">CSV Format Requirements:</p>
                <div className="space-y-1 text-muted-foreground">
                  <p><span className="font-medium">Columns:</span> email, loan_type, principal_amount, interest_rate, repayment_period, status, outstanding_balance, monthly_payment, next_payment_date</p>
                  <p><span className="font-medium">loan_type:</span> normal, trade, special, or long_term</p>
                  <p><span className="font-medium">status:</span> pending, active, paid, or defaulted (default: pending)</p>
                  <p><span className="font-medium">interest_rate:</span> Annual interest rate as percentage (e.g., 5.5 for 5.5%)</p>
                  <p><span className="font-medium">repayment_period:</span> Number of months</p>
                  <p><span className="font-medium">outstanding_balance:</span> Current outstanding balance (optional, defaults to principal_amount)</p>
                  <p><span className="font-medium">monthly_payment:</span> Monthly payment amount (optional)</p>
                  <p><span className="font-medium">next_payment_date:</span> Next payment date in YYYY-MM-DD format (optional)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {results && (
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Upload Results</CardTitle>
                <CardDescription>
                  {results.success.length} successful, {results.errors.length} failed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {results.success.length > 0 && (
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20 p-4">
                    <h3 className="font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 text-xs">✓</span>
                      Successfully Created ({results.success.length})
                    </h3>
                    <ul className="text-sm space-y-1.5 max-h-60 overflow-y-auto">
                      {results.success.map((email, idx) => (
                        <li key={idx} className="text-green-600 dark:text-green-300 flex items-center gap-2">
                          <span className="text-green-500">✓</span> {email}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.errors.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4">
                    <h3 className="font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900 text-xs">✕</span>
                      Failed Uploads ({results.errors.length})
                    </h3>
                    <ul className="text-sm space-y-2 max-h-60 overflow-y-auto">
                      {results.errors.map((err, idx) => (
                        <li key={idx} className="text-red-600 dark:text-red-300">
                          <span className="font-medium">{err.email}</span>
                          <span className="text-red-500 dark:text-red-400">: {err.error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </AdminRoute>
    </DashboardLayout>
  );
};

export default BulkUploadLoans;
