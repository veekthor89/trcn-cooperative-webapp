import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download } from "lucide-react";
import { AdminRoute } from "@/components/AdminRoute";
import DashboardLayout from "@/components/DashboardLayout";

interface MemberData {
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
}

const BulkUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{ success: string[]; errors: Array<{ email: string; error: string }> } | null>(null);

  const parseCsv = (text: string): MemberData[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const members: MemberData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < 2 || !values[1]?.trim() || !values[2]?.trim()) continue;
      
      const member: MemberData = {
        full_name: values[1]?.trim() || '',
        email: values[2]?.trim() || '',
        phone: values[3]?.trim() || undefined,
        address: values[4]?.trim() || undefined,
        date_of_birth: values[5]?.trim() || undefined
      };
      
      if (member.full_name && member.email) {
        members.push(member);
      }
    }
    
    return members;
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
      const members = parseCsv(text);

      if (members.length === 0) {
        toast.error("No valid members found in CSV");
        setUploading(false);
        return;
      }

      toast.info(`Uploading ${members.length} members...`);

      const { data, error } = await supabase.functions.invoke('bulk-upload-members', {
        body: { members }
      });

      if (error) throw error;

      setResults(data);
      
      if (data.success.length > 0) {
        toast.success(`Successfully uploaded ${data.success.length} members`);
      }
      if (data.errors.length > 0) {
        toast.error(`Failed to upload ${data.errors.length} members`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload members');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `id,full_name,email,phone,address,date_of_birth,created_at,updated_at
,John Doe,johndoe@example.com,08012345678,123 Main St,1990-01-01,,
,Jane Smith,janesmith@example.com,08012345679,456 Oak Ave,1985-05-15,,`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <AdminRoute>
        <div className="container mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bulk Upload Members</h1>
            <p className="text-muted-foreground">Upload multiple members at once using a CSV file</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Upload a CSV file with member details. Each member will be assigned a secure random password and must change it on first login.
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
                <p>Columns: id, full_name, email, phone, address, date_of_birth, created_at, updated_at</p>
                <p className="text-xs">Note: id, created_at, and updated_at will be auto-generated if left empty</p>
                <p className="text-xs text-amber-600"><strong>Security:</strong> Each member receives a secure random password and must change it on first login.</p>
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
                      Successfully uploaded ({results.success.length})
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

export default BulkUpload;
