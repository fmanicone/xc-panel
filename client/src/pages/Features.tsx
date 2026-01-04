import { Layout } from "@/components/Layout";
import { useSettings, useUpdateSettings } from "@/hooks/use-admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Tv, Video, Radio, Film, Lock, RefreshCw, LogIn, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FEATURE_CONFIG = [
  { key: "btn_live", label: "Live TV", icon: Tv, desc: "Enable live television channels" },
  { key: "btn_vod", label: "Movies (VOD)", icon: Film, desc: "Enable video on demand library" },
  { key: "btn_series", label: "Series", icon: Video, desc: "Enable TV series section" },
  { key: "btn_radio", label: "Radio", icon: Radio, desc: "Enable radio streams" },
  { key: "btn_vpn", label: "VPN", icon: Lock, desc: "Show VPN configuration options" },
  { key: "btn_update", label: "Updates", icon: RefreshCw, desc: "Allow in-app updates" },
  { key: "btn_login_settings", label: "Login Settings", icon: LogIn, desc: "Allow users to change login settings" },
  { key: "btn_speed_test", label: "Speed Test", icon: Activity, desc: "Enable network speed test tool" },
];

export default function Features() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();

  const handleToggle = (key: string, currentValue: string) => {
    if (!settings) return;

    // The backend expects "yes" or "no" (or "Yes"/"No") strings
    // We'll normalize to lowercase "yes"/"no" for consistency in updates
    const newValue = currentValue.toLowerCase() === "yes" ? "no" : "yes";
    
    const newButtons = { ...settings.buttons, [key]: newValue };

    updateSettings.mutate({ buttons: newButtons }, {
      onSuccess: () => {
        toast({
          title: "Feature Updated",
          description: `${key.replace('btn_', '').toUpperCase()} is now ${newValue.toUpperCase()}`,
        });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: err.message,
        });
      }
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-2">
          Features & Modules
        </h1>
        <p className="text-muted-foreground">
          Toggle application features on or off for all users instantly.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {FEATURE_CONFIG.map((feature) => {
          // Robustly handle case sensitivity from backend JSON
          const value = settings?.buttons[feature.key];
          const isEnabled = value?.toLowerCase() === "yes";

          return (
            <Card key={feature.key} className={`
              border-border/50 transition-all duration-300
              ${isEnabled ? "bg-primary/5 border-primary/20" : "bg-card hover:bg-card/80"}
            `}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${isEnabled ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <Switch 
                    checked={isEnabled}
                    onCheckedChange={() => handleToggle(feature.key, value || "no")}
                  />
                </div>
                <h3 className="font-bold text-lg mb-1">{feature.label}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-12">
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle>Player Configuration</CardTitle>
            <CardDescription>Select default players for different content types.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(settings?.players || {}).map(([key, value]) => (
                <div key={key} className="p-4 rounded-lg bg-background/50 border border-white/5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                    {key.replace(/_/g, " ")}
                  </Label>
                  <div className="font-mono text-lg font-medium text-white">
                    {value as string}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground italic">
              * Player settings are currently read-only. Advanced configuration coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
