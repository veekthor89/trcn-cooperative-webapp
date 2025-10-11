import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { LayoutDashboard, TrendingUp, CreditCard, User, LogOut, X, PiggyBank, Upload, FileSpreadsheet, Wallet, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import trcnLogo from "@/assets/trcn-logo.png";
interface DashboardLayoutProps {
  children: ReactNode;
}
const DashboardLayout = ({
  children
}: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileName, setProfileName] = useState("User");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const {
    isAdmin
  } = useUserRole();
  useEffect(() => {
    // Set up auth listener
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        // Fetch profile name and photo
        setTimeout(async () => {
          const {
            data
          } = await supabase.from("profiles").select("full_name, profile_photo_url").eq("id", session.user.id).single();
          if (data?.full_name) {
            setProfileName(data.full_name);
          }
          if (data?.profile_photo_url) {
            setProfilePhotoUrl(data.profile_photo_url);
          }
        }, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  const handleSignOut = async () => {
    const {
      error
    } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };
  const menuItems = [{
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/dashboard"
  }, {
    icon: PiggyBank,
    label: "Savings",
    path: "/dashboard/savings"
  }, {
    icon: CreditCard,
    label: "Loans",
    path: "/dashboard/loans"
  }, {
    icon: TrendingUp,
    label: "Transactions",
    path: "/dashboard/transactions"
  }, {
    icon: User,
    label: "Profile",
    path: "/dashboard/profile"
  }];
  if (!session) {
    return null;
  }
  return <div className="flex h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
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

          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map(item => <button key={item.path} onClick={() => {
            navigate(item.path);
            setSidebarOpen(false);
          }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-smooth">
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>)}
            
            {isAdmin && <div className="pt-6 mt-6 border-t border-border space-y-1">
                <div className="px-4 pb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data Management</p>
                </div>
                <button onClick={() => {
              navigate("/dashboard/bulk-upload");
              setSidebarOpen(false);
            }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                  <Upload className="h-5 w-5" />
                  <span>Bulk Upload Members</span>
                </button>
                <button onClick={() => {
              navigate("/dashboard/bulk-upload-accounts");
              setSidebarOpen(false);
            }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                  <Wallet className="h-5 w-5" />
                  <span>Bulk Upload Accounts</span>
                </button>
                <button onClick={() => {
              navigate("/dashboard/bulk-upload-loans");
              setSidebarOpen(false);
            }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                  <CreditCard className="h-5 w-5" />
                  <span>Bulk Upload Loans</span>
                </button>
                <button onClick={() => {
              navigate("/dashboard/bulk-upload-transactions");
              setSidebarOpen(false);
            }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                  <TrendingUp className="h-5 w-5" />
                  <span>Bulk Upload Transactions</span>
                </button>
                <button onClick={() => {
              navigate("/dashboard/bulk-upload-special-contributions");
              setSidebarOpen(false);
            }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
                  <PiggyBank className="h-5 w-5" />
                  <span>Bulk Upload Contributions</span>
                </button>
              </div>}
          </nav>

          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-4">
              <Avatar>
                {profilePhotoUrl && <AvatarImage src={profilePhotoUrl} alt={profileName} />}
                <AvatarFallback className="bg-muted text-foreground">
                  {profileName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profileName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:bg-muted hover:text-foreground" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - Mobile/Tablet Hamburger Menu */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img src={trcnLogo} alt="TRCN" className="h-8 w-auto" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>;
};
export default DashboardLayout;