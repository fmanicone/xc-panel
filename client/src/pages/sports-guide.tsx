import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tv, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const competitions = [
  { value: "afc-copa-asia-sub23", label: "AFC U23 Asian Cup" },
  { value: "copa-africa", label: "Africa Cup of Nations" },
  { value: "hyundai-australian-league", label: "A-League" },
  { value: "w-league", label: "A-League Women" },
  { value: "asean-club-championship", label: "ASEAN Club Championship" },
  { value: "bundesliga", label: "Bundesliga" },
  { value: "campeonato-nacional-sub19", label: "Campeonato Nacional Sub-19" },
  { value: "liga-campeones", label: "Champions League" },
  { value: "championship", label: "Championship" },
  { value: "copa-de-italia", label: "Coppa Italia" },
  { value: "division1-feminine", label: "Division 1 Women" },
  { value: "europa-league", label: "Europa League" },
  { value: "fifa-world-cup", label: "FIFA World Cup 2026" },
  { value: "calcio-serie-a", label: "Italian Serie A" },
  { value: "calcio-serie-b", label: "Italian Serie B" },
  { value: "la-liga", label: "LaLiga" },
  { value: "segunda-liga", label: "Liga Portugal 2" },
  { value: "ligue-1", label: "Ligue 1" },
  { value: "ligue-2", label: "Ligue 2" },
  { value: "the-national-league", label: "National League" },
  { value: "northern-irish-premiership", label: "NIFL Premiership" },
  { value: "premier-league", label: "Premier League" },
  { value: "football-league-cup", label: "Premier League Cup" },
  { value: "premier-escocia", label: "Premiership" },
  { value: "primeira-liga", label: "Primeira Liga" },
  { value: "liga-profesional-saudi", label: "Saudi Pro League" },
  { value: "segunda-division-rfef", label: "Segunda RFEF - Group 5" },
  { value: "serie-c", label: "Serie C - Promotion - Play Offs" },
  { value: "slovak-super-liga", label: "Slovak Super Liga" },
  { value: "supercopa-francia", label: "Super Cup" },
  { value: "uefa-youth-league", label: "UEFA Youth League" },
  { value: "fa-womens-super-league", label: "Women's Super League" },
];

const teams = [
  { value: "toronto-fc", label: "Toronto FC" },
  { value: "vancouver", label: "Vancouver Whitecaps" },
  { value: "montreal-impact", label: "CF Montreal" },
  { value: "atlanta-united", label: "Atlanta Utd" },
  { value: "inter-miami-cf", label: "Inter Miami" },
  { value: "la-galaxy", label: "Los Angeles Galaxy" },
  { value: "new-york-rb", label: "New York Red Bulls" },
  { value: "seattle-sounders", label: "Seattle Sounders" },
  { value: "ac-milan", label: "AC Milan" },
  { value: "real-madrid", label: "Real Madrid" },
  { value: "barcelona", label: "FC Barcelona" },
  { value: "manchester-united", label: "Manchester United" },
];

const sports = [
  { value: "futbol", label: "Soccer" },
  { value: "baloncesto", label: "Basketball" },
  { value: "beisbol", label: "Baseball" },
  { value: "futbol-americano", label: "Football" },
  { value: "hockey", label: "Hockey" },
  { value: "tenis", label: "Tennis" },
  { value: "automovilismo", label: "Motor Racing" },
  { value: "rugby", label: "Rugby Union" },
  { value: "golf", label: "Golf" },
  { value: "boxeo", label: "Boxing" },
  { value: "mma", label: "MMA" },
  { value: "cricket", label: "Cricket" },
];

const languages = [
  { value: "en-CA", label: "English" },
  { value: "fr-FR", label: "French" },
  { value: "it-IT", label: "Italian" },
  { value: "de-DE", label: "German" },
];

interface WidgetSettings {
  widgetWidth: string;
  widgetHeight: string;
  widgetColor: string;
  widgetType: string;
  widgetCompetition: string;
  widgetAllCompetitions: string;
  widgetTeam: string;
  widgetAllTeams: string;
  widgetSport: string;
  widgetLanguage: string;
}

export default function SportsGuide() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"soccer" | "sports">("soccer");
  
  const [width, setWidth] = useState("280");
  const [height, setHeight] = useState("500");
  const [color, setColor] = useState("#005df8");
  const [competition, setCompetition] = useState("");
  const [allCompetitions, setAllCompetitions] = useState(true);
  const [team, setTeam] = useState("");
  const [allTeams, setAllTeams] = useState(true);
  const [sport, setSport] = useState("futbol");
  const [language, setLanguage] = useState("en-CA");

  const { data: settings, isLoading } = useQuery<WidgetSettings>({
    queryKey: ["/api/admin/widget-settings"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: WidgetSettings) => {
      return apiRequest("PUT", "/api/admin/widget-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/widget-settings"] });
      toast({
        title: "Saved",
        description: "Widget settings saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save widget settings.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (settings) {
      setWidth(settings.widgetWidth || "280");
      setHeight(settings.widgetHeight || "500");
      setColor(settings.widgetColor || "#005df8");
      setActiveTab((settings.widgetType || "soccer") as "soccer" | "sports");
      setCompetition(settings.widgetCompetition || "");
      setAllCompetitions(settings.widgetAllCompetitions === "true");
      setTeam(settings.widgetTeam || "");
      setAllTeams(settings.widgetAllTeams === "true");
      setSport(settings.widgetSport || "futbol");
      setLanguage(settings.widgetLanguage || "en-CA");
    }
  }, [settings]);

  const saveSettings = () => {
    saveMutation.mutate({
      widgetWidth: width,
      widgetHeight: height,
      widgetColor: color,
      widgetType: activeTab,
      widgetCompetition: competition,
      widgetAllCompetitions: allCompetitions.toString(),
      widgetTeam: team,
      widgetAllTeams: allTeams.toString(),
      widgetSport: sport,
      widgetLanguage: language,
    });
  };

  useEffect(() => {
    if (allCompetitions) setCompetition("");
  }, [allCompetitions]);

  useEffect(() => {
    if (allTeams) setTeam("");
  }, [allTeams]);

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
            <Tv className="w-5 h-5" />
            Configure your Widget
          </CardTitle>
          <CardDescription>
            Configure the widget that will be displayed at /api/sport.php
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Button
              variant={activeTab === "soccer" ? "default" : "outline"}
              onClick={() => setActiveTab("soccer")}
              data-testid="button-tab-soccer"
            >
              TV Soccer Schedule
            </Button>
            <Button
              variant={activeTab === "sports" ? "default" : "outline"}
              onClick={() => setActiveTab("sports")}
              data-testid="button-tab-sports"
            >
              TV Sports Schedule
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Measures</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="240"
                  max="500"
                  placeholder="Width"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  data-testid="input-width"
                />
                <span className="text-muted-foreground">x</span>
                <Input
                  type="number"
                  min="360"
                  max="700"
                  placeholder="Height"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  data-testid="input-height"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Colour</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-16 h-9 p-1 cursor-pointer"
                  data-testid="input-color"
                />
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1"
                  placeholder="#005df8"
                  data-testid="input-color-text"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger data-testid="select-language">
                <SelectValue placeholder="Select a language..." />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeTab === "soccer" && (
            <div className="space-y-2">
              <Label>Competition</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={competition}
                  onValueChange={setCompetition}
                  disabled={allCompetitions}
                >
                  <SelectTrigger data-testid="select-competition">
                    <SelectValue placeholder="Select a competition..." />
                  </SelectTrigger>
                  <SelectContent>
                    {competitions.map((comp) => (
                      <SelectItem key={comp.value} value={comp.value}>
                        {comp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="all-competitions"
                    checked={allCompetitions}
                    onCheckedChange={(checked) => setAllCompetitions(checked as boolean)}
                    data-testid="checkbox-all-competitions"
                  />
                  <Label htmlFor="all-competitions" className="text-sm whitespace-nowrap">
                    All
                  </Label>
                </div>
              </div>
            </div>
          )}


          <Button onClick={saveSettings} disabled={saveMutation.isPending} data-testid="button-save">
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
