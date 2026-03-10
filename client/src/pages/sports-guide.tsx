import { useState, useEffect, useMemo } from "react";
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

// TheSportsDB leagues - fetched dynamically from API
interface SportsdbLeague {
  id: number;
  name: string;
}

interface SportsdbGrouped {
  [sport: string]: SportsdbLeague[];
}

const languages = [
  { value: "en-CA", label: "English" },
  { value: "fr-FR", label: "French" },
  { value: "it-IT", label: "Italian" },
  { value: "de-DE", label: "German" },
  { value: "es-ES", label: "Spanish" },
  { value: "pt-PT", label: "Portuguese" },
  { value: "nl-NL", label: "Dutch" },
  { value: "tr-TR", label: "Turkish" },
];

const timezones = [
  { value: "Europe/Rome", label: "Italia (CET/CEST)" },
  { value: "Europe/Madrid", label: "Spagna (CET/CEST)" },
  { value: "Europe/London", label: "UK (GMT/BST)" },
  { value: "Europe/Berlin", label: "Germania (CET/CEST)" },
  { value: "Europe/Paris", label: "Francia (CET/CEST)" },
  { value: "Europe/Lisbon", label: "Portogallo (WET/WEST)" },
  { value: "Europe/Amsterdam", label: "Olanda (CET/CEST)" },
  { value: "Europe/Istanbul", label: "Turchia (TRT)" },
  { value: "America/New_York", label: "USA East (EST/EDT)" },
  { value: "America/Los_Angeles", label: "USA West (PST/PDT)" },
  { value: "America/Sao_Paulo", label: "Brasile (BRT)" },
  { value: "America/Mexico_City", label: "Messico (CST/CDT)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Riyadh", label: "Arabia Saudita (AST)" },
];

const tvPresets: Record<string, Record<string, string>> = {
  italy: {
    "4328": "Sky Sport / DAZN", "4335": "Sky Sport", "4331": "Sky Sport / DAZN", "4332": "DAZN",
    "4334": "Sky Sport", "4337": "DAZN", "4339": "Sky Sport", "4351": "DAZN", "4350": "DAZN",
    "4344": "Sky Sport", "4357": "DAZN", "4480": "Sky Sport / Amazon Prime", "4481": "Sky Sport / TV8",
    "4502": "DAZN / Sky Sport", "4346": "Rai Sport", "4482": "Sky Sport", "4483": "Sky Sport"
  },
  spain: {
    "4328": "DAZN / Movistar+", "4335": "DAZN", "4331": "Movistar+ / DAZN", "4332": "DAZN",
    "4334": "Movistar+", "4337": "DAZN", "4339": "DAZN", "4351": "DAZN", "4350": "DAZN",
    "4344": "DAZN", "4357": "DAZN", "4480": "Movistar+ Liga de Campeones", "4481": "Movistar+",
    "4502": "Movistar+", "4346": "La 1 / RTVE", "4482": "ESPN", "4483": "DAZN"
  },
  uk: {
    "4328": "Sky / TNT", "4335": "Sky Sports", "4331": "Sky / DAZN", "4332": "Viaplay",
    "4334": "Sky Sport", "4337": "TNT Sports", "4339": "Viaplay", "4351": "Premier Sports", "4350": "Sky Sport",
    "4344": "BT Sport", "4357": "BT Sport", "4480": "TNT / Amazon", "4481": "TNT Sports",
    "4502": "TNT Sports", "4346": "BBC / ITV", "4482": "BBC / ITV", "4483": "Sky Sports"
  },
  germany: {
    "4328": "Sky / DAZN", "4335": "Sky Sport", "4331": "Sky / DAZN", "4332": "DAZN",
    "4334": "DAZN", "4337": "DAZN", "4339": "DAZN", "4351": "DAZN", "4350": "DAZN",
    "4344": "DAZN", "4357": "DAZN", "4480": "DAZN / Amazon Prime", "4481": "RTL / DAZN",
    "4502": "DAZN", "4346": "ARD / ZDF", "4482": "DAZN", "4483": "Sky Sport"
  },
  france: {
    "4328": "Canal+ / beIN Sports", "4335": "beIN Sports", "4331": "beIN Sports", "4332": "beIN Sports",
    "4334": "DAZN / beIN Sports", "4337": "beIN Sports", "4339": "beIN Sports", "4351": "beIN Sports", "4350": "beIN Sports",
    "4344": "beIN Sports", "4357": "beIN Sports", "4480": "Canal+ / beIN Sports", "4481": "Canal+ / W9",
    "4502": "Canal+", "4346": "TF1 / M6", "4482": "beIN Sports", "4483": "beIN Sports"
  },
};

const tvCountryOptions = [
  { value: "italy", label: "Italia" },
  { value: "spain", label: "Espana" },
  { value: "uk", label: "United Kingdom" },
  { value: "germany", label: "Deutschland" },
  { value: "france", label: "France" },
  { value: "custom", label: "Custom" },
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
  widgetSource: string;
  widgetApiKey: string;
  widgetSportsdbSport: string;
  widgetSportsdbLeagues: string;
  widgetTvCountry: string;
  widgetTvMap: string;
  widgetTimezone: string;
}

export default function SportsGuide() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"soccer" | "sports">("soccer");
  const [widgetSource, setWidgetSource] = useState<"futbolenlatv" | "thesportsdb">("futbolenlatv");

  const [width, setWidth] = useState("280");
  const [height, setHeight] = useState("500");
  const [color, setColor] = useState("#005df8");
  const [competition, setCompetition] = useState("");
  const [allCompetitions, setAllCompetitions] = useState(true);
  const [team, setTeam] = useState("");
  const [allTeams, setAllTeams] = useState(true);
  const [sport, setSport] = useState("futbol");
  const [language, setLanguage] = useState("en-CA");
  const [apiKey, setApiKey] = useState("");
  const [selectedLeagues, setSelectedLeagues] = useState<number[]>([]);
  const [tvCountry, setTvCountry] = useState("italy");
  const [tvMap, setTvMap] = useState<Record<string, string>>(() => ({ ...tvPresets["italy"] }));
  const [timezone, setTimezone] = useState("Europe/Rome");
  const [leagueSearch, setLeagueSearch] = useState("");

  const { data: settings, isLoading } = useQuery<WidgetSettings>({
    queryKey: ["/api/admin/widget-settings"],
  });

  const { data: sportsdbData, isLoading: leaguesLoading } = useQuery<{ grouped: SportsdbGrouped }>({
    queryKey: ["/api/admin/sportsdb-leagues"],
    enabled: widgetSource === "thesportsdb",
    staleTime: 1000 * 60 * 30,
  });

  const selectedSet = useMemo(() => new Set(selectedLeagues), [selectedLeagues]);

  const leagueNameMap = useMemo(() => {
    if (!sportsdbData?.grouped) return new Map<number, string>();
    const entries: [number, string][] = [];
    for (const leagues of Object.values(sportsdbData.grouped)) {
      for (const l of leagues) entries.push([l.id, l.name]);
    }
    return new Map(entries);
  }, [sportsdbData]);

  const searchLower = leagueSearch.toLowerCase();

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
      setWidgetSource((settings.widgetSource || "futbolenlatv") as "futbolenlatv" | "thesportsdb");
      setApiKey(settings.widgetApiKey || "");
      if (settings.widgetSportsdbLeagues) {
        try {
          const parsed = JSON.parse(settings.widgetSportsdbLeagues);
          if (Array.isArray(parsed) && parsed.length > 0) setSelectedLeagues(parsed);
        } catch {}
      }
      setTimezone(settings.widgetTimezone || "Europe/Rome");
      const country = settings.widgetTvCountry || "italy";
      setTvCountry(country);
      if (country === "custom" && settings.widgetTvMap) {
        try {
          setTvMap(JSON.parse(settings.widgetTvMap));
        } catch {
          setTvMap({ ...tvPresets["italy"] });
        }
      } else {
        setTvMap({ ...tvPresets[country] || tvPresets["italy"] });
      }
    }
  }, [settings]);

  const handleTvCountryChange = (value: string) => {
    setTvCountry(value);
    if (value !== "custom") {
      setTvMap({ ...tvPresets[value] || tvPresets["italy"] });
    }
  };

  const updateTvChannel = (leagueId: string, channel: string) => {
    setTvMap(prev => ({ ...prev, [leagueId]: channel }));
    if (tvCountry !== "custom") {
      setTvCountry("custom");
    }
  };

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
      widgetSource,
      widgetApiKey: apiKey,
      widgetSportsdbSport: "",
      widgetSportsdbLeagues: JSON.stringify(selectedLeagues),
      widgetTvCountry: tvCountry,
      widgetTvMap: JSON.stringify(tvMap),
      widgetTimezone: timezone,
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
          <div className="space-y-2">
            <Label>Widget Source</Label>
            <div className="flex gap-2">
              <Button
                variant={widgetSource === "futbolenlatv" ? "default" : "outline"}
                onClick={() => setWidgetSource("futbolenlatv")}
              >
                FutbolEnLaTV
              </Button>
              <Button
                variant={widgetSource === "thesportsdb" ? "default" : "outline"}
                onClick={() => setWidgetSource("thesportsdb")}
              >
                TheSportsDB
              </Button>
            </div>
          </div>

          {widgetSource === "thesportsdb" ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>TheSportsDB API Key</Label>
                <Input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your TheSportsDB API key"
                />
              </div>

              <div className="space-y-4">
                <Label>Sports &amp; Leagues</Label>
                <Input
                  type="text"
                  placeholder="Search leagues..."
                  value={leagueSearch}
                  onChange={(e) => setLeagueSearch(e.target.value)}
                  className="max-w-sm"
                />
                {leaguesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading leagues from TheSportsDB...
                  </div>
                ) : sportsdbData?.grouped ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(sportsdbData.grouped).map(([sportName, leagues]) => {
                      const filtered = searchLower
                        ? leagues.filter(l => l.name.toLowerCase().includes(searchLower))
                        : leagues;
                      if (filtered.length === 0) return null;
                      const groupLeagueIds = filtered.map(l => l.id);
                      const allSelected = groupLeagueIds.length > 0 && groupLeagueIds.every(id => selectedSet.has(id));
                      const someSelected = groupLeagueIds.some(id => selectedSet.has(id));
                      return (
                        <div key={sportName} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`sport-group-${sportName}`}
                              checked={allSelected}
                              className={!allSelected && someSelected ? "opacity-60" : ""}
                              onCheckedChange={(checked) => {
                                setSelectedLeagues(prev => {
                                  if (checked) {
                                    const next = [...prev];
                                    for (const id of groupLeagueIds) {
                                      if (!next.includes(id)) next.push(id);
                                    }
                                    return next;
                                  }
                                  return prev.filter(id => !groupLeagueIds.includes(id));
                                });
                              }}
                            />
                            <Label htmlFor={`sport-group-${sportName}`} className="font-semibold cursor-pointer">
                              {sportName}
                            </Label>
                          </div>
                          <div className="ml-6 space-y-1 max-h-60 overflow-y-auto">
                            {filtered.map((league) => (
                              <div key={league.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`league-${league.id}`}
                                  checked={selectedSet.has(league.id)}
                                  onCheckedChange={(checked) => {
                                    setSelectedLeagues(prev => {
                                      if (checked) return [...prev, league.id];
                                      return prev.filter(id => id !== league.id);
                                    });
                                  }}
                                />
                                <Label htmlFor={`league-${league.id}`} className="text-sm cursor-pointer">
                                  {league.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Enter an API key and save to load leagues.</p>
                )}
                {selectedLeagues.length > 0 && (
                  <p className="text-xs text-muted-foreground">{selectedLeagues.length} league(s) selected</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
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
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone..." />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedLeagues.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label>TV Channels Preset</Label>
                    <Select value={tvCountry} onValueChange={handleTvCountryChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tvCountryOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select a country preset or customize each league channel below. Editing any channel switches to Custom.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>TV Channels per League</Label>
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedLeagues.map((leagueId) => (
                        <div key={leagueId} className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            {leagueNameMap.get(leagueId) || `League ${leagueId}`}
                          </Label>
                          <Input
                            type="text"
                            value={tvMap[String(leagueId)] || ""}
                            onChange={(e) => updateTvChannel(String(leagueId), e.target.value)}
                            placeholder="Channel name..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

            </div>
          ) : (
            <>
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
            </>
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
