import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CloudUpload, Loader2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface UpdateSettings {
  versionCode: string;
  apkAutoUpdate: string;
  apkUrl: string;
  backupUrl: string;
}

export default function RemoteUpdate() {
  const { toast } = useToast();
  const [form, setForm] = useState<UpdateSettings>({
    versionCode: "",
    apkAutoUpdate: "yes",
    apkUrl: "",
    backupUrl: "",
  });

  const { data: settings, isLoading } = useQuery<UpdateSettings>({
    queryKey: ["/api/admin/update-settings"],
  });

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (data: UpdateSettings) => {
      return apiRequest("PUT", "/api/admin/update-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/update-settings"] });
      toast({ title: "Success", description: "Update settings saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">Remote Update</h1>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5" />
            Create Update
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Application Build No</Label>
            <Input
              data-testid="input-version-code"
              value={form.versionCode}
              onChange={(e) => setForm({ ...form, versionCode: e.target.value })}
              placeholder="2002"
            />
          </div>

          <div className="space-y-2">
            <Label>Force Update Application</Label>
            <Select
              value={form.apkAutoUpdate}
              onValueChange={(v) => setForm({ ...form, apkAutoUpdate: v })}
            >
              <SelectTrigger data-testid="select-force-update">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Enabled</SelectItem>
                <SelectItem value="no">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Application Update URL (direct link)</Label>
            <Input
              data-testid="input-apk-url"
              value={form.apkUrl}
              onChange={(e) => setForm({ ...form, apkUrl: e.target.value })}
              placeholder="https://example.com/app.apk"
            />
          </div>

          <div className="space-y-2">
            <Label>Application Backup URL (direct link)</Label>
            <Input
              data-testid="input-backup-url"
              value={form.backupUrl}
              onChange={(e) => setForm({ ...form, backupUrl: e.target.value })}
              placeholder="https://example.com/backup.apk"
            />
          </div>

          <Button
            data-testid="button-push-update"
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Push Update
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
