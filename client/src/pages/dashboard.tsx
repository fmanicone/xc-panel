import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Users, 
  MessageSquare, 
  Megaphone, 
  Server, 
  Activity,
  Settings,
  Shield,
  ArrowRight,
  Radio,
  Tv,
  Globe
} from "lucide-react";
import { getSettings, getConnectedUsers, getAnnouncement, getMessages, getVpnServers } from "@/lib/api";

interface DashboardStats {
  connectedUsers: number;
  totalMessages: number;
  vpnServers: number;
  appName: string;
  announcementActive: boolean;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    connectedUsers: 0,
    totalMessages: 0,
    vpnServers: 0,
    appName: "IPTV App",
    announcementActive: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [settings, users, announcement, messages, vpn] = await Promise.all([
          getSettings().catch(() => null),
          getConnectedUsers().catch(() => []),
          getAnnouncement().catch(() => null),
          getMessages().catch(() => []),
          getVpnServers().catch(() => []),
        ]);
        
        setStats({
          connectedUsers: users?.length || 0,
          totalMessages: messages?.length || 0,
          vpnServers: vpn?.length || 0,
          appName: settings?.appName || "IPTV App",
          announcementActive: announcement?.status === "ACTIVE",
        });
      } catch (err) {
        console.error("Failed to load dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const quickActions = [
    { title: "App Settings", description: "Configure your application", icon: Settings, href: "/settings", color: "from-blue-500 to-blue-600" },
    { title: "VPN Servers", description: "Manage VPN connections", icon: Shield, href: "/vpn", color: "from-green-500 to-green-600" },
    { title: "Announcements", description: "Send messages to users", icon: Megaphone, href: "/announcement", color: "from-orange-500 to-orange-600" },
    { title: "Connected Users", description: "View active sessions", icon: Users, href: "/users", color: "from-purple-500 to-purple-600" },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
            <Radio className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
              {stats.appName}
            </h1>
            <p className="text-muted-foreground">Admin Control Panel</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-visible">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connected Users</p>
                <p className="text-3xl font-bold" data-testid="stat-connected-users">{stats.connectedUsers}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="w-3 h-3" />
              <span>Active sessions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-visible">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">User Messages</p>
                <p className="text-3xl font-bold" data-testid="stat-messages">{stats.totalMessages}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-orange-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              <span>Pending messages</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-visible">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">VPN Servers</p>
                <p className="text-3xl font-bold" data-testid="stat-vpn-servers">{stats.vpnServers}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <Globe className="w-3 h-3" />
              <span>Available servers</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-visible">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Announcement</p>
                <Badge 
                  variant={stats.announcementActive ? "default" : "secondary"}
                  className="mt-1"
                  data-testid="stat-announcement"
                >
                  {stats.announcementActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <Tv className="w-3 h-3" />
              <span>In-app notification</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="hover-elevate cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-4`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
