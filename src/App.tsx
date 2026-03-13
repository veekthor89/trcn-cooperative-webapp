import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Savings from "./pages/Savings";
import Loans from "./pages/Loans";
import LoanApplication from "./pages/LoanApplication";
import Transactions from "./pages/Transactions";
import BulkUpload from "./pages/BulkUpload";
import BulkUploadAccounts from "./pages/BulkUploadAccounts";
import BulkUploadLoans from "./pages/BulkUploadLoans";
import BulkUploadTransactions from "./pages/BulkUploadTransactions";
import BulkUploadSpecialContributions from "./pages/BulkUploadSpecialContributions";
import SpecialContributions from "./pages/SpecialContributions";
import AdminSpecialContributions from "./pages/AdminSpecialContributions";
import Shares from "./pages/Shares";
import AdminShareSubscriptions from "./pages/AdminShareSubscriptions";
import AdminLoanApplications from "./pages/AdminLoanApplications";
import FinancialSecretaryDashboard from "./pages/FinancialSecretaryDashboard";
import PresidentDashboard from "./pages/PresidentDashboard";
import TreasurerDashboard from "./pages/TreasurerDashboard";
import ExcoViewDashboard from "./pages/ExcoViewDashboard";
import AdminReports from "./pages/AdminReports";
import ForceChangePassword from "./pages/ForceChangePassword";
import AdminDepositRequests from "./pages/AdminDepositRequests";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import MemberAnnouncements from "./pages/MemberAnnouncements";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/change-password" element={<ForceChangePassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/profile" element={<Profile />} />
          <Route path="/dashboard/savings" element={<Savings />} />
          <Route path="/dashboard/loans" element={<Loans />} />
          <Route path="/dashboard/loan-application" element={<LoanApplication />} />
          <Route path="/dashboard/transactions" element={<Transactions />} />
          <Route path="/dashboard/bulk-upload" element={<BulkUpload />} />
          <Route path="/dashboard/bulk-upload-accounts" element={<BulkUploadAccounts />} />
          <Route path="/dashboard/bulk-upload-loans" element={<BulkUploadLoans />} />
          <Route path="/dashboard/bulk-upload-transactions" element={<BulkUploadTransactions />} />
          <Route path="/dashboard/bulk-upload-special-contributions" element={<BulkUploadSpecialContributions />} />
          <Route path="/dashboard/special-contributions" element={<SpecialContributions />} />
          <Route path="/dashboard/admin/special-contributions" element={<AdminSpecialContributions />} />
          <Route path="/dashboard/shares" element={<Shares />} />
          <Route path="/dashboard/admin/share-subscriptions" element={<AdminShareSubscriptions />} />
          <Route path="/dashboard/admin/loan-applications" element={<AdminLoanApplications />} />
          {/* EXCO Role-Based Dashboards */}
          <Route path="/dashboard/exco/financial-review" element={<FinancialSecretaryDashboard />} />
          <Route path="/dashboard/exco/president" element={<PresidentDashboard />} />
          <Route path="/dashboard/exco/treasurer" element={<TreasurerDashboard />} />
          <Route path="/dashboard/exco/overview" element={<ExcoViewDashboard />} />
          <Route path="/dashboard/admin/reports" element={<AdminReports />} />
          <Route path="/dashboard/admin/deposit-requests" element={<AdminDepositRequests />} />
          <Route path="/dashboard/admin/announcements" element={<AdminAnnouncements />} />
          <Route path="/dashboard/announcements" element={<MemberAnnouncements />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
