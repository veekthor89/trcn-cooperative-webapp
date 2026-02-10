import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole, ExcoRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

interface ExcoRouteProps {
  children: ReactNode;
  allowedRoles: ExcoRole[];
  fallbackPath?: string;
}

export const ExcoRoute = ({ children, allowedRoles, fallbackPath = "/dashboard" }: ExcoRouteProps) => {
  const { roles, loading, isAdmin } = useUserRole();
  const navigate = useNavigate();

  const hasAccess = isAdmin || allowedRoles.some(r => roles.includes(r));

  useEffect(() => {
    if (!loading && !hasAccess) {
      toast.error("Access denied. You don't have the required permissions.");
      navigate(fallbackPath);
    }
  }, [hasAccess, loading, navigate, fallbackPath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) return null;

  return <>{children}</>;
};
