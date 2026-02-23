import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import trcnLogo from "@/assets/trcn-smcs-logo.png";

interface PrintableLoanApplicationProps {
  application: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function PrintableLoanApplication({ application, isOpen, onClose }: PrintableLoanApplicationProps) {
  const handlePrint = () => {
    window.print();
  };

  const loanTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      special: "Special",
      trade: "Trade",
      normal: "Normal",
      long_term: "Land/Housing",
    };
    return labels[type] || type;
  };

  const interestInfo = (type: string) => {
    if (type === "normal" || type === "long_term") return "Deducted upfront";
    return "Added to loan";
  };

  const interestRate = (type: string) => {
    const rates: Record<string, number> = { special: 10.5, trade: 7.5, normal: 10, long_term: 10 };
    return rates[type] || 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[850px] max-h-[95vh] overflow-y-auto p-0">
        <div className="print-hide flex justify-end gap-2 p-3 border-b sticky top-0 bg-background z-10">
          <Button onClick={handlePrint} size="sm" className="gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} className="gap-2">
            <X className="w-4 h-4" /> Close
          </Button>
        </div>

        <div className="print-content a4-page px-8 py-4" style={{ fontSize: "13px", lineHeight: "1.5" }}>
          {/* Header */}
          <div className="text-center mb-3 pb-2 border-b-2 border-black">
            <img src={trcnLogo} alt="TRCN SMCS Logo" className="h-14 mx-auto mb-1" />
            <h1 className="text-base font-bold tracking-wide">TRCN STAFF MULTIPURPOSE COOPERATIVE SOCIETY</h1>
            <p className="text-[10px] text-gray-600">No. 8 Zambezi Crescent, Off Aguiyi Ironsi Street, Maitama, Abuja</p>
            <h2 className="text-sm font-bold mt-1 uppercase tracking-wider">Loan Application Form</h2>
            <div className="flex justify-between mt-1 text-[10px]">
              <span><strong>Application Date:</strong> {application.application_date ? new Date(application.application_date).toLocaleDateString("en-GB") : "N/A"}</span>
              <span><strong>Ref No:</strong> {application.id?.slice(0, 8).toUpperCase() || ""}</span>
            </div>
          </div>

          {/* Section 1: Member Information */}
          <SectionHeader title="1. Member Information" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-2">
            <Field label="Full Name" value={application.profiles?.full_name} />
            <Field label="Member ID" value={application.profiles?.member_number} />
            <Field label="Phone Number" value={application.profiles?.phone} />
            <Field label="Email Address" value={application.profiles?.email} />
            <Field label="Residential Address" value={application.profiles?.address || "N/A"} />
            <Field label="Department" value={application.profiles?.department || "N/A"} />
          </div>

          {/* Section 2: Loan Details */}
          <SectionHeader title="2. Loan Details" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-2">
            <Field label="Loan Type" value={loanTypeLabel(application.loan_type)} />
            <Field label="Amount Requested" value={`₦${application.requested_amount?.toLocaleString()}`} />
            <Field label="Loan Duration" value={`${application.repayment_period} months`} />
            <Field label="Interest Rate" value={`${interestRate(application.loan_type)}% (${interestInfo(application.loan_type)})`} />
            <Field label="Amount to be Received" value={`₦${application.amount_received?.toLocaleString() || "0"}`} />
            <Field label="Total Amount to Repay" value={`₦${((application.requested_amount || 0) + (application.interest_amount || 0)).toLocaleString()}`} />
            <Field label="Monthly Deduction" value={`₦${application.monthly_payment?.toLocaleString() || "0"}`} />
            <Field label="First Month Deduction" value={`₦${((application.monthly_payment || 0) + 200).toLocaleString()} (incl. ₦200 admin)`} />
            <div className="col-span-2">
              <Field label="Purpose of Loan" value={application.purpose || "N/A"} />
            </div>
          </div>

          {/* Section 3: Bank Details */}
          {application.bank_name && (
            <>
              <SectionHeader title="3. Bank Details" />
              <div className="grid grid-cols-3 gap-x-6 gap-y-1 mb-2">
                <Field label="Bank Name" value={application.bank_name} />
                <Field label="Account Number" value={application.account_number} />
                <Field label="Account Name" value={application.account_name} />
              </div>
            </>
          )}

          {/* Section 4: Guarantor Information */}
          {application.guarantor_1_name && (
            <>
              <SectionHeader title="4. Guarantor Information" />
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-2">
                <div>
                  <p className="font-semibold text-[10px] mb-0.5">Guarantor 1:</p>
                  <Field label="Name" value={application.guarantor_1_name} />
                  <Field label="Member ID" value={application.guarantor_1_member_number} />
                  <Field label="Phone" value={application.guarantor_1_phone} />
                </div>
                {application.guarantor_2_name && (
                  <div>
                    <p className="font-semibold text-[10px] mb-0.5">Guarantor 2:</p>
                    <Field label="Name" value={application.guarantor_2_name} />
                    <Field label="Member ID" value={application.guarantor_2_member_number} />
                    <Field label="Phone" value={application.guarantor_2_phone} />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Section 5: Official Use Only */}
          <SectionHeader title="5. Official Use Only" />
          <div className="mt-1">
            <p className="font-semibold text-[10px] mb-2">Presidential Approval:</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <p className="text-[10px] mb-4">Signature:</p>
                <div className="border-b border-black w-full"></div>
              </div>
              <div>
                <p className="text-[10px] mb-4">Date Approved:</p>
                <div className="border-b border-black w-full"></div>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] mb-4">Comments:</p>
                <div className="border-b border-black w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h4 className="font-bold text-xs bg-gray-100 px-2 py-0.5 mb-1 border-b border-gray-300 uppercase tracking-wide">
      {title}
    </h4>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-1">
      <span className="text-gray-600 shrink-0">{label}:</span>
      <span className="font-medium border-b border-dotted border-gray-400 flex-1 truncate">{value || "N/A"}</span>
    </div>
  );
}
