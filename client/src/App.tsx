import { Switch, Route, useLocation } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import Dashboard from "@/pages/dashboard";
import GeneralSettings from "@/pages/general-settings";
import InterfaceSettings from "@/pages/interface-settings";
import VpnSettings from "@/pages/vpn-settings";
import PlayerSettings from "@/pages/player-settings";
import AnnouncementPage from "@/pages/announcement";
import MessagesPage from "@/pages/messages";
import GlobalMessagePage from "@/pages/global-message";
import SportsGuide from "@/pages/sports-guide";
import ConnectedUsersPage from "@/pages/connected-users";
import MaintenancePage from "@/pages/maintenance";
import ParentalResetPage from "@/pages/parental-reset";
import RemoteUpdatePage from "@/pages/remote-update";
import IntroVideoPage from "@/pages/intro-video";
import BackdropPage from "@/pages/backdrop";
import LoginPage from "@/pages/login";
import LoginAttemptsPage from "@/pages/login-attempts";
import ChangePasswordPage from "@/pages/change-password";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/settings" component={GeneralSettings} />
      <Route path="/interface" component={InterfaceSettings} />
      <Route path="/vpn" component={VpnSettings} />
      <Route path="/player" component={PlayerSettings} />
      <Route path="/announcement" component={AnnouncementPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/global-message" component={GlobalMessagePage} />
      <Route path="/sports" component={SportsGuide} />
      <Route path="/users" component={ConnectedUsersPage} />
      <Route path="/maintenance" component={MaintenancePage} />
      <Route path="/parental" component={ParentalResetPage} />
      <Route path="/update" component={RemoteUpdatePage} />
      <Route path="/intro" component={IntroVideoPage} />
      <Route path="/backdrop" component={BackdropPage} />
      <Route path="/login-attempts" component={LoginAttemptsPage} />
      <Route path="/change-password" component={ChangePasswordPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/settings": "General Settings",
  "/interface": "Interface & Theme",
  "/vpn": "VPN Servers",
  "/player": "Player & Language",
  "/announcement": "Announcements",
  "/messages": "User Messages",
  "/global-message": "Broadcast Message",
  "/sports": "Sports Guide",
  "/users": "Connected Users",
  "/maintenance": "Maintenance Mode",
  "/parental": "Parental PIN Reset",
  "/update": "Remote Update",
  "/intro": "Intro Video",
  "/backdrop": "Backdrop",
  "/login-attempts": "Login Attempts",
  "/change-password": "Change Password",
};

interface AppContentProps {
  onLogout: () => void;
  username: string;
}

function AppContent({ onLogout, username }: AppContentProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const pageTitle = pageTitles[location] || "IPTV Admin";
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await apiRequest("POST", "/api/auth/logout");
      toast({
        title: "Logged out",
        description: "You have been signed out",
      });
      onLogout();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-3">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="h-4 w-px bg-border" />
            <span className="font-medium" data-testid="text-page-title">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block" data-testid="text-username">
              {username}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background">
          <Router />
        </main>
      </div>
    </div>
  );
}

function AuthWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");

  const { data, isLoading } = useQuery<{ authenticated: boolean; username?: string }>({
    queryKey: ["/api/auth/session"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data !== undefined) {
      setIsAuthenticated(data.authenticated);
      setUsername(data.username || "");
    }
  }, [data]);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLogin={() => {
          setIsAuthenticated(true);
          queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
        }}
      />
    );
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <AppContent
        onLogout={() => {
          setIsAuthenticated(false);
          setUsername("");
        }}
        username={username}
      />
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthWrapper />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
