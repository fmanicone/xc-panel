import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Image, Save, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const languages = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "it-IT", label: "Italian" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "es-MX", label: "Spanish (Mexico)" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "pt-PT", label: "Portuguese (Portugal)" },
  { value: "nl-NL", label: "Dutch" },
  { value: "pl-PL", label: "Polish" },
  { value: "ru-RU", label: "Russian" },
  { value: "ja-JP", label: "Japanese" },
  { value: "ko-KR", label: "Korean" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
  { value: "zh-TW", label: "Chinese (Traditional)" },
  { value: "ar-SA", label: "Arabic" },
  { value: "tr-TR", label: "Turkish" },
];

interface BackdropSettings {
  backdropEnabled: string;
  backdropApiKey: string;
  backdropPageCount: string;
  backdropInterval: string;
  backdropInitialDelay: string;
  backdropLanguage: string;
}

export default function BackdropPage() {
  const { toast } = useToast();
  
  const [enabled, setEnabled] = useState(true);
  const [apiKey, setApiKey] = useState("6b8e3eaa1a03ebb45642e9531d8a76d2");
  const [pageCount, setPageCount] = useState("15");
  const [interval, setInterval] = useState("9000");
  const [initialDelay, setInitialDelay] = useState("2000");
  const [language, setLanguage] = useState("en-US");

  const { data: settings, isLoading } = useQuery<BackdropSettings>({
    queryKey: ["/api/admin/backdrop-settings"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: BackdropSettings) => {
      return apiRequest("PUT", "/api/admin/backdrop-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backdrop-settings"] });
      toast({
        title: "Saved",
        description: "Backdrop settings saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save backdrop settings.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (settings) {
      setEnabled(settings.backdropEnabled === "true");
      setApiKey(settings.backdropApiKey || "6b8e3eaa1a03ebb45642e9531d8a76d2");
      setPageCount(settings.backdropPageCount || "15");
      setInterval(settings.backdropInterval || "9000");
      setInitialDelay(settings.backdropInitialDelay || "2000");
      setLanguage(settings.backdropLanguage || "en-US");
    }
  }, [settings]);

  const saveSettings = () => {
    saveMutation.mutate({
      backdropEnabled: enabled.toString(),
      backdropApiKey: apiKey,
      backdropPageCount: pageCount,
      backdropInterval: interval,
      backdropInitialDelay: initialDelay,
      backdropLanguage: language,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Backdrop Configuration
          </CardTitle>
          <CardDescription>
            Configure the movie backdrop slideshow at /api/backdrop.php
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Backdrop</Label>
              <p className="text-sm text-muted-foreground">
                Show the movie backdrop slideshow
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              data-testid="switch-backdrop-enabled"
            />
          </div>

          <div className="space-y-2">
            <Label>TMDB API Key</Label>
            <Input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your TMDB API key"
              data-testid="input-api-key"
            />
            <p className="text-xs text-muted-foreground">
              Get your API key from themoviedb.org
            </p>
          </div>

          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger data-testid="select-language">
                <SelectValue placeholder="Select language..." />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Language for movie titles and descriptions
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Pages to Fetch</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value)}
                data-testid="input-page-count"
              />
              <p className="text-xs text-muted-foreground">
                Number of movie pages (20 movies/page)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Interval (ms)</Label>
              <Input
                type="number"
                min="3000"
                max="60000"
                step="1000"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                data-testid="input-interval"
              />
              <p className="text-xs text-muted-foreground">
                Time between movie changes
              </p>
            </div>

            <div className="space-y-2">
              <Label>Initial Delay (ms)</Label>
              <Input
                type="number"
                min="0"
                max="10000"
                step="500"
                value={initialDelay}
                onChange={(e) => setInitialDelay(e.target.value)}
                data-testid="input-initial-delay"
              />
              <p className="text-xs text-muted-foreground">
                Delay before first movie shows
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={saveSettings} disabled={saveMutation.isPending} data-testid="button-save">
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>

            <Button
              variant="outline"
              onClick={() => window.open("/api/backdrop.php", "_blank")}
              data-testid="button-preview"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">API Endpoint</p>
            <code className="block p-2 bg-muted rounded text-sm">
              /api/backdrop.php
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
