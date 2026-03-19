import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { AdminRoute } from "@/components/AdminRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Download, AlertCircle, CheckCircle2, Target } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UploadResult {
  successful: string[];
  failed: Array<{ email: string; error: string }>;
}

interface SpecialContribution {
  id: string;
  contribution_year: number;
  monthly_amount: number;
  total_contributed: number;
  total_expected: number;
  maturity_date: string | null;
  created_at: string;
  application_status: string;
}

const BulkUploadSpecialContributions = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [recentContributions, setRecentContributions] = useState<SpecialContribution[]>([]);

  useEffect(() => {
    fetchRecentContributions();

    const channel = supabase
      .channel('special-contributions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'special_contributions'
        },
        (payload) => {
          console.log('New special contribution:', payload);
          setRecentContributions(prev => [payload.new as SpecialContribution, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecentContributions = async () => {
    const { data, error } = await supabase
      .from('special_contributions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching recent contributions:', error);
    } else {
      setRecentContributions(data || []);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== "text/csv") {
      toast.error("Please select a valid CSV file");
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      toast.error("CSV file must be less than 2MB");
      return;
    }

    setFile(selectedFile);
    setResult(null);
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let j = 0; j < lines[i].length; j++) {
          const char = lines[i][j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const record: any = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });
        records.push(record);
      }
    }

    return records;
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      const records = parseCSV(text);

      const { data, error } = await supabase.functions.invoke('bulk-upload-special-contributions', {
        body: { records }
      });

      if (error) throw error;

      setResult(data);

      if (data.successful.length > 0) {
        toast.success(`Successfully uploaded ${data.successful.length} special contributions`);
        await fetchRecentContributions();
      }

      if (data.failed.length > 0) {
        toast.error(`Failed to upload ${data.failed.length} special contributions`);
      }

    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload special contributions");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = "email,contribution_year,monthly_amount,bank_name,account_number,account_name,account_type,total_contributed,duration_months\nexample@email.com,2026,5000,First Bank,1234567890,John Doe,savings,0,11";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "special_contributions_template.csv";
    a.click();
  };

  return (
    <DashboardLayout>
      <AdminRoute>
        <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bulk Upload Special Contributions</h1>
          <p className="text-muted-foreground">Upload multiple special contributions via CSV file</p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Download the template below, fill it with special contribution data, and upload it here
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>

            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                CSV columns: email, contribution_year, monthly_amount, bank_name, account_number, account_name, account_type (optional), total_contributed (optional), duration_months (optional, default 11)
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {result && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Upload Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.successful.length > 0 && (
                <div className="flex items-start gap-2 text-secondary">
                  <CheckCircle2 className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Successfully uploaded {result.successful.length} special contributions</p>
                    <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                      {result.successful.map((email, idx) => (
                        <li key={idx}>{email}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {result.failed.length > 0 && (
                <div className="flex items-start gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Failed to upload {result.failed.length} special contributions</p>
                    <ul className="text-sm mt-1 space-y-1">
                      {result.failed.map((failure, idx) => (
                        <li key={idx}>
                          <span className="font-medium">{failure.email}:</span> {failure.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Recent Uploads (Live)
            </CardTitle>
            <CardDescription>
              Real-time view of recently uploaded special contributions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentContributions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No special contributions uploaded yet</p>
            ) : (
              <div className="space-y-3">
                {recentContributions.map((contribution) => (
                  <div key={contribution.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">Year {contribution.contribution_year}</p>
                      <p className="text-sm text-muted-foreground">
                        Monthly: ₦{Number(contribution.monthly_amount).toLocaleString()} • 
                        Contributed: ₦{Number(contribution.total_contributed).toLocaleString()}
                        {contribution.maturity_date && ` • Matures: ${new Date(contribution.maturity_date).toLocaleDateString()}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(contribution.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </AdminRoute>
    </DashboardLayout>
  );
};

export default BulkUploadSpecialContributions;
