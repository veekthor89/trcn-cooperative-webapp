import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { AdminRoute } from "@/components/AdminRoute";
import DashboardLayout from "@/components/DashboardLayout";
import * as XLSX from "xlsx";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionError";

// ============ Column definitions ============
const ONBOARDING_COLUMNS = [
  "full_name", "email", "phone", "address", "date_of_birth",
  "savings_balance", "special_loan_amount", "trade_loan_amount",
  "normal_loan_amount", "land_loan_amount", "contribution_amount",
];

const MONTHLY_COLUMNS = [
  "full_name", "email", "savings_deduction", "contribution_amount",
  "special_loan_repayment", "trade_loan_repayment",
  "normal_loan_repayment", "land_loan_repayment", "month",
];

// ============ Helpers ============
function parseFile(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "binary", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
        resolve(rows as Record<string, any>[]);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

function downloadTemplate(name: string, columns: string[], sample: Record<string, any>) {
  const ws = XLSX.utils.json_to_sheet([sample], { header: columns });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, name);
}

function downloadErrorReport(name: string, errors: Array<{ row: number; email?: string; reason: string }>) {
  const ws = XLSX.utils.json_to_sheet(errors);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Errors");
  XLSX.writeFile(wb, name);
}

// ============ Drop zone ============
interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  accept?: string;
}
const DropZone = ({ onFile, disabled, accept = ".xlsx,.csv" }: DropZoneProps) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }, [onFile, disabled]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm font-medium mb-1">Drop your .xlsx or .csv file here</p>
      <p className="text-xs text-muted-foreground mb-4">or click to browse</p>
      <Button type="button" variant="outline" size="sm" disabled={disabled}>
        <Upload className="h-4 w-4 mr-2" /> Browse File
      </Button>
    </div>
  );
};

// ============ Summary Card ============
interface SummaryProps {
  successCount: number;
  skippedCount?: number;
  errors: Array<{ row: number; email?: string; reason: string }>;
  reportName: string;
  successLabel: string;
}
const SummaryCard = ({ successCount, skippedCount, errors, reportName, successLabel }: SummaryProps) => (
  <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="flex items-center gap-2 rounded-md bg-background p-3 border">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <div>
          <p className="text-xs text-muted-foreground">{successLabel}</p>
          <p className="font-semibold">{successCount}</p>
        </div>
      </div>
      {skippedCount !== undefined && (
        <div className="flex items-center gap-2 rounded-md bg-background p-3 border">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-xs text-muted-foreground">Skipped (duplicates)</p>
            <p className="font-semibold">{skippedCount}</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 rounded-md bg-background p-3 border">
        <XCircle className="h-5 w-5 text-destructive" />
        <div>
          <p className="text-xs text-muted-foreground">Errors</p>
          <p className="font-semibold">{errors.length}</p>
        </div>
      </div>
    </div>
    {errors.length > 0 && (
      <>
        <div className="max-h-48 overflow-y-auto text-sm space-y-1 rounded-md border bg-background p-3">
          {errors.slice(0, 20).map((e, i) => (
            <p key={i} className="text-muted-foreground">
              <span className="font-medium text-foreground">Row {e.row}</span>
              {e.email ? ` (${e.email})` : ""}: {e.reason}
            </p>
          ))}
          {errors.length > 20 && <p className="text-xs text-muted-foreground">…and {errors.length - 20} more</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadErrorReport(reportName, errors)}>
          <Download className="h-4 w-4 mr-2" /> Download Error Report
        </Button>
      </>
    )}
  </div>
);

// ============ Section 1: Onboarding ============
const OnboardingSection = () => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: Array<{ row: number; email?: string; reason: string }> } | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setResult(null);
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        toast.error("No rows found in file");
        return;
      }
      toast.info(`Processing ${rows.length} members…`);
      const { data, error } = await supabase.functions.invoke("bulk-onboard-members", {
        body: { rows },
      });
      if (error) throw error;
      setResult(data);
      if (data.created > 0) toast.success(`Created ${data.created} member${data.created > 1 ? "s" : ""}`);
      if (data.errors.length > 0) toast.error(`${data.errors.length} row${data.errors.length > 1 ? "s" : ""} failed`);
    } catch (err) {
      toast.error(parseEdgeFunctionError(err) || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Member Onboarding</CardTitle>
        <CardDescription>
          Use this to onboard new members onto the platform. Download the template, fill in member details and upload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() =>
              downloadTemplate("member_onboarding_template.xlsx", ONBOARDING_COLUMNS, {
                full_name: "John Doe",
                email: "john@example.com",
                phone: "08012345678",
                address: "123 Main St, Lagos",
                date_of_birth: "1990-05-15",
                savings_balance: 50000,
                special_loan_amount: 0,
                trade_loan_amount: 0,
                normal_loan_amount: 0,
                land_loan_amount: 0,
                contribution_amount: 0,
              })
            }
          >
            <Download className="h-4 w-4 mr-2" /> Download Template
          </Button>
        </div>
        <DropZone onFile={handleFile} disabled={uploading} />
        {uploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Processing upload…
          </div>
        )}
        {result && (
          <SummaryCard
            successCount={result.created}
            skippedCount={result.skipped}
            errors={result.errors}
            reportName="member_onboarding_errors.xlsx"
            successLabel="Members created"
          />
        )}
      </CardContent>
    </Card>
  );
};

// ============ Section 2: Monthly deductions ============
const MonthlySection = () => {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ updated: number; errors: Array<{ row: number; email?: string; reason: string }> } | null>(null);
  const [pendingRows, setPendingRows] = useState<Record<string, any>[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const run = async (rows: Record<string, any>[], confirmOverride: boolean) => {
    setUploading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-monthly-deductions", {
        body: { rows, month, confirmOverride },
      });
      if (error) throw error;
      if (data.requiresConfirmation) {
        setPendingRows(rows);
        setConfirmOpen(true);
        setUploading(false);
        return;
      }
      setResult(data);
      if (data.updated > 0) toast.success(`Updated ${data.updated} member${data.updated > 1 ? "s" : ""}`);
      if (data.errors.length > 0) toast.error(`${data.errors.length} row${data.errors.length > 1 ? "s" : ""} failed`);
    } catch (err) {
      toast.error(parseEdgeFunctionError(err) || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      toast.error("Please select a valid month first");
      return;
    }
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        toast.error("No rows found in file");
        return;
      }
      toast.info(`Processing ${rows.length} rows…`);
      await run(rows, false);
    } catch (err) {
      toast.error("Failed to read file");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Monthly Update</CardTitle>
          <CardDescription>
            Use this every month to record salary deductions for savings, contributions and loan repayments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="month-picker">Month</Label>
              <Input
                id="month-picker"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <Button
              variant="outline"
              onClick={() =>
                downloadTemplate("monthly_deductions_template.xlsx", MONTHLY_COLUMNS, {
                  full_name: "John Doe",
                  email: "john@example.com",
                  savings_deduction: 10000,
                  contribution_amount: 5000,
                  special_loan_repayment: 0,
                  trade_loan_repayment: 0,
                  normal_loan_repayment: 0,
                  land_loan_repayment: 0,
                  month,
                })
              }
            >
              <Download className="h-4 w-4 mr-2" /> Download Template
            </Button>
          </div>
          <DropZone onFile={handleFile} disabled={uploading} />
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Processing upload…
            </div>
          )}
          {result && (
            <SummaryCard
              successCount={result.updated}
              errors={result.errors}
              reportName="monthly_deductions_errors.xlsx"
              successLabel="Members updated"
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Records already exist for {month}</AlertDialogTitle>
            <AlertDialogDescription>
              Records for {month} already exist. Uploading again will create duplicate transactions. Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingRows(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRows) run(pendingRows, true);
                setPendingRows(null);
              }}
            >
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ============ Page ============
const BulkUpload = () => {
  return (
    <DashboardLayout>
      <AdminRoute>
        <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-5xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Bulk Upload</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Onboard new members or record monthly salary deductions.
            </p>
          </div>

          <OnboardingSection />
          <Separator />
          <MonthlySection />
        </div>
      </AdminRoute>
    </DashboardLayout>
  );
};

export default BulkUpload;
