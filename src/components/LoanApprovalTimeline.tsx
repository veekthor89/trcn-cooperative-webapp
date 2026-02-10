import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Clock, ArrowRight, Info, Banknote } from "lucide-react";

interface TimelineEntry {
  id: string;
  action: string;
  performed_by: string;
  performer_role: string;
  performer_name: string;
  comments: string | null;
  previous_status: string;
  new_status: string;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  submitted: { icon: ArrowRight, label: 'Application Submitted', color: 'text-blue-500' },
  financial_approved: { icon: CheckCircle, label: 'Financial Review Approved', color: 'text-green-500' },
  financial_rejected: { icon: XCircle, label: 'Financial Review Rejected', color: 'text-red-500' },
  presidential_approved: { icon: CheckCircle, label: 'Presidential Approval', color: 'text-green-600' },
  presidential_rejected: { icon: XCircle, label: 'Presidential Rejection', color: 'text-red-600' },
  sent_back: { icon: ArrowRight, label: 'Sent Back for Review', color: 'text-orange-500' },
  disbursed: { icon: Banknote, label: 'Funds Disbursed', color: 'text-emerald-600' },
  info_requested: { icon: Info, label: 'Info Requested', color: 'text-amber-500' },
};

export default function LoanApprovalTimeline({ applicationId }: { applicationId: string }) {
  const [history, setHistory] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("loan_approval_history")
        .select("*")
        .eq("loan_application_id", applicationId)
        .order("created_at", { ascending: true });

      if (!error) setHistory(data || []);
      setLoading(false);
    };

    fetchHistory();
  }, [applicationId]);

  if (loading) return <div className="animate-pulse h-20 bg-muted rounded" />;
  if (history.length === 0) return <p className="text-sm text-muted-foreground">No approval history yet</p>;

  return (
    <div className="space-y-4">
      {history.map((entry, index) => {
        const config = ACTION_CONFIG[entry.action] || { icon: Clock, label: entry.action, color: 'text-muted-foreground' };
        const Icon = config.icon;
        
        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`rounded-full p-1.5 ${config.color} bg-background border`}>
                <Icon className="h-4 w-4" />
              </div>
              {index < history.length - 1 && (
                <div className="w-px h-full bg-border min-h-[20px]" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <p className="text-sm font-medium">{config.label}</p>
              <p className="text-xs text-muted-foreground">
                by {entry.performer_name} • {new Date(entry.created_at).toLocaleString()}
              </p>
              {entry.comments && (
                <p className="text-sm mt-1 text-muted-foreground italic">"{entry.comments}"</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
