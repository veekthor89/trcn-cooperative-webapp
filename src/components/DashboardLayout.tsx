import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { LayoutDashboard, TrendingUp, CreditCard, User, LogOut, X, PiggyBank, Upload, Wallet, Menu, Landmark, ChevronDown, Shield, Banknote, Crown, Eye, BarChart3, ArrowDownToLine, Megaphone, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useUserRole, ROLE_LABELS } from "@/hooks/useUserRole";
import trcnLogo from "@/assets/trcn-logo.png";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileName, setProfileName] = useState("User");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [pendingLoansCount, setPendingLoansCount] = useState(0);
  const [pendingContributionsCount, setPendingContributionsCount] = useState(0);
  const [pendingDepositsCount, setPendingDepositsCount] = useState(0);
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
  const [dataManagementOpen, setDataManagementOpen] = useState(false);
  const [adminSectionOpen, setAdminSectionOpen] = useState(false);
  const [excoSectionOpen, setExcoSectionOpen] = useState(false);
  const { isAdmin, isFinancialSecretary, isPresident, isTreasurer, isExco, isViewOnlyExco, hasRole, primaryRole } = useUserRole();

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, profile_photo_url, must_change_password")
        .eq("id", userId)
        .single();

      if (!isMounted) return;

      if (data?.must_change_password) {
        navigate("/change-password", { replace: true });
        return;
      }

      if (data?.full_name) setProfileName(data.full_name);

      if (data?.profile_photo_url) {
        const pathMatch = data.profile_photo_url.match(/profile-photos\/(.+?)(\?|$)/);
        if (pathMatch) {
          const filePath = pathMatch[1];
          const { data: signedUrlData } = await supabase.storage
            .from("profile-photos")
            .createSignedUrl(filePath, 3600);

          if (isMounted && signedUrlData?.signedUrl) {
            setProfilePhotoUrl(signedUrlData.signedUrl);
          }
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);

      if (event === "SIGNED_OUT") {
        navigate("/auth", { replace: true });
        return;
      }

      if (nextSession && ["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
        void loadProfile(nextSession.user.id);
      }
    });

    const initializeAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (!isMounted) return;

      setSession(currentSession);

      if (!currentSession) {
        navigate("/auth", { replace: true });
        return;
      }

      await loadProfile(currentSession.user.id);
    };

    void initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    const fetchPendingCounts = async () => {
      if (isAdmin && session) {
        const { data: pendingLoans } = await supabase.from("loan_applications").select("id", { count: "exact" }).eq("status", "pending");
        setPendingLoansCount(pendingLoans?.length || 0);
        const { data: pendingContributions } = await supabase.from("special_contributions").select("id", { count: "exact" }).eq("application_status", "pending");
        setPendingContributionsCount(pendingContributions?.length || 0);
        const { data: pendingDeposits } = await supabase.from("deposit_requests").select("id", { count: "exact" }).eq("status", "pending");
        setPendingDepositsCount(pendingDeposits?.length || 0);
      }
    };
    fetchPendingCounts();
  }, [isAdmin, session]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error("Error signing out"); } else { toast.success("Signed out successfully"); navigate("/"); }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: PiggyBank, label: "Savings", path: "/dashboard/savings" },
    { icon: CreditCard, label: "Loans", path: "/dashboard/loans" },
    { icon: TrendingUp, label: "Transactions", path: "/dashboard/transactions" },
    { icon: Landmark, label: "Shares", path: "/dashboard/shares" },
    { icon: Megaphone, label: "Announcements", path: "/dashboard/announcements" },
    { icon: User, label: "Profile", path: "/dashboard/profile" },
  ];

  if (!session) return null;

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-background border-r border-border transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center flex-1">
                <img src={trcnLogo} alt="TRCN Cooperative Logo" className="h-16 w-auto" />
              </div>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map(item => (
              <button key={item.path} onClick={() => { navigate(item.path); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-smooth">
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            ))}

            {/* EXCO Section */}
            {(isFinancialSecretary || isPresident || isTreasurer || isViewOnlyExco) && (
              <div className="pt-6 mt-6 border-t border-border space-y-1">
                <Collapsible open={excoSectionOpen} onOpenChange={setExcoSectionOpen}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted rounded-lg transition-smooth">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">EXCO</p>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${excoSectionOpen ? 'transform rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1">
                    {isFinancialSecretary && (
                      <button onClick={() => { navigate("/dashboard/exco/financial-review"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                        <Shield className="h-5 w-5" /><span>Financial Review</span>
                      </button>
                    )}
                    {isPresident && (
                      <>
                        <button onClick={() => { navigate("/dashboard/exco/president"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                          <Crown className="h-5 w-5" /><span>President Dashboard</span>
                        </button>
                        <button onClick={() => { navigate("/dashboard/admin/announcements"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                          <Megaphone className="h-5 w-5" /><span>Manage Announcements</span>
                        </button>
                      </>
                    )}
                    {isTreasurer && (
                      <button onClick={() => { navigate("/dashboard/exco/treasurer"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                        <Banknote className="h-5 w-5" /><span>Treasurer Dashboard</span>
                      </button>
                    )}
                    {isViewOnlyExco && (
                      <>
                        <button onClick={() => { navigate("/dashboard/exco/overview"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                          <Eye className="h-5 w-5" /><span>EXCO Overview</span>
                        </button>
                        {(hasRole('general_secretary') || hasRole('pro')) && (
                          <button onClick={() => { navigate("/dashboard/admin/announcements"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                            <Megaphone className="h-5 w-5" /><span>Manage Announcements</span>
                          </button>
                        )}
                      </>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {isAdmin && (
              <div className="pt-6 mt-6 border-t border-border space-y-1">
                <Collapsible open={dataManagementOpen} onOpenChange={setDataManagementOpen}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted rounded-lg transition-smooth">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data Management</p>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${dataManagementOpen ? 'transform rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1">
                    <button onClick={() => { navigate("/dashboard/bulk-upload"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                      <Upload className="h-5 w-5" /><span>Bulk Upload Members</span>
                    </button>
                    <button onClick={() => { navigate("/dashboard/bulk-upload-accounts"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                      <Wallet className="h-5 w-5" /><span>Bulk Upload Accounts</span>
                    </button>
                    <button onClick={() => { navigate("/dashboard/bulk-upload-loans"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                      <CreditCard className="h-5 w-5" /><span>Bulk Upload Loans</span>
                    </button>
                    <button onClick={() => { navigate("/dashboard/bulk-upload-transactions"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                      <TrendingUp className="h-5 w-5" /><span>Bulk Upload Transactions</span>
                    </button>
                    <button onClick={() => { navigate("/dashboard/bulk-upload-special-contributions"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                      <PiggyBank className="h-5 w-5" /><span>Bulk Upload Contributions</span>
                    </button>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={adminSectionOpen} onOpenChange={setAdminSectionOpen} className="pt-6 mt-6 border-t border-border">
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted rounded-lg transition-smooth">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</p>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${adminSectionOpen ? 'transform rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1">
                    <button onClick={() => { navigate("/dashboard/admin/reports"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                      <BarChart3 className="h-5 w-5" /><span>Reports & Analytics</span>
                    </button>
                    <button onClick={() => { navigate("/dashboard/admin/share-subscriptions"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                      <TrendingUp className="h-5 w-5" /><span>Share Subscriptions</span>
                    </button>
                    <button onClick={() => { navigate("/dashboard/admin/loan-applications"); setSidebarOpen(false); }} className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                      <div className="flex items-center gap-3"><CreditCard className="h-5 w-5" /><span>Loan Applications</span></div>
                      {pendingLoansCount > 0 && <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">{pendingLoansCount}</span>}
                    </button>
                    <button onClick={() => { navigate("/dashboard/admin/special-contributions"); setSidebarOpen(false); }} className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                      <div className="flex items-center gap-3"><PiggyBank className="h-5 w-5" /><span>Special Contribution Applications</span></div>
                      {pendingContributionsCount > 0 && <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">{pendingContributionsCount}</span>}
                    </button>
                    <button onClick={() => { navigate("/dashboard/admin/deposit-requests"); setSidebarOpen(false); }} className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                      <div className="flex items-center gap-3"><ArrowDownToLine className="h-5 w-5" /><span>Deposit Requests</span></div>
                      {pendingDepositsCount > 0 && <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">{pendingDepositsCount}</span>}
                    </button>
                    <button onClick={() => { navigate("/dashboard/admin/announcements"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                      <Megaphone className="h-5 w-5" /><span>Announcements</span>
                    </button>
                    <button onClick={() => { navigate("/dashboard/admin/password-reset-requests"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                      <KeyRound className="h-5 w-5" /><span>Password Resets</span>
                    </button>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-4">
              <Avatar>
                <AvatarImage src={profilePhotoUrl || undefined} alt={profileName} />
                <AvatarFallback className="bg-muted text-foreground">{profileName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{profileName}</p>
                <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:bg-muted hover:text-foreground" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2"><img src={trcnLogo} alt="TRCN" className="h-8 w-auto" /></div>
        </header>
        <main className="flex-1 overflow-auto p-6 pb-20">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
