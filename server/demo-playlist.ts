import type { Express, RequestHandler } from "express";
import { mainDb } from "./sqlite";

/**
 * Playlist M3U demo (contenuti liberi o trasmessi gratis dai proprietari) per il pulsante "Prova la demo" delle app
 * e per la revisione degli store. Modificabile dal pannello, pubblica su /demo.m3u.
 */

export const DEFAULT_DEMO_M3U = `#EXTM3U
#EXTINF:-1 tvg-id="nasa" group-title="News & Science",NASA TV
https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8
#EXTINF:-1 tvg-id="dw" group-title="News & Science",DW
https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8
#EXTINF:-1 tvg-id="france24en" group-title="News & Science",France 24 English
https://static.france24.com/live/F24_EN_HI_HLS/live_web.m3u8
#EXTINF:-1 tvg-id="france24fr" group-title="News & Science",France 24 Français
https://static.france24.com/live/F24_FR_HI_HLS/live_web.m3u8
#EXTINF:-1 group-title="Open Movies (Blender Foundation)",Big Buck Bunny
https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4
#EXTINF:-1 group-title="Open Movies (Blender Foundation)",Elephants Dream
https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4
#EXTINF:-1 group-title="Open Movies (Blender Foundation)",Sintel
https://archive.org/download/Sintel/sintel-2048-surround_512kb.mp4
#EXTINF:-1 group-title="Open Movies (Blender Foundation)",Tears of Steel
https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov
`;

mainDb.exec(`
  CREATE TABLE IF NOT EXISTS demo_playlist (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    content TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);
mainDb.prepare("INSERT OR IGNORE INTO demo_playlist (id, content) VALUES (1, ?)").run(DEFAULT_DEMO_M3U);

function getDemo(): { content: string; updatedAt: string | null } {
  const r = mainDb.prepare("SELECT content, updated_at FROM demo_playlist WHERE id = 1").get() as any;
  return { content: r?.content || DEFAULT_DEMO_M3U, updatedAt: r?.updated_at || null };
}

/** Voci della playlist: nome + indirizzo. */
export function parseEntries(text: string): { name: string; url: string }[] {
  const out: { name: string; url: string }[] = [];
  let name = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#EXTINF")) {
      const i = line.lastIndexOf(",");
      name = i >= 0 ? line.slice(i + 1).trim() : "";
    } else if (!line.startsWith("#")) {
      out.push({ name: name || line, url: line });
      name = "";
    }
  }
  return out;
}

/** Controlla che ogni indirizzo risponda (primi byte, 10 s di attesa). */
async function checkUrl(url: string): Promise<{ ok: boolean; status: string }> {
  try {
    const res = await fetch(url, {
      headers: { Range: "bytes=0-2047", "User-Agent": "AppleCoreMedia/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    await res.body?.cancel().catch(() => {});
    return { ok: res.ok, status: String(res.status) };
  } catch (e: any) {
    return { ok: false, status: e?.name === "TimeoutError" ? "timeout" : "unreachable" };
  }
}

export function registerDemoPlaylistRoutes(app: Express, requireAuth: RequestHandler) {
  app.get("/demo.m3u", (_req, res) => {
    res.set("Cache-Control", "public, max-age=300").type("audio/x-mpegurl").send(getDemo().content);
  });

  app.get("/api/admin/demo-playlist", requireAuth, (_req, res) => {
    const d = getDemo();
    res.json({ ...d, entries: parseEntries(d.content).length });
  });

  app.put("/api/admin/demo-playlist", requireAuth, (req, res) => {
    const content = String(req.body?.content ?? "").replace(/\r\n/g, "\n").trim();
    if (!content.startsWith("#EXTM3U")) return res.status(400).json({ message: "The playlist must start with #EXTM3U" });
    if (!parseEntries(content).length) return res.status(400).json({ message: "The playlist has no entries" });
    if (content.length > 512 * 1024) return res.status(400).json({ message: "The playlist is too large (max 512 KB)" });
    mainDb.prepare("UPDATE demo_playlist SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1").run(content + "\n");
    const d = getDemo();
    res.json({ ...d, entries: parseEntries(d.content).length });
  });

  app.post("/api/admin/demo-playlist/reset", requireAuth, (_req, res) => {
    mainDb.prepare("UPDATE demo_playlist SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1").run(DEFAULT_DEMO_M3U);
    const d = getDemo();
    res.json({ ...d, entries: parseEntries(d.content).length });
  });

  app.post("/api/admin/demo-playlist/check", requireAuth, async (_req, res) => {
    const entries = parseEntries(getDemo().content).slice(0, 100);
    const results = await Promise.all(entries.map(async (e) => ({ ...e, ...(await checkUrl(e.url)) })));
    res.json({ results });
  });
}
