import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);

export function useReportsData() {
  const loansQuery = useQuery({
    queryKey: ["reports-loans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("loans").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const loanApplicationsQuery = useQuery({
    queryKey: ["reports-loan-applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("loan_applications").select("*, profiles:user_id(full_name, member_number, department)");
      if (error) throw error;
      return data || [];
    },
  });

  const accountsQuery = useQuery({
    queryKey: ["reports-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const transactionsQuery = useQuery({
    queryKey: ["reports-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const profilesQuery = useQuery({
    queryKey: ["reports-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, member_number, department, created_at");
      if (error) throw error;
      return data || [];
    },
  });

  const specialContributionsQuery = useQuery({
    queryKey: ["reports-special-contributions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("special_contributions").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const shareSubscriptionsQuery = useQuery({
    queryKey: ["reports-share-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("share_subscriptions").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading =
    loansQuery.isLoading ||
    loanApplicationsQuery.isLoading ||
    accountsQuery.isLoading ||
    transactionsQuery.isLoading ||
    profilesQuery.isLoading ||
    specialContributionsQuery.isLoading ||
    shareSubscriptionsQuery.isLoading;

  const refetchAll = () => {
    loansQuery.refetch();
    loanApplicationsQuery.refetch();
    accountsQuery.refetch();
    transactionsQuery.refetch();
    profilesQuery.refetch();
    specialContributionsQuery.refetch();
    shareSubscriptionsQuery.refetch();
  };

  return {
    loans: loansQuery.data || [],
    loanApplications: loanApplicationsQuery.data || [],
    accounts: accountsQuery.data || [],
    transactions: transactionsQuery.data || [],
    profiles: profilesQuery.data || [],
    specialContributions: specialContributionsQuery.data || [],
    shareSubscriptions: shareSubscriptionsQuery.data || [],
    isLoading,
    refetchAll,
  };
}
