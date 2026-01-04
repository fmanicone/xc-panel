import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getSettings, updateSettings } from "@/lib/api";
import type { Settings } from "@shared/schema";

export default function MaintenancePage() {
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
        maintenanceMessage: settings.maintenanceMessage,
        maintenanceMode: settings.maintenanceMode,
        maintenanceStatus: settings.maintenanceMode,
        maintenanceExpire: (settings as any).maintenanceExpire,
      } as any);
      toast({ title: "Success", description: "Maintenance settings updated" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!settings) return <div className="p-6">Failed to load</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">Maintenance Mode</h1>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Configure Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Maintenance Message</Label>
            <Input
              data-testid="input-maintenance-message"
              value={settings.maintenanceMessage || ""}
              onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
              placeholder="Maintenance in progress..."
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={settings.maintenanceMode === "ACTIVE" ? "ACTIVE" : "INACTIVE"}
              onValueChange={(v) => setSettings({ ...settings, maintenanceMode: v, maintenanceStatus: v })}
            >
              <SelectTrigger data-testid="select-maintenance-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Expiration</Label>
            <Input
              type="datetime-local"
              step="1"
              data-testid="input-maintenance-expire"
              value={(settings as any).maintenanceExpire ? (settings as any).maintenanceExpire.replace(" ", "T") : ""}
              onChange={(e) => setSettings({ ...settings, maintenanceExpire: e.target.value.replace("T", " ") } as any)}
            />
          </div>
          <Button data-testid="button-submit-maintenance" onClick={handleSubmit} className="w-full">
            Update Maintenance
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
