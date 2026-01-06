import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getSettings, updateSettings } from "@/lib/api";
import { languageOptions } from "@shared/schema";
import type { Settings } from "@shared/schema";

export default function LanguageSettings() {
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
      await updateSettings({
        appLanguage: settings.appLanguage,
      });
      toast({ title: "Success", description: "Language updated" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!settings) return <div className="p-6">Failed to load</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">Language Selection</h1>
      <p className="text-center text-muted-foreground">Languages Available</p>
      <p className="text-center text-sm text-muted-foreground">Pick Your App Language</p>

      <Card className="max-w-xl mx-auto">
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label>App Language</Label>
            <Select
              value={settings.appLanguage || "it"}
              onValueChange={(v) => setSettings({ ...settings, appLanguage: v })}
            >
              <SelectTrigger data-testid="select-app-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button data-testid="button-submit-language" onClick={handleSubmit} className="w-full">
            Submit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
