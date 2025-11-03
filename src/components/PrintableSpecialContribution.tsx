import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface PrintableSpecialContributionProps {
  contribution: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function PrintableSpecialContribution({
  contribution,
  isOpen,
  onClose,
}: PrintableSpecialContributionProps) {
  const handlePrint = () => {
    window.print();
  };

  const generateDeductionSchedule = () => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
    ];
    return months.map((month, index) => ({
      month: `${month} ${contribution.contribution_year}`,
      amount: contribution.monthly_amount,
      number: index + 1,
    }));
  };

  const schedule = generateDeductionSchedule();

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
              Special Contribution Application Form
            </h3>
            <div className="flex justify-between mt-4 text-sm">
              <p>
                <strong>Application Date:</strong> {new Date(contribution.created_at).toLocaleDateString()}
              </p>
              <p>
                <strong>Reference No:</strong> {contribution.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Member Information */}
          <div className="mb-6">
            <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Member Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Full Name:</p>
                <p className="font-semibold border-b border-dotted pb-1">{contribution.profiles?.full_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Member ID:</p>
                <p className="font-semibold border-b border-dotted pb-1">{contribution.member_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone Number:</p>
                <p className="font-semibold border-b border-dotted pb-1">{contribution.profiles?.phone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email Address:</p>
                <p className="font-semibold border-b border-dotted pb-1">{contribution.profiles?.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Department:</p>
                <p className="font-semibold border-b border-dotted pb-1">{contribution.department || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">State of Assignment:</p>
                <p className="font-semibold border-b border-dotted pb-1">{contribution.state_of_assignment || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Contribution Details */}
          <div className="mb-6">
            <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Contribution Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Monthly Deduction Amount:</p>
                <p className="font-semibold border-b border-dotted pb-1">
                  ₦{contribution.monthly_amount?.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Number of Months:</p>
                <p className="font-semibold border-b border-dotted pb-1">11 months</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Contribution:</p>
                <p className="font-semibold border-b border-dotted pb-1">
                  ₦{contribution.total_expected?.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Deduction Period:</p>
                <p className="font-semibold border-b border-dotted pb-1">
                  January - November {contribution.contribution_year}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Purpose Category:</p>
                <p className="font-semibold border-b border-dotted pb-1 capitalize">
                  {contribution.purpose_category?.replace("_", " ")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Maturity Date:</p>
                <p className="font-semibold border-b border-dotted pb-1">
                  {contribution.maturity_date
                    ? new Date(contribution.maturity_date).toLocaleDateString()
                    : `November ${contribution.contribution_year}`}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-muted-foreground">Purpose Description:</p>
              <p className="font-semibold border-b border-dotted pb-1">{contribution.purpose_description || "N/A"}</p>
            </div>
          </div>

          {/* Bank Details */}
          <div className="mb-6">
            <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Bank Details (For Withdrawal)</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Bank Name:</p>
                <p className="font-semibold border-b border-dotted pb-1">{contribution.bank_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Account Number:</p>
                <p className="font-semibold border-b border-dotted pb-1">{contribution.account_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Account Name:</p>
                <p className="font-semibold border-b border-dotted pb-1">{contribution.account_name}</p>
              </div>
            </div>
          </div>

          {/* Deduction Schedule */}
          <div className="mb-6 page-break">
            <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Deduction Schedule</h4>
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
                  <tr key={item.number}>
                    <td className="border border-gray-300 p-2">{item.month}</td>
                    <td className="border border-gray-300 p-2 text-center">₦{item.amount?.toLocaleString()}</td>
                    <td className="border border-gray-300 p-2"></td>
                    <td className="border border-gray-300 p-2"></td>
                  </tr>
                ))}
                <tr className="font-bold bg-primary/5">
                  <td className="border border-gray-300 p-2">TOTAL</td>
                  <td className="border border-gray-300 p-2 text-center">
                    ₦{contribution.total_expected?.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 p-2" colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Declarations & Signatures */}
          <div className="mb-6">
            <h4 className="font-bold text-lg mb-3 bg-primary/10 p-2">Declaration & Signatures</h4>
            <div className="space-y-6">
              <div>
                <p className="text-sm mb-4">
                  I hereby declare that the information provided above is true and accurate. I understand that:
                </p>
                <ul className="text-sm list-disc list-inside mb-4 space-y-1">
                  <li>Monthly deductions will be made from my salary from January to November {contribution.contribution_year}</li>
                  <li>The total contribution will be paid to me at the end of November {contribution.contribution_year}</li>
                  <li>This contribution is subject to the rules and regulations of TRCN Cooperative Society</li>
                  <li>I will not withdraw before the maturity date unless in exceptional circumstances approved by the management</li>
                </ul>
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
              This special contribution is subject to the rules and regulations of TRCN Cooperative Society. The total
              contribution will be paid at the end of November {contribution.contribution_year}. Early withdrawal may
              attract penalties unless approved by management.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
