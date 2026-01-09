import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getSettings, updateSettings } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";
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

export default function InterfaceSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
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
      await updateSettings({
        theme: settings.theme,
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
          <p className="text-muted-foreground">Customize app appearance</p>
        </div>
        <Button onClick={handleSave} disabled={saving} data-testid="button-save-interface">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

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
    </div>
  );
}
