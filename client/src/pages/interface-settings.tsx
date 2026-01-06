import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getSettings, updateSettings } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Palette, Layout, Monitor } from "lucide-react";
import type { Settings } from "@shared/schema";
import { themeOptions } from "@shared/schema";

import themeD from "@assets/theme_images/d.jpg";
import theme1 from "@assets/theme_images/1.jpg";
import theme2 from "@assets/theme_images/2.jpg";
import theme3 from "@assets/theme_images/3.jpg";
import themeNewLayout from "@assets/theme_images/new_layout.jpg";

const themeImages: Record<string, string> = {
  d: themeD,
  "1": theme1,
  "2": theme2,
  "3": theme3,
  "new_layout": themeNewLayout,
};

const features = [
  { key: "live", label: "Live TV", description: "Show Live TV icon in navigation" },
  { key: "epg", label: "TV Guide", description: "Show Electronic Program Guide icon" },
  { key: "vod", label: "VOD", description: "Show Video on Demand section" },
  { key: "series", label: "Series", description: "Show TV Series section" },
  { key: "catchup", label: "Catchup", description: "Show Catchup/Replay feature" },
  { key: "radio", label: "Radio", description: "Show Radio stations" },
];

const portals = ["Portal 1", "Portal 2", "Portal 3", "Portal 4", "Portal 5"];

export default function InterfaceSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [toggles, setToggles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePortal, setActivePortal] = useState("1");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await getSettings();
      setSettings(data);
      setToggles((data.interfaceToggles as Record<string, string>) || {});
    } catch (err) {
      toast({ title: "Error", description: "Failed to load settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handleToggle(feature: string, portal: string, enabled: boolean) {
    const key = `${feature}_portal${portal}`;
    setToggles((prev) => ({ ...prev, [key]: enabled ? "On" : "Off" }));
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings({
        theme: settings.theme,
        interfaceToggles: toggles,
        showReminders: settings.showReminders,
        showRecord: settings.showRecord,
        showVpn: settings.showVpn,
        showMultiscreen: settings.showMultiscreen,
        showFavorites: settings.showFavorites,
        showAccount: settings.showAccount,
        showMessage: settings.showMessage,
        showUpdate: settings.showUpdate,
        showSubExpiry: settings.showSubExpiry,
        settingsAppIcon: settings.settingsAppIcon,
        settingsAccountIcon: settings.settingsAccountIcon,
        sendUdid: settings.sendUdid,
        hideAutoConnVpn: settings.hideAutoConnVpn,
        hideOtherLoginType: settings.hideOtherLoginType,
        maxEpgFileSize: settings.maxEpgFileSize,
      });
      toast({ title: "Saved", description: "Interface settings updated" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return <div className="p-6 text-muted-foreground">Failed to load settings</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interface & Theme</h1>
          <p className="text-muted-foreground">Customize app appearance and navigation</p>
        </div>
        <Button onClick={handleSave} disabled={saving} data-testid="button-save-interface">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="theme" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="theme" className="gap-2">
            <Palette className="w-4 h-4" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="navigation" className="gap-2">
            <Layout className="w-4 h-4" />
            Navigation
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Monitor className="w-4 h-4" />
            Features
          </TabsTrigger>
        </TabsList>

        <TabsContent value="theme" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Choose Your Theme</CardTitle>
              <CardDescription>Select the app theme for your IPTV application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-md">
                <Label>Theme</Label>
                <Select
                  value={settings.theme || "d"}
                  onValueChange={(v) => setSettings({ ...settings, theme: v })}
                >
                  <SelectTrigger data-testid="select-theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {themeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {themeOptions.map((theme) => (
              <Card 
                key={theme.value}
                className={`cursor-pointer transition-all hover-elevate ${settings.theme === theme.value ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSettings({ ...settings, theme: theme.value })}
              >
                <CardContent className="p-4">
                  <div className="text-sm font-semibold text-primary uppercase mb-2">{theme.label}</div>
                  {themeImages[theme.value] ? (
                    <img 
                      src={themeImages[theme.value]} 
                      alt={theme.label} 
                      className="w-full rounded-md"
                    />
                  ) : (
                    <div className="aspect-video bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs">
                      {theme.label}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="navigation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Navigation Icons</CardTitle>
              <CardDescription>Configure which icons appear for each portal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2 border-b pb-4">
                {portals.map((portal, idx) => (
                  <Button
                    key={portal}
                    variant={activePortal === String(idx + 1) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActivePortal(String(idx + 1))}
                    data-testid={`tab-portal-${idx + 1}`}
                  >
                    {portal}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((feature) => {
                  const key = `${feature.key}_portal${activePortal}`;
                  const isEnabled = toggles[key] === "On";
                  
                  return (
                    <div
                      key={feature.key}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="space-y-0.5">
                        <Label className="font-medium">{feature.label}</Label>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleToggle(feature.key, activePortal, checked)}
                        data-testid={`toggle-${feature.key}-portal${activePortal}`}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Extra Features</CardTitle>
                <CardDescription>Additional app functionality</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Reminders</Label>
                    <p className="text-xs text-muted-foreground">Display program reminders</p>
                  </div>
                  <Switch
                    checked={settings.showReminders === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, showReminders: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Record</Label>
                    <p className="text-xs text-muted-foreground">Enable recording feature</p>
                  </div>
                  <Switch
                    checked={settings.showRecord === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, showRecord: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show VPN</Label>
                    <p className="text-xs text-muted-foreground">Display VPN option</p>
                  </div>
                  <Switch
                    checked={settings.showVpn === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, showVpn: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Multi-Screen</Label>
                    <p className="text-xs text-muted-foreground">Show multi-screen option</p>
                  </div>
                  <Switch
                    checked={settings.showMultiscreen === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, showMultiscreen: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Favorites</Label>
                    <p className="text-xs text-muted-foreground">Show favorites section</p>
                  </div>
                  <Switch
                    checked={settings.showFavorites === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, showFavorites: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Account</Label>
                    <p className="text-xs text-muted-foreground">Show account settings</p>
                  </div>
                  <Switch
                    checked={settings.showAccount === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, showAccount: v ? "Enabled" : "Disabled" })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription>In-app notification settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Messages</Label>
                    <p className="text-xs text-muted-foreground">Display in-app messages</p>
                  </div>
                  <Switch
                    checked={settings.showMessage === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, showMessage: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Updates</Label>
                    <p className="text-xs text-muted-foreground">App update notifications</p>
                  </div>
                  <Switch
                    checked={settings.showUpdate === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, showUpdate: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Subscription Expiry</Label>
                    <p className="text-xs text-muted-foreground">Expiry date reminders</p>
                  </div>
                  <Switch
                    checked={settings.showSubExpiry === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, showSubExpiry: v ? "Enabled" : "Disabled" })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Other Settings</CardTitle>
                <CardDescription>Additional configuration options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Settings App Icon</Label>
                    <p className="text-xs text-muted-foreground">Show settings icon in app</p>
                  </div>
                  <Switch
                    checked={settings.settingsAppIcon === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, settingsAppIcon: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Settings Account Icon</Label>
                    <p className="text-xs text-muted-foreground">Show account icon in settings</p>
                  </div>
                  <Switch
                    checked={settings.settingsAccountIcon === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, settingsAccountIcon: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Send UDID in Login</Label>
                    <p className="text-xs text-muted-foreground">Send device ID during login</p>
                  </div>
                  <Switch
                    checked={settings.sendUdid === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, sendUdid: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Hide Auto VPN Connection</Label>
                    <p className="text-xs text-muted-foreground">Hide auto-connect VPN button</p>
                  </div>
                  <Switch
                    checked={settings.hideAutoConnVpn === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, hideAutoConnVpn: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Hide Other Login Types</Label>
                    <p className="text-xs text-muted-foreground">Hide other login options in accounts</p>
                  </div>
                  <Switch
                    checked={settings.hideOtherLoginType === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, hideOtherLoginType: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>EPG Max File Size (MB)</Label>
                  <Select
                    value={settings.maxEpgFileSize || "50"}
                    onValueChange={(v) => setSettings({ ...settings, maxEpgFileSize: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50 MB</SelectItem>
                      <SelectItem value="60">60 MB</SelectItem>
                      <SelectItem value="80">80 MB</SelectItem>
                      <SelectItem value="100">100 MB</SelectItem>
                      <SelectItem value="125">125 MB</SelectItem>
                      <SelectItem value="150">150 MB</SelectItem>
                      <SelectItem value="200">200 MB</SelectItem>
                      <SelectItem value="5000">No Limit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
