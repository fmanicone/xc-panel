import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getSettings, updateSettings } from "@/lib/api";
import { themeOptions } from "@shared/schema";
import type { Settings } from "@shared/schema";

export default function ThemeSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

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

  async function handleSubmit() {
    if (!settings) return;
    try {
      await updateSettings({ theme: settings.theme });
      toast({ title: "Success", description: "Theme updated" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!settings) return <div className="p-6">Failed to load</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Theme Changes</h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Choose Your Theme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Theme</Label>
            <Select
              value={settings.theme || "3"}
              onValueChange={(v) => setSettings({ ...settings, theme: v })}
            >
              <SelectTrigger data-testid="select-theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {themeOptions.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button data-testid="button-submit-theme" onClick={handleSubmit}>
            Submit
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {themeOptions.map((theme) => (
          <Card
            key={theme.value}
            className={`cursor-pointer transition-all ${settings.theme === theme.value ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSettings({ ...settings, theme: theme.value })}
          >
            <CardContent className="p-4">
              <div className="aspect-video bg-gradient-to-br from-blue-500 to-blue-800 rounded mb-2 flex items-center justify-center">
                <span className="text-white font-bold text-sm">{theme.label}</span>
              </div>
              <p className="text-center text-sm">{theme.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
