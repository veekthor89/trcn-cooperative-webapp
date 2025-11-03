import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface PrintableLoanApplicationProps {
  application: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function PrintableLoanApplication({ application, isOpen, onClose }: PrintableLoanApplicationProps) {
  const handlePrint = () => {
    window.print();
  };

  const generateRepaymentSchedule = () => {
    const schedule = [];
    const monthlyPayment = application.monthly_payment || 0;
    const adminCharge = 200;
    const firstMonthPayment = monthlyPayment + adminCharge;

    for (let i = 1; i <= application.repayment_period; i++) {
      schedule.push({
        month: i,
        payment: i === 1 ? firstMonthPayment : monthlyPayment,
      });
    }
    return schedule;
  };

  const schedule = generateRepaymentSchedule();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
        <div className="print-hide flex justify-end gap-2 p-4 border-b sticky top-0 bg-background z-10">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Print Application
          </Button>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="w-4 h-4" />
            Close
          </Button>
        </div>

        <div className="print-content p-8">
          {/* Header */}
          <div className="text-center mb-8 border-b-2 border-primary pb-6">
            <div className="flex justify-center items-center gap-4 mb-4">
              <img src="/src/assets/trcn-logo.png" alt="TRCN Logo" className="h-16" />
              <img src="/src/assets/cooperative-logo.png" alt="Cooperative Logo" className="h-16" />
            </div>
            <h1 className="text-2xl font-bold mb-2">TEACHERS REGISTRATION COUNCIL OF NIGERIA</h1>
            <h2 className="text-xl font-semibold">COOPERATIVE SOCIETY</h2>
            <p className="text-sm text-muted-foreground mt-2">
              No. 8 Zambezi Crescent, Off Aguiyi Ironsi Street, Maitama, Abuja
            </p>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold uppercase border-b-2 border-primary inline-block pb-1">
              Loan Application Form
            </h3>
            <div className="flex justify-between mt-4 text-sm">
              <p>
                <strong>Application Date:</strong> {new Date(application.application_date).toLocaleDateString()}
              </p>
              <p>
                <strong>Reference No:</strong> {application.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Member Information */}
          <div className="mb-6">
            <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Member Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Full Name:</p>
                <p className="font-semibold border-b border-dotted pb-1">{application.profiles?.full_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Member ID:</p>
                <p className="font-semibold border-b border-dotted pb-1">{application.profiles?.member_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone Number:</p>
                <p className="font-semibold border-b border-dotted pb-1">{application.profiles?.phone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email Address:</p>
                <p className="font-semibold border-b border-dotted pb-1">{application.profiles?.email}</p>
              </div>
            </div>
          </div>

          {/* Loan Details */}
          <div className="mb-6">
            <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Loan Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-muted-foreground">Loan Type:</p>
                <p className="font-semibold border-b border-dotted pb-1 capitalize">
                  {application.loan_type.replace("_", " ")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Loan Duration:</p>
                <p className="font-semibold border-b border-dotted pb-1">{application.repayment_period} months</p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount Requested:</p>
                <p className="font-semibold border-b border-dotted pb-1">
                  ₦{application.requested_amount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Interest Amount:</p>
                <p className="font-semibold border-b border-dotted pb-1">
                  ₦{application.interest_amount?.toLocaleString() || "0"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount to be Received:</p>
                <p className="font-semibold border-b border-dotted pb-1">
                  ₦{application.amount_received?.toLocaleString() || "0"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Amount to Repay:</p>
                <p className="font-semibold border-b border-dotted pb-1">
                  ₦{(application.requested_amount + (application.interest_amount || 0)).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Monthly Deduction:</p>
                <p className="font-semibold border-b border-dotted pb-1">
                  ₦{application.monthly_payment?.toLocaleString() || "0"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">First Month Deduction:</p>
                <p className="font-semibold border-b border-dotted pb-1">
                  ₦{((application.monthly_payment || 0) + 200).toLocaleString()} (incl. ₦200 admin charge)
                </p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Purpose/Reason:</p>
              <p className="font-semibold border-b border-dotted pb-1">{application.purpose || "N/A"}</p>
            </div>
          </div>

          {/* Bank Details */}
          {application.bank_name && (
            <div className="mb-6">
              <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Bank Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Bank Name:</p>
                  <p className="font-semibold border-b border-dotted pb-1">{application.bank_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Account Number:</p>
                  <p className="font-semibold border-b border-dotted pb-1">{application.account_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Account Name:</p>
                  <p className="font-semibold border-b border-dotted pb-1">{application.account_name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Guarantors */}
          {application.guarantor_1_name && (
            <div className="mb-6">
              <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Guarantors Information</h4>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="font-semibold mb-2">Guarantor 1:</p>
                  <p>
                    <strong>Name:</strong> {application.guarantor_1_name}
                  </p>
                  <p>
                    <strong>Member No:</strong> {application.guarantor_1_member_number}
                  </p>
                  <p>
                    <strong>Phone:</strong> {application.guarantor_1_phone}
                  </p>
                </div>
                {application.guarantor_2_name && (
                  <div>
                    <p className="font-semibold mb-2">Guarantor 2:</p>
                    <p>
                      <strong>Name:</strong> {application.guarantor_2_name}
                    </p>
                    <p>
                      <strong>Member No:</strong> {application.guarantor_2_member_number}
                    </p>
                    <p>
                      <strong>Phone:</strong> {application.guarantor_2_phone}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Repayment Schedule */}
          <div className="mb-6 page-break">
            <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Repayment Schedule</h4>
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-primary/10">
                  <th className="border border-gray-300 p-2">Month</th>
                  <th className="border border-gray-300 p-2">Monthly Deduction</th>
                  <th className="border border-gray-300 p-2">Signature</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((item) => (
                  <tr key={item.month}>
                    <td className="border border-gray-300 p-2 text-center">{item.month}</td>
                    <td className="border border-gray-300 p-2 text-center">₦{item.payment.toLocaleString()}</td>
                    <td className="border border-gray-300 p-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Declarations & Signatures */}
          <div className="mb-6">
            <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Declaration & Signatures</h4>
            <div className="space-y-6">
              <div>
                <p className="text-sm mb-4">
                  I hereby declare that the information provided above is true and accurate to the best of my knowledge. I
                  agree to the terms and conditions of the loan and authorize monthly deductions from my salary.
                </p>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-sm mb-8">Member Signature:</p>
                    <div className="border-t border-black pt-1"></div>
                  </div>
                  <div>
                    <p className="text-sm mb-8">Date:</p>
                    <div className="border-t border-black pt-1"></div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-semibold mb-4">For Official Use Only</p>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-sm mb-8">Admin Approval Signature:</p>
                    <div className="border-t border-black pt-1"></div>
                  </div>
                  <div>
                    <p className="text-sm mb-8">Date Approved:</p>
                    <div className="border-t border-black pt-1"></div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm mb-2">Admin Comments/Notes:</p>
                  <div className="border border-gray-300 p-4 min-h-[100px]"></div>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm">Approved</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm">Rejected</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t pt-4 text-xs text-center text-muted-foreground">
            <p className="font-semibold mb-2">Terms and Conditions</p>
            <p>
              This loan is subject to the rules and regulations of TRCN Cooperative Society. Monthly deductions will be
              made from your salary until the loan is fully repaid. Failure to repay may result in legal action.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
