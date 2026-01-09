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

export default function GeneralSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings(settings);
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
