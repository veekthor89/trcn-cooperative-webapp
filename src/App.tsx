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
import SpecialContributionApplication from "./pages/SpecialContributionApplication";
import AdminSpecialContributions from "./pages/AdminSpecialContributions";
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
          <Route path="/dashboard/special-contribution/apply" element={<SpecialContributionApplication />} />
          <Route path="/dashboard/admin/special-contributions" element={<AdminSpecialContributions />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
