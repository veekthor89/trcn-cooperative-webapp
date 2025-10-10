import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { AdminRoute } from "@/components/AdminRoute";

interface AccountData {
  email: string;
  account_type: 'savings' | 'shares' | 'loan';
  balance?: number;
  status?: 'active' | 'inactive' | 'suspended';
}

const BulkUploadAccounts = () => {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{ success: string[]; errors: Array<{ email: string; error: string }> } | null>(null);

  const parseCsv = (text: string): AccountData[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const accounts: AccountData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < 2 || !values[0]?.trim() || !values[1]?.trim()) continue;
      
      const account: AccountData = {
        email: values[0]?.trim() || '',
        account_type: (values[1]?.trim()?.toLowerCase() || 'savings') as 'savings' | 'shares' | 'loan',
        balance: values[2]?.trim() ? parseFloat(values[2].trim()) : 0.00,
        status: (values[3]?.trim()?.toLowerCase() || 'active') as 'active' | 'inactive' | 'suspended'
      };
      
      if (account.email && account.account_type) {
        accounts.push(account);
      }
    }
    
    return accounts;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResults(null);

    try {
      const text = await file.text();
      const accounts = parseCsv(text);

      if (accounts.length === 0) {
        toast.error("No valid accounts found in CSV");
        setUploading(false);
        return;
      }

      toast.info(`Uploading ${accounts.length} accounts...`);

      const { data, error } = await supabase.functions.invoke('bulk-upload-accounts', {
        body: { accounts }
      });

      if (error) throw error;

      setResults(data);
      
      if (data.success.length > 0) {
        toast.success(`Successfully created ${data.success.length} accounts`);
      }
      if (data.errors.length > 0) {
        toast.error(`Failed to create ${data.errors.length} accounts`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload accounts');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `email,account_type,balance,status
johndoe@example.com,savings,1000.00,active
janesmith@example.com,shares,5000.00,active
bobwilson@example.com,loan,0.00,active`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accounts_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <AdminRoute>
        <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bulk Upload Accounts</h1>
          <p className="text-muted-foreground">Create multiple accounts at once using a CSV file</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Upload a CSV file with account details. Members must already exist in the system.
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
              <p>Columns: email, account_type, balance, status</p>
              <p className="text-xs"><strong>account_type:</strong> savings, shares, or loan</p>
              <p className="text-xs"><strong>status:</strong> active, inactive, or suspended (default: active)</p>
              <p className="text-xs"><strong>balance:</strong> Initial balance (default: 0.00)</p>
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
      </AdminRoute>
    </DashboardLayout>
  );
};

export default BulkUploadAccounts;
