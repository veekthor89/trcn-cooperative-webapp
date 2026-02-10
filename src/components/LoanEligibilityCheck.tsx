import { CheckCircle, XCircle } from "lucide-react";

interface EligibilityCheckProps {
  monthlyIncome: number;
  monthlyPayment: number;
  existingLoanCount: number;
  requestedAmount: number;
  loanType: string;
  existingMonthlyDeductions: number;
}

const LOAN_LIMITS: Record<string, number> = {
  special: 150000,
  trade: 400000,
  normal: 3000000,
  long_term: 7000000,
};

export default function LoanEligibilityCheck({
  monthlyIncome,
  monthlyPayment,
  existingLoanCount,
  requestedAmount,
  loanType,
  existingMonthlyDeductions,
}: EligibilityCheckProps) {
  const maxAllowed = monthlyIncome * 0.4;
  const totalMonthly = existingMonthlyDeductions + monthlyPayment;
  const within40Percent = totalMonthly <= maxAllowed;
  const under3Loans = existingLoanCount < 3;
  const withinLimit = requestedAmount <= (LOAN_LIMITS[loanType] || 0);
  const hasIncome = monthlyIncome > 0;

  const checks = [
    { label: '40% Salary Deduction Rule', pass: within40Percent, detail: `${((totalMonthly / monthlyIncome) * 100).toFixed(1)}% of salary (max 40%)` },
    { label: 'Active Loan Limit', pass: under3Loans, detail: `${existingLoanCount}/3 active loans` },
    { label: 'Loan Amount Within Limit', pass: withinLimit, detail: `₦${requestedAmount.toLocaleString()} / ₦${(LOAN_LIMITS[loanType] || 0).toLocaleString()}` },
    { label: 'Income Verified', pass: hasIncome, detail: monthlyIncome ? `₦${monthlyIncome.toLocaleString()}/month` : 'Not provided' },
  ];

  const allPass = checks.every(c => c.pass);

  return (
    <div className="space-y-3">
      <div className={`p-3 rounded-lg text-sm font-medium ${allPass ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
        {allPass ? '✓ Eligible for this loan' : '✗ Does not meet all eligibility criteria'}
      </div>
      <div className="space-y-2">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {check.pass ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span>{check.label}</span>
            </div>
            <span className={`text-xs ${check.pass ? 'text-green-600' : 'text-red-600'}`}>
              {check.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
