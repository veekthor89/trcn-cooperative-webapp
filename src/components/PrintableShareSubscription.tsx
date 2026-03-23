import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface PrintableShareSubscriptionProps {
  subscription: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function PrintableShareSubscription({
  subscription,
  isOpen,
  onClose,
}: PrintableShareSubscriptionProps) {
  const handlePrint = () => {
    window.print();
  };

  const generatePaymentSchedule = () => {
    if (subscription.payment_method !== "salary_deduction" || !subscription.deduction_months) {
      return [];
    }

    const schedule = [];
    const monthlyAmount = subscription.monthly_deduction_amount;

    for (let i = 1; i <= subscription.deduction_months; i++) {
      schedule.push({
        month: i,
        amount: monthlyAmount,
      });
    }
    return schedule;
  };

  const schedule = generatePaymentSchedule();

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
              Share Subscription Application Form
            </h3>
            <div className="flex justify-between mt-4 text-sm">
              <p>
                <strong>Application Date:</strong> {new Date(subscription.created_at).toLocaleDateString()}
              </p>
              <p>
                <strong>Application No:</strong> {subscription.application_number}
              </p>
            </div>
          </div>

          {/* Member Information */}
          <div className="mb-6">
            <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Member Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Full Name:</p>
                <p className="font-semibold border-b border-dotted pb-1">{subscription.profiles?.full_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">TRCN Number:</p>
                <p className="font-semibold border-b border-dotted pb-1">{subscription.profiles?.member_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone Number:</p>
                <p className="font-semibold border-b border-dotted pb-1">{subscription.profiles?.phone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email Address:</p>
                <p className="font-semibold border-b border-dotted pb-1">{subscription.profiles?.email}</p>
              </div>
            </div>
          </div>

          {/* Share Details */}
          <div className="mb-6">
            <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Share Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Number of Shares Requested:</p>
                <p className="font-semibold border-b border-dotted pb-1">{subscription.shares_requested}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Price per Share:</p>
                <p className="font-semibold border-b border-dotted pb-1">
                  ₦{subscription.price_per_share.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Amount:</p>
                <p className="font-semibold border-b border-dotted pb-1">₦{subscription.total_cost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Shares (Before):</p>
                <p className="font-semibold border-b border-dotted pb-1">{subscription.current_shares_before}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Shares (After Approval):</p>
                <p className="font-semibold border-b border-dotted pb-1">{subscription.shares_after}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Method:</p>
                <p className="font-semibold border-b border-dotted pb-1 capitalize">
                  {subscription.payment_method.replace("_", " ")}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="mb-6">
            <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Payment Information</h4>
            {subscription.payment_method === "salary_deduction" ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Deduction Period:</p>
                  <p className="font-semibold border-b border-dotted pb-1">{subscription.deduction_months} months</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Monthly Deduction Amount:</p>
                  <p className="font-semibold border-b border-dotted pb-1">
                    ₦{subscription.monthly_deduction_amount?.toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Payment Reference:</p>
                  <p className="font-semibold border-b border-dotted pb-1">
                    {subscription.payment_reference || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Amount:</p>
                  <p className="font-semibold border-b border-dotted pb-1">
                    ₦{subscription.total_cost.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Payment Schedule (if applicable) */}
          {schedule.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Payment Schedule</h4>
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-primary/10">
                    <th className="border border-gray-300 p-2">Month</th>
                    <th className="border border-gray-300 p-2">Deduction Amount</th>
                    <th className="border border-gray-300 p-2">Status</th>
                    <th className="border border-gray-300 p-2">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((item) => (
                    <tr key={item.month}>
                      <td className="border border-gray-300 p-2 text-center">{item.month}</td>
                      <td className="border border-gray-300 p-2 text-center">₦{item.amount?.toLocaleString()}</td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-primary/5">
                    <td className="border border-gray-300 p-2">TOTAL</td>
                    <td className="border border-gray-300 p-2 text-center">
                      ₦{subscription.total_cost.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 p-2" colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Declarations */}
          <div className="mb-6">
            <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Declarations</h4>
            <div className="space-y-2 text-sm">
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={subscription.declaration_1} readOnly className="mt-1" />
                <span>
                  I confirm that I am a registered member of TRCN Cooperative Society and understand the terms and
                  conditions of share subscription.
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={subscription.declaration_2} readOnly className="mt-1" />
                <span>
                  I understand that shares cannot be withdrawn or transferred without approval from the management
                  committee.
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={subscription.declaration_3} readOnly className="mt-1" />
                <span>
                  I agree to the terms of payment and understand that dividends will be distributed based on the number
                  of shares held.
                </span>
              </label>
            </div>
          </div>

          {/* Signatures */}
          <div className="mb-6">
            <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Signatures</h4>
            <div className="space-y-6">
              <div>
                <p className="text-sm mb-4">
                  I hereby apply for the above-mentioned shares and agree to all terms and conditions of the TRCN
                  Cooperative Society.
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
              Share subscriptions are subject to the rules and regulations of TRCN Cooperative Society. Shares entitle
              the holder to dividends based on the society's annual performance. Shares cannot be transferred or
              withdrawn without management approval.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
