import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getSettings, updateSettings } from "@/lib/api";
import { playerOptions, languageOptions } from "@shared/schema";
import type { Settings } from "@shared/schema";
import { Loader2, Save, Monitor, Play } from "lucide-react";

const yesNoOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const streamTypeOptions = [
  { value: "MPEGTS (ts)", label: "MPEGTS (ts)" },
  { value: "HLS (m3u8)", label: "HLS (m3u8)" },
];

const exoResizeOptions = [
  { value: "0", label: "Best Fit" },
  { value: "1", label: "Fixed" },
  { value: "2", label: "Fixed Width" },
  { value: "3", label: "Fill" },
  { value: "4", label: "Zoom" },
];

const vlcResizeOptions = [
  { value: "0", label: "Default (0)" },
  { value: "1", label: "Fit Screen (1)" },
  { value: "2", label: "Fill Screen (2)" },
  { value: "3", label: "16:9 (3)" },
  { value: "4", label: "4:3 (4)" },
];

const volumeOptions = [
  { value: "60", label: "60" },
  { value: "70", label: "70" },
  { value: "80", label: "80" },
  { value: "90", label: "90" },
  { value: "100", label: "100" },
];

const exoBufferOptions = [
  { value: "10000", label: "10000" },
  { value: "15000", label: "15000" },
  { value: "20000", label: "20000" },
  { value: "25000", label: "25000" },
  { value: "30000", label: "30000" },
  { value: "35000", label: "35000" },
  { value: "40000", label: "40000" },
  { value: "45000", label: "45000" },
  { value: "50000", label: "50000" },
];

const vlcBufferOptions = [
  { value: "300", label: "300" },
  { value: "1000", label: "1000" },
  { value: "2000", label: "2000" },
  { value: "3000", label: "3000" },
  { value: "5000", label: "5000" },
];

export default function PlayerSettings() {
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

  async function handleSubmit() {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings({
        playerLive: settings.playerLive,
        playerEpg: settings.playerEpg,
        playerVod: settings.playerVod,
        playerSeries: settings.playerSeries,
        playerCatchup: settings.playerCatchup,
        appLanguage: settings.appLanguage,
        userLanguage: settings.userLanguage,
        defaultPlayer: settings.defaultPlayer,
        playerTv: settings.playerTv,
        streamType: settings.streamType,
        vlcHw: settings.vlcHw,
        lastVolumeVlc: settings.lastVolumeVlc,
        playerVlcBuffer: settings.playerVlcBuffer,
        videoResizeVlc: settings.videoResizeVlc,
        videoSubtitlesVlc: settings.videoSubtitlesVlc,
        exoHw: settings.exoHw,
        lastVolumeExo: settings.lastVolumeExo,
        playerExoBuffer: settings.playerExoBuffer,
        videoResizeExo: settings.videoResizeExo,
        videoSubtitlesExo: settings.videoSubtitlesExo,
      });
      toast({ title: "Success", description: "Player settings saved" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="spinner-loading" />
      </div>
    );
  }
  if (!settings) return <div className="p-6">Failed to load</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Play className="h-6 w-6" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Player Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Default Players
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label>Default Player</Label>
            <Select
              value={settings.defaultPlayer || "EXO"}
              onValueChange={(v) => setSettings({ ...settings, defaultPlayer: v })}
            >
              <SelectTrigger data-testid="select-default-player">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {playerOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Live TV Player</Label>
            <Select
              value={settings.playerTv || settings.playerLive || "EXO"}
              onValueChange={(v) => setSettings({ ...settings, playerTv: v, playerLive: v })}
            >
              <SelectTrigger data-testid="select-player-tv">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {playerOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>VOD Player</Label>
            <Select
              value={settings.playerVod || "VLC"}
              onValueChange={(v) => setSettings({ ...settings, playerVod: v })}
            >
              <SelectTrigger data-testid="select-player-vod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {playerOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Series Player</Label>
            <Select
              value={settings.playerSeries || "VLC"}
              onValueChange={(v) => setSettings({ ...settings, playerSeries: v })}
            >
              <SelectTrigger data-testid="select-player-series">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {playerOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Catchup Player</Label>
            <Select
              value={settings.playerCatchup || "VLC"}
              onValueChange={(v) => setSettings({ ...settings, playerCatchup: v })}
            >
              <SelectTrigger data-testid="select-player-catchup">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {playerOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Stream Type</Label>
            <Select
              value={settings.streamType || "MPEGTS (ts)"}
              onValueChange={(v) => setSettings({ ...settings, streamType: v })}
            >
              <SelectTrigger data-testid="select-stream-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {streamTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>EXO Player Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label>Hardware Acceleration</Label>
            <Select
              value={settings.exoHw || "yes"}
              onValueChange={(v) => setSettings({ ...settings, exoHw: v })}
            >
              <SelectTrigger data-testid="select-exo-hw">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yesNoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Default Volume</Label>
            <Select
              value={settings.lastVolumeExo || "100"}
              onValueChange={(v) => setSettings({ ...settings, lastVolumeExo: v })}
            >
              <SelectTrigger data-testid="select-exo-volume">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {volumeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Buffer Size (ms)</Label>
            <Select
              value={settings.playerExoBuffer || "50000"}
              onValueChange={(v) => setSettings({ ...settings, playerExoBuffer: v })}
            >
              <SelectTrigger data-testid="select-exo-buffer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exoBufferOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Video Resize Mode</Label>
            <Select
              value={settings.videoResizeExo || "0"}
              onValueChange={(v) => setSettings({ ...settings, videoResizeExo: v })}
            >
              <SelectTrigger data-testid="select-exo-resize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exoResizeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Show Subtitles</Label>
            <Select
              value={settings.videoSubtitlesExo || "no"}
              onValueChange={(v) => setSettings({ ...settings, videoSubtitlesExo: v })}
            >
              <SelectTrigger data-testid="select-exo-subtitles">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yesNoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>VLC Player Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label>Hardware Acceleration</Label>
            <Select
              value={settings.vlcHw || "yes"}
              onValueChange={(v) => setSettings({ ...settings, vlcHw: v })}
            >
              <SelectTrigger data-testid="select-vlc-hw">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yesNoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Default Volume</Label>
            <Select
              value={settings.lastVolumeVlc || "100"}
              onValueChange={(v) => setSettings({ ...settings, lastVolumeVlc: v })}
            >
              <SelectTrigger data-testid="select-vlc-volume">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {volumeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Buffer Size (ms)</Label>
            <Select
              value={settings.playerVlcBuffer || "5000"}
              onValueChange={(v) => setSettings({ ...settings, playerVlcBuffer: v })}
            >
              <SelectTrigger data-testid="select-vlc-buffer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vlcBufferOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Video Resize Mode</Label>
            <Select
              value={settings.videoResizeVlc || "0"}
              onValueChange={(v) => setSettings({ ...settings, videoResizeVlc: v })}
            >
              <SelectTrigger data-testid="select-vlc-resize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vlcResizeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Show Subtitles</Label>
            <Select
              value={settings.videoSubtitlesVlc || "yes"}
              onValueChange={(v) => setSettings({ ...settings, videoSubtitlesVlc: v })}
            >
              <SelectTrigger data-testid="select-vlc-subtitles">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yesNoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Language Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div>
            <Label>User Language</Label>
            <Select
              value={settings.userLanguage || "it"}
              onValueChange={(v) => setSettings({ ...settings, userLanguage: v })}
            >
              <SelectTrigger data-testid="select-user-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={saving} data-testid="button-save">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
