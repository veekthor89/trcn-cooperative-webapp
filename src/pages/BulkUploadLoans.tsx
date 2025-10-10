import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface LoanData {
  email: string;
  loan_type: 'personal' | 'business' | 'emergency' | 'education';
  principal_amount: number;
  interest_rate: number;
  repayment_period: number;
  status?: 'pending' | 'active' | 'paid' | 'defaulted';
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
        loan_type: (values[1]?.trim()?.toLowerCase() || 'personal') as 'personal' | 'business' | 'emergency' | 'education',
        principal_amount: values[2]?.trim() ? parseFloat(values[2].trim()) : 0,
        interest_rate: values[3]?.trim() ? parseFloat(values[3].trim()) : 0,
        repayment_period: values[4]?.trim() ? parseInt(values[4].trim()) : 12,
        status: (values[5]?.trim()?.toLowerCase() || 'pending') as 'pending' | 'active' | 'paid' | 'defaulted'
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
    const template = `email,loan_type,principal_amount,interest_rate,repayment_period,status
johndoe@example.com,personal,5000.00,5.5,12,pending
janesmith@example.com,business,15000.00,7.0,24,pending
bobwilson@example.com,emergency,2000.00,4.5,6,pending`;
    
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
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bulk Upload Loans</h1>
          <p className="text-muted-foreground">Create multiple loan records at once using a CSV file</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Upload a CSV file with loan details. Members must already exist in the system.
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

              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button disabled={uploading} className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload CSV'}
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>CSV Format:</strong></p>
              <p>Columns: email, loan_type, principal_amount, interest_rate, repayment_period, status</p>
              <p className="text-xs"><strong>loan_type:</strong> personal, business, emergency, or education</p>
              <p className="text-xs"><strong>status:</strong> pending, active, paid, or defaulted (default: pending)</p>
              <p className="text-xs"><strong>interest_rate:</strong> Annual interest rate as percentage (e.g., 5.5 for 5.5%)</p>
              <p className="text-xs"><strong>repayment_period:</strong> Number of months</p>
            </div>
          </CardContent>
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.success.length > 0 && (
                <div>
                  <h3 className="font-semibold text-green-600 mb-2">
                    Successfully created ({results.success.length})
                  </h3>
                  <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                    {results.success.map((email, idx) => (
                      <li key={idx} className="text-muted-foreground">✓ {email}</li>
                    ))}
                  </ul>
                </div>
              )}

              {results.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-destructive mb-2">
                    Failed uploads ({results.errors.length})
                  </h3>
                  <ul className="text-sm space-y-2 max-h-40 overflow-y-auto">
                    {results.errors.map((err, idx) => (
                      <li key={idx} className="text-muted-foreground">
                        <span className="font-medium">{err.email}</span>: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BulkUploadLoans;
