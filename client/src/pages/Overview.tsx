import { Layout } from "@/components/Layout";
import { useSettings, useMessages, useAccessLogs } from "@/hooks/use-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  MessageSquare, 
  Server, 
  ShieldCheck, 
  ArrowUpRight 
} from "lucide-react";

export default function Overview() {
  const { data: settings } = useSettings();
  const { data: messages } = useMessages();
  const { data: logs } = useAccessLogs();

  const stats = [
    {
      title: "Active Users",
      value: "1,204",
      change: "+12%",
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Active Messages",
      value: messages?.filter(m => m.status === 'ACTIVE').length || 0,
      change: "Live Now",
      icon: MessageSquare,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "System Version",
      value: settings?.versionCode || "v1.0",
      change: "Up to date",
      icon: Server,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Maintenance",
      value: settings?.maintenance?.status === "ACTIVE" ? "Active" : "Inactive",
      change: "Status",
      icon: ShieldCheck,
      color: settings?.maintenance?.status === "ACTIVE" ? "text-orange-500" : "text-slate-500",
      bg: settings?.maintenance?.status === "ACTIVE" ? "bg-orange-500/10" : "bg-slate-500/10",
    },
  ];

  return (
    <Layout>
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-2">
          Dashboard Overview
        </h1>
        <p className="text-muted-foreground">
          Welcome back to the MultififaIPTV Control Panel.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                {stat.change && (
                  <div className="flex items-center gap-1 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                    {stat.change}
                    <ArrowUpRight size={12} />
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <h3 className="text-2xl font-bold font-display mt-1">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="h-full border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Recent Access Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs?.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {log.userId ? log.userId[0].toUpperCase() : "?"}
                      </div>
                      <div>
                        <p className="font-medium text-white">{log.userId || "Unknown User"}</p>
                        <p className="text-xs text-muted-foreground">{log.action} • {log.ipAddress}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : "-"}
                      </p>
                    </div>
                  </div>
                ))}
                {!logs?.length && (
                  <p className="text-center text-muted-foreground py-8">No logs found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions / System Info */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-card">
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">App Name</span>
                <span className="font-medium">{settings?.appName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">{settings?.versionCode}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Portal URL</span>
                <span className="font-medium truncate max-w-[150px]">{settings?.portalUrl}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Customer ID</span>
                <span className="font-medium">{settings?.customerId}</span>
              </div>
            </CardContent>
          </Card>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10">
            <h3 className="font-bold text-lg mb-2 text-white">Need Support?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Contact the developer for updates or technical issues.
            </p>
            <div className="flex items-center gap-2 text-sm text-white bg-white/10 p-3 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {settings?.supportEmail || "Support Unavailable"}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
