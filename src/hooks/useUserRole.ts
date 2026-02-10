import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ExcoRole = 
  | 'member' 
  | 'admin' 
  | 'loan_officer'
  | 'president' 
  | 'vice_president' 
  | 'general_secretary' 
  | 'assistant_general_secretary' 
  | 'financial_secretary' 
  | 'assistant_financial_secretary' 
  | 'treasurer' 
  | 'assistant_treasurer' 
  | 'pro';

const FINANCIAL_ROLES: ExcoRole[] = ['financial_secretary', 'assistant_financial_secretary'];
const PRESIDENT_ROLES: ExcoRole[] = ['president'];
const TREASURER_ROLES: ExcoRole[] = ['treasurer', 'assistant_treasurer'];
const VIEW_ONLY_ROLES: ExcoRole[] = ['vice_president', 'general_secretary', 'assistant_general_secretary', 'pro'];
const ALL_EXCO_ROLES: ExcoRole[] = [...PRESIDENT_ROLES, ...FINANCIAL_ROLES, ...TREASURER_ROLES, ...VIEW_ONLY_ROLES];

export const ROLE_LABELS: Record<ExcoRole, string> = {
  member: 'Member',
  admin: 'Admin',
  loan_officer: 'Loan Officer',
  president: 'President',
  vice_president: 'Vice President',
  general_secretary: 'General Secretary',
  assistant_general_secretary: 'Assistant General Secretary',
  financial_secretary: 'Financial Secretary',
  assistant_financial_secretary: 'Assistant Financial Secretary',
  treasurer: 'Treasurer',
  assistant_treasurer: 'Assistant Treasurer',
  pro: 'Public Relations Officer',
};

export const useUserRole = () => {
  const [roles, setRoles] = useState<ExcoRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRoles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRoles([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error checking roles:', error);
          setRoles([]);
        } else {
          setRoles((data || []).map(r => r.role as ExcoRole));
        }
      } catch (error) {
        console.error('Error checking roles:', error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    checkRoles();
  }, []);

  const hasRole = (role: ExcoRole) => roles.includes(role);
  const hasAnyRole = (checkRoles: ExcoRole[]) => checkRoles.some(r => roles.includes(r));

  return { 
    roles,
    loading,
    isAdmin: hasRole('admin'),
    isPresident: hasRole('president'),
    isFinancialSecretary: hasAnyRole(FINANCIAL_ROLES),
    isTreasurer: hasAnyRole(TREASURER_ROLES),
    isExco: hasAnyRole(ALL_EXCO_ROLES),
    isViewOnlyExco: hasAnyRole(VIEW_ONLY_ROLES) && !hasAnyRole([...FINANCIAL_ROLES, ...PRESIDENT_ROLES, ...TREASURER_ROLES]),
    hasRole,
    hasAnyRole,
    primaryRole: roles.find(r => ALL_EXCO_ROLES.includes(r)) || roles.find(r => r === 'admin') || roles[0] || 'member',
  };
};
