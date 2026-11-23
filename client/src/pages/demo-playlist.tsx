import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ExternalLink, ListChecks, RotateCcw, Save } from "lucide-react";

type Demo = { content: string; updatedAt: string | null; entries: number };
type Check = { name: string; url: string; ok: boolean; status: string };

/** Demo M3U playlist used by the "Try the demo" button in the apps (public at /demo.m3u). */
export default function DemoPlaylistPage() {
  const { toast } = useToast();
  const [demo, setDemo] = useState<Demo | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState<Check[] | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const d: Demo = await (await apiRequest("GET", "/api/admin/demo-playlist")).json();
      setDemo(d);
      setText(d.content);
    } catch {
      toast({ title: "Error", description: "Could not load the demo playlist", variant: "destructive" });
    }
  }

  async function run(method: "PUT" | "POST", url: string, body?: object, done?: string) {
    setBusy(true);
    try {
      const d: Demo = await (await apiRequest(method, url, body)).json();
      setDemo(d);
      setText(d.content);
      setChecks(null);
      if (done) toast({ title: done, description: `${d.entries} entries` });
    } catch (e: any) {
      toast({ title: "Error", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    setBusy(true);
    try {
      const r = await (await apiRequest("POST", "/api/admin/demo-playlist/check")).json();
      setChecks(r.results);
    } catch {
      toast({ title: "Error", description: "Check failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  if (!demo) return <div className="p-6">Loading...</div>;
  const dirty = text !== demo.content;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Demo Playlist</h1>
        <p className="text-muted-foreground text-sm mt-1">
          M3U playlist opened by the "Try the demo" button in the apps and used for store review. Only add content you are
          allowed to distribute (official free streams, open movies). Public address:{" "}
          <a className="underline inline-flex items-center gap-1" href="/demo.m3u" target="_blank" rel="noreferrer">
            /demo.m3u <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Playlist ({demo.entries} entries)</CardTitle>
          <CardDescription>
            Standard M3U: one <code>#EXTINF</code> line (with <code>group-title</code> and <code>tvg-logo</code>) followed by the
            stream address. Live streams (.m3u8, .ts) appear under Live TV, files (.mp4, .mkv, .mov) under Movies.
            {demo.updatedAt ? ` Last saved ${demo.updatedAt} UTC.` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea rows={18} className="font-mono text-xs" spellCheck={false} value={text}
            onChange={(e) => setText(e.target.value)} data-testid="input-demo-m3u" />
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !dirty} onClick={() => run("PUT", "/api/admin/demo-playlist", { content: text }, "Saved")}>
              <Save className="w-4 h-4 mr-2" /> Save
            </Button>
            <Button variant="secondary" disabled={busy} onClick={check}>
              <ListChecks className="w-4 h-4 mr-2" /> {busy ? "Working..." : "Check streams"}
            </Button>
            <Button variant="outline" disabled={busy}
              onClick={() => { if (confirm("Replace the playlist with the default demo content?")) run("POST", "/api/admin/demo-playlist/reset", undefined, "Default restored"); }}>
              <RotateCcw className="w-4 h-4 mr-2" /> Restore default
            </Button>
          </div>
          {dirty && <p className="text-xs text-amber-500">Unsaved changes: the check uses the saved playlist.</p>}
        </CardContent>
      </Card>

      {checks && (
        <Card>
          <CardHeader><CardTitle>Stream check</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Result</TableHead><TableHead>Address</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {checks.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>
                      {c.ok ? <Badge className="bg-green-600">OK</Badge> : <Badge variant="destructive">{c.status}</Badge>}
                    </TableCell>
                    <TableCell className="font-mono text-xs break-all">{c.url}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
