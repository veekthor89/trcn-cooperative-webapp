import { supabase } from "@/integrations/supabase/client";

export type WorkflowStatus = 
  | 'pending' 
  | 'pending_financial_review'
  | 'pending_presidential_approval'
  | 'approved_awaiting_disbursement'
  | 'disbursed'
  | 'approved'
  | 'rejected'
  | 'info_requested';

export const WORKFLOW_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending Submission', color: 'bg-muted text-muted-foreground' },
  pending_financial_review: { label: 'Pending Financial Review', color: 'bg-yellow-100 text-yellow-800' },
  pending_presidential_approval: { label: 'Pending Presidential Approval', color: 'bg-blue-100 text-blue-800' },
  approved_awaiting_disbursement: { label: 'Approved - Awaiting Disbursement', color: 'bg-purple-100 text-purple-800' },
  disbursed: { label: 'Disbursed - Active', color: 'bg-green-100 text-green-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  info_requested: { label: 'Info Requested', color: 'bg-orange-100 text-orange-800' },
};

interface WorkflowAction {
  applicationId: string;
  userId: string;
  comments?: string;
}

export const useLoanWorkflow = () => {

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    return { 
      user, 
      name: profile?.full_name || "Unknown",
      roles: (roles || []).map(r => r.role)
    };
  };

  const addHistory = async (
    loanApplicationId: string,
    action: string,
    performedBy: string,
    performerRole: string,
    performerName: string,
    previousStatus: string,
    newStatus: string,
    comments?: string
  ) => {
    await supabase.from("loan_approval_history").insert({
      loan_application_id: loanApplicationId,
      action,
      performed_by: performedBy,
      performer_role: performerRole,
      performer_name: performerName,
      previous_status: previousStatus,
      new_status: newStatus,
      comments,
    });
  };

  const notifyUser = async (userId: string, type: string, message: string) => {
    await supabase.from("notifications").insert({ user_id: userId, type, message });
  };

  const notifyRoleHolders = async (role: string, type: string, message: string) => {
    const { data: roleUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", role as any);
    
    if (roleUsers?.length) {
      const notifications = roleUsers.map(ru => ({
        user_id: ru.user_id,
        type,
        message,
      }));
      await supabase.from("notifications").insert(notifications);
    }
  };

  const getApplicationWithProfile = async (applicationId: string) => {
    const { data } = await supabase
      .from("loan_applications")
      .select("*")
      .eq("id", applicationId)
      .single();
    
    if (data) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user_id)
        .single();
      return { ...data, applicant_name: profile?.full_name || "Unknown" };
    }
    return null;
  };

  // Stage 2: Financial Secretary approves
  const financialApprove = async ({ applicationId, userId, comments }: WorkflowAction) => {
    const { user, name, roles } = await getCurrentUser();
    const role = roles.includes('financial_secretary') ? 'financial_secretary' : 'assistant_financial_secretary';

    const { error } = await supabase
      .from("loan_applications")
      .update({
        status: "pending_presidential_approval" as any,
        financial_reviewer_id: user.id,
        financial_review_date: new Date().toISOString(),
        financial_review_comments: comments || null,
      })
      .eq("id", applicationId);

    if (error) throw error;

    await addHistory(applicationId, 'financial_approved', user.id, role, name, 'pending_financial_review', 'pending_presidential_approval', comments);
    
    const app = await getApplicationWithProfile(applicationId);
    await notifyRoleHolders('president', 'loan_financial_approved', 
      `${name} approved loan for ${app?.applicant_name} - ${app?.loan_type} ₦${app?.requested_amount?.toLocaleString()} - Awaiting your approval`);
    
    await notifyUser(userId, 'loan_status_update', 
      'Your loan has been approved by Financial Secretary and forwarded to President for final approval.');
  };

  // Stage 2: Financial Secretary rejects
  const financialReject = async ({ applicationId, userId, comments }: WorkflowAction) => {
    const { user, name, roles } = await getCurrentUser();
    const role = roles.includes('financial_secretary') ? 'financial_secretary' : 'assistant_financial_secretary';

    const { error } = await supabase
      .from("loan_applications")
      .update({
        status: "rejected" as any,
        financial_reviewer_id: user.id,
        financial_review_date: new Date().toISOString(),
        financial_review_comments: comments || null,
        notes: comments || null,
      })
      .eq("id", applicationId);

    if (error) throw error;

    await addHistory(applicationId, 'financial_rejected', user.id, role, name, 'pending_financial_review', 'rejected', comments);
    await notifyUser(userId, 'loan_rejected', `Your loan application has been rejected. Reason: ${comments || 'Not specified'}`);
  };

  // Stage 2: Request more info
  const requestMoreInfo = async ({ applicationId, userId, comments }: WorkflowAction) => {
    const { user, name, roles } = await getCurrentUser();
    const role = roles.includes('financial_secretary') ? 'financial_secretary' : 'assistant_financial_secretary';

    const { error } = await supabase
      .from("loan_applications")
      .update({
        status: "info_requested" as any,
        info_request_message: comments || null,
      })
      .eq("id", applicationId);

    if (error) throw error;

    await addHistory(applicationId, 'info_requested', user.id, role, name, 'pending_financial_review', 'info_requested', comments);
    await notifyUser(userId, 'loan_info_requested', `Additional information requested for your loan application: ${comments}`);
  };

  // Stage 3: Presidential approval
  const presidentialApprove = async ({ applicationId, userId, comments }: WorkflowAction) => {
    const { user, name } = await getCurrentUser();

    const { error } = await supabase
      .from("loan_applications")
      .update({
        status: "approved_awaiting_disbursement" as any,
        approved_by: user.id,
        approval_date: new Date().toISOString(),
        presidential_approval_date: new Date().toISOString(),
        presidential_comments: comments || null,
      })
      .eq("id", applicationId);

    if (error) throw error;

    await addHistory(applicationId, 'presidential_approved', user.id, 'president', name, 'pending_presidential_approval', 'approved_awaiting_disbursement', comments);
    
    const app = await getApplicationWithProfile(applicationId);
    await notifyRoleHolders('treasurer', 'loan_ready_disbursement',
      `President approved loan for ${app?.applicant_name} - ${app?.loan_type} ₦${app?.requested_amount?.toLocaleString()} - Ready for disbursement`);
    await notifyRoleHolders('assistant_treasurer', 'loan_ready_disbursement',
      `President approved loan for ${app?.applicant_name} - ${app?.loan_type} ₦${app?.requested_amount?.toLocaleString()} - Ready for disbursement`);
    
    await notifyUser(userId, 'loan_status_update',
      'Your loan has been approved by the President and forwarded to Treasurer for disbursement.');
  };

  // Stage 3: Presidential rejection
  const presidentialReject = async ({ applicationId, userId, comments }: WorkflowAction) => {
    const { user, name } = await getCurrentUser();

    const { error } = await supabase
      .from("loan_applications")
      .update({
        status: "rejected" as any,
        presidential_comments: comments || null,
      })
      .eq("id", applicationId);

    if (error) throw error;

    await addHistory(applicationId, 'presidential_rejected', user.id, 'president', name, 'pending_presidential_approval', 'rejected', comments);
    await notifyUser(userId, 'loan_rejected', `Your loan application has been rejected by the President. Reason: ${comments || 'Not specified'}`);
  };

  // Stage 3: Send back for review
  const sendBackForReview = async ({ applicationId, userId, comments }: WorkflowAction) => {
    const { user, name } = await getCurrentUser();

    const { error } = await supabase
      .from("loan_applications")
      .update({
        status: "pending_financial_review" as any,
        presidential_comments: comments || null,
      })
      .eq("id", applicationId);

    if (error) throw error;

    await addHistory(applicationId, 'sent_back', user.id, 'president', name, 'pending_presidential_approval', 'pending_financial_review', comments);
    await notifyRoleHolders('financial_secretary', 'loan_sent_back',
      `President sent back a loan application for re-review: ${comments || 'No specific reason'}`);
    await notifyRoleHolders('assistant_financial_secretary', 'loan_sent_back',
      `President sent back a loan application for re-review: ${comments || 'No specific reason'}`);
  };

  // Stage 4: Disbursement
  const markAsDisbursed = async (
    applicationId: string,
    userId: string,
    disbursementDetails: {
      method: string;
      reference: string;
      notes?: string;
      amount: number;
      loanType: string;
      interestAmount: number;
      repaymentPeriod: number;
      monthlyPayment: number;
    }
  ) => {
    const { user, name, roles } = await getCurrentUser();
    const role = roles.includes('treasurer') ? 'treasurer' : 'assistant_treasurer';

    const { error: appError } = await supabase
      .from("loan_applications")
      .update({
        status: "disbursed" as any,
        disbursement_date: new Date().toISOString(),
        disbursement_method: disbursementDetails.method,
        disbursement_reference: disbursementDetails.reference,
        disbursed_by: user.id,
        disbursement_notes: disbursementDetails.notes || null,
      })
      .eq("id", applicationId);

    if (appError) throw appError;

    const { error: loanError } = await supabase.from("loans").insert({
      user_id: userId,
      loan_type: disbursementDetails.loanType as any,
      principal_amount: disbursementDetails.amount,
      interest_rate: (disbursementDetails.interestAmount / disbursementDetails.amount) * 100,
      repayment_period: disbursementDetails.repaymentPeriod,
      outstanding_balance: disbursementDetails.amount + disbursementDetails.interestAmount,
      monthly_payment: disbursementDetails.monthlyPayment,
      status: "active",
      next_payment_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split("T")[0],
    });

    if (loanError) throw loanError;

    await addHistory(applicationId, 'disbursed', user.id, role, name, 'approved_awaiting_disbursement', 'disbursed', disbursementDetails.notes);
    await notifyUser(userId, 'loan_disbursed', 
      `Your loan of ₦${disbursementDetails.amount.toLocaleString()} has been disbursed. Check your account.`);
  };

  return {
    financialApprove,
    financialReject,
    requestMoreInfo,
    presidentialApprove,
    presidentialReject,
    sendBackForReview,
    markAsDisbursed,
  };
};
