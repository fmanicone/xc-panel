import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getSettings, updateSettings } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Server, Sliders, Save, Loader2 } from "lucide-react";
import type { Settings as SettingsType } from "@shared/schema";
import { loginTypeOptions, streamFormatOptions } from "@shared/schema";

const navigationFeatures = [
  { key: "live", label: "Live TV", description: "Show Live TV icon in navigation" },
  { key: "epg", label: "TV Guide", description: "Show Electronic Program Guide icon" },
  { key: "vod", label: "VOD", description: "Show Video on Demand section" },
  { key: "series", label: "Series", description: "Show TV Series section" },
  { key: "catchup", label: "Catchup", description: "Show Catchup/Replay feature" },
  { key: "radio", label: "Radio", description: "Show Radio stations" },
];

const portalTabs = ["Portal 1", "Portal 2", "Portal 3", "Portal 4", "Portal 5"];

export default function GeneralSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsType | null>(null);
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
      await updateSettings({ ...settings, interfaceToggles: toggles });
      toast({ title: "Saved", description: "Settings updated successfully" });
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
          <h1 className="text-2xl font-bold tracking-tight">General Settings</h1>
          <p className="text-muted-foreground">Configure your IPTV application settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving} data-testid="button-save-all">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="application" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="application" className="gap-2">
            <Settings className="w-4 h-4" />
            Application
          </TabsTrigger>
          <TabsTrigger value="portals" className="gap-2">
            <Server className="w-4 h-4" />
            Portals
          </TabsTrigger>
          <TabsTrigger value="options" className="gap-2">
            <Sliders className="w-4 h-4" />
            Options
          </TabsTrigger>
        </TabsList>

        <TabsContent value="application" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">App Identity</CardTitle>
                <CardDescription>Basic application information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Application Name</Label>
                  <Input
                    data-testid="input-app-name"
                    value={settings.appName || ""}
                    onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                    placeholder="My IPTV App"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Build Number</Label>
                    <Input
                      data-testid="input-version-code"
                      value={settings.versionCode || ""}
                      onChange={(e) => setSettings({ ...settings, versionCode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>App Identifier</Label>
                    <Input
                      data-testid="input-customer-id"
                      value={settings.customerId || ""}
                      onChange={(e) => setSettings({ ...settings, customerId: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Login Type</Label>
                  <Select
                    value={settings.loginType || "login"}
                    onValueChange={(v) => setSettings({ ...settings, loginType: v })}
                  >
                    <SelectTrigger data-testid="select-login-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {loginTypeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Login Screen</CardTitle>
                <CardDescription>Configure login page elements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Accounts Button</Label>
                    <p className="text-xs text-muted-foreground">Show saved accounts</p>
                  </div>
                  <Switch
                    checked={settings.loginAccountsButton === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, loginAccountsButton: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>MQTT / QR Login</Label>
                    <p className="text-xs text-muted-foreground">Show QR code on login (disable to hide it)</p>
                  </div>
                  <Switch
                    checked={settings.mqttEnabled !== "Disabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, mqttEnabled: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Settings Button</Label>
                    <p className="text-xs text-muted-foreground">Show settings access</p>
                  </div>
                  <Switch
                    checked={settings.loginSettingsButton === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, loginSettingsButton: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sign-up Button</Label>
                    <p className="text-xs text-muted-foreground">Allow new registrations</p>
                  </div>
                  <Switch
                    checked={settings.signupButton === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, signupButton: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                {settings.signupButton === "Enabled" && (
                  <div className="space-y-2">
                    <Label>Sign-up URL</Label>
                    <Input
                      value={settings.signupUrl || ""}
                      onChange={(e) => setSettings({ ...settings, signupUrl: e.target.value })}
                      placeholder="https://example.com/signup"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Features</CardTitle>
                <CardDescription>Enable or disable app features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Announcements</Label>
                    <p className="text-xs text-muted-foreground">Show in-app announcements</p>
                  </div>
                  <Switch
                    checked={settings.announcementsEnabled === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, announcementsEnabled: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Messages</Label>
                    <p className="text-xs text-muted-foreground">Show user messages</p>
                  </div>
                  <Switch
                    checked={settings.messagesEnabled === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, messagesEnabled: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Update User Info</Label>
                    <p className="text-xs text-muted-foreground">Sync user data</p>
                  </div>
                  <Switch
                    checked={settings.updateUserInfo === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, updateUserInfo: v ? "Enabled" : "Disabled" })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Support Info</CardTitle>
                <CardDescription>Contact information shown in app</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input
                    value={settings.supportEmail || ""}
                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Support Phone</Label>
                  <Input
                    value={settings.supportPhone || ""}
                    onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="portals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portal Configuration</CardTitle>
              <CardDescription>Configure up to 5 streaming portals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b last:border-0">
                  <div className="space-y-2">
                    <Label>Portal {num} Name</Label>
                    <Input
                      data-testid={num === 1 ? "input-portal1-name" : undefined}
                      value={(settings as any)[`portal${num}Name`] || ""}
                      onChange={(e) => setSettings({ ...settings, [`portal${num}Name`]: e.target.value })}
                      placeholder={`Portal ${num}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Portal {num} URL (0 = No Portal)</Label>
                    <Input
                      data-testid={num === 1 ? "input-portal1-url" : undefined}
                      value={(settings as any)[`portal${num}Url`] || ""}
                      onChange={(e) => setSettings({ ...settings, [`portal${num}Url`]: e.target.value })}
                      placeholder="http://example.com:8080"
                    />
                  </div>
                </div>
              ))}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label>CUSTOM VOD PORTAL (no = No Portal)</Label>
                  <Input
                    value={settings.portalVod || ""}
                    onChange={(e) => setSettings({ ...settings, portalVod: e.target.value })}
                    placeholder="http://example.com/epg.xml"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CUSTOM SERIES PORTAL (no = No Portal)</Label>
                  <Input
                    value={settings.portalSeries || ""}
                    onChange={(e) => setSettings({ ...settings, portalSeries: e.target.value })}
                    placeholder="http://example.com/epg.xml"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stream Format</Label>
                  <Select
                    value={settings.streamFormat || "ts"}
                    onValueChange={(v) => setSettings({ ...settings, streamFormat: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {streamFormatOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portals</CardTitle>
              <CardDescription>Configure which icons appear for each portal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2 border-b pb-4">
                {portalTabs.map((portal, idx) => (
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
                {navigationFeatures.map((feature) => {
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

        <TabsContent value="options" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">UI Options</CardTitle>
                <CardDescription>Visual elements configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Login Logo</Label>
                    <p className="text-xs text-muted-foreground">Display logo on login</p>
                  </div>
                  <Switch
                    checked={settings.showLoginLogo === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, showLoginLogo: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show App Logo</Label>
                    <p className="text-xs text-muted-foreground">Display logo in app</p>
                  </div>
                  <Switch
                    checked={settings.showAppLogo === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, showAppLogo: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Category Count</Label>
                    <p className="text-xs text-muted-foreground">Display item counts</p>
                  </div>
                  <Switch
                    checked={settings.showCategoryCount === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, showCategoryCount: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>EPG</Label>
                    <p className="text-xs text-muted-foreground">Enable screen EPG in live</p>
                  </div>
                  <Switch
                    checked={settings.epgUrl === "yes"}
                    onCheckedChange={(v) => setSettings({ ...settings, epgUrl: v ? "yes" : "no" })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Playback Options</CardTitle>
                <CardDescription>Player behavior settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Load Last Channel</Label>
                    <p className="text-xs text-muted-foreground">Resume on last channel</p>
                  </div>
                  <Switch
                    checked={settings.loadLastChannel === "Enabled"}
                    onCheckedChange={(v) => setSettings({ ...settings, loadLastChannel: v ? "Enabled" : "Disabled" })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custom User-Agent</Label>
                  <Input
                    value={settings.userAgent || ""}
                    onChange={(e) => setSettings({ ...settings, userAgent: e.target.value })}
                    placeholder="Leave empty for default"
                  />
                </div>
              </CardContent>
            </Card>

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
