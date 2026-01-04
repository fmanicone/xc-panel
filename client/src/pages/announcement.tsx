import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAnnouncement, updateAnnouncement } from "@/lib/api";
import { Save, Loader2, Megaphone, Calendar, Clock } from "lucide-react";
import type { Announcement } from "@shared/schema";

export default function AnnouncementPage() {
  const { toast } = useToast();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAnnouncement();
  }, []);

  async function loadAnnouncement() {
    try {
      const data = await getAnnouncement();
      setAnnouncement(data);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load announcement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!announcement) return;
    setSaving(true);
    try {
      await updateAnnouncement({
        message: announcement.message,
        status: announcement.status || "INACTIVE",
        expire: announcement.expire,
        displayFor: announcement.displayFor || 1,
        disappearAfter: announcement.disappearAfter || 1,
      });
      toast({ title: "Saved", description: "Announcement updated successfully" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update announcement", variant: "destructive" });
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

  if (!announcement) {
    return <div className="p-6 text-muted-foreground">Failed to load announcement</div>;
  }

  const isActive = announcement.status === "ACTIVE";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground">Manage in-app announcements for all users</p>
        </div>
        <Button onClick={handleSave} disabled={saving} data-testid="button-save-announcement">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Announcement Message</CardTitle>
                  <CardDescription>This message will be displayed to all app users</CardDescription>
                </div>
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Message Content</Label>
                <Textarea
                  data-testid="input-announcement"
                  value={announcement.message || ""}
                  onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                  placeholder="Enter your announcement message here..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div>
                  <Label>Enable Announcement</Label>
                  <p className="text-xs text-muted-foreground">Show this announcement to users</p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={(v) => setAnnouncement({ ...announcement, status: v ? "ACTIVE" : "INACTIVE" })}
                  data-testid="switch-announcement-status"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Expiration Date</Label>
                <Input
                  type="datetime-local"
                  step="1"
                  data-testid="input-announcement-expire"
                  value={announcement.expire ? announcement.expire.replace(" ", "T") : ""}
                  onChange={(e) => setAnnouncement({ ...announcement, expire: e.target.value.replace("T", " ") })}
                />
                <p className="text-xs text-muted-foreground">Format: YYYY-MM-DD HH:MM:SS</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Display Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Display Duration (minutes)</Label>
                <Input
                  type="number"
                  data-testid="input-display-for"
                  value={announcement.displayFor || 1}
                  onChange={(e) => setAnnouncement({ ...announcement, displayFor: parseInt(e.target.value) || 1 })}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Disappear After (minutes)</Label>
                <Input
                  type="number"
                  data-testid="input-disappear-after"
                  value={announcement.disappearAfter || 1}
                  onChange={(e) => setAnnouncement({ ...announcement, disappearAfter: parseInt(e.target.value) || 1 })}
                  min={1}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
