import type { Express, RequestHandler } from "express";
import multer from "multer";
import { vpnDb } from "./sqlite";

/**
 * VPN WireGuard per le app Vega (Fire TV con Vega OS: la VPN di sistema accetta solo WireGuard, non OpenVPN).
 *
 * Una riga per posizione, con il file .conf scaricato dal fornitore (es. Surfshark: Manual setup > WireGuard >
 * Locations). Versione di prova: ogni posizione ha il suo .conf con la stessa chiave privata, quindi funziona
 * bene con un dispositivo alla volta (WireGuard riconosce i dispositivi dalla chiave).
 *
 * App:  ApiIPTV.php?tag=wg                -> elenco posizioni attive (senza chiavi)
 *       ApiIPTV.php?tag=wgconf&id=<id>    -> testo del .conf della posizione
 */

vpnDb.exec(`
  CREATE TABLE IF NOT EXISTS wg_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country TEXT NOT NULL,
    state TEXT DEFAULT '',
    host TEXT DEFAULT '',
    config TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

export interface WgLocation {
  id: number;
  country: string;
  state: string;
  host: string;
  status: string;
  createdAt: string | null;
}

function rowToLocation(row: any): WgLocation {
  return {
    id: row.id,
    country: row.country,
    state: row.state || "",
    host: row.host || "",
    status: row.status || "ACTIVE",
    createdAt: row.created_at || null,
  };
}

/** Controlla che sia un .conf WireGuard completo e ne ricava il server (Endpoint). */
export function parseWgConf(text: string): { ok: true; host: string } | { ok: false; error: string } {
  if (!/\[Interface\]/i.test(text)) return { ok: false, error: "manca la sezione [Interface]" };
  if (!/^\s*PrivateKey\s*=\s*\S+/im.test(text)) return { ok: false, error: "manca PrivateKey" };
  if (!/^\s*Address\s*=\s*\S+/im.test(text)) return { ok: false, error: "manca Address" };
  if (!/\[Peer\]/i.test(text)) return { ok: false, error: "manca la sezione [Peer]" };
  if (!/^\s*PublicKey\s*=\s*\S+/im.test(text)) return { ok: false, error: "manca PublicKey del server" };
  const ep = /^\s*Endpoint\s*=\s*\[?([^\]\s]+?)\]?:(\d+)\s*$/im.exec(text);
  if (!ep) return { ok: false, error: "manca Endpoint (host:porta)" };
  return { ok: true, host: ep[1] };
}

/** Paese e citta' dal nome del server Surfshark (es. "it-mil.prod.surfshark.com" -> IT, MIL). */
export function guessLocation(host: string): { country: string; state: string } {
  const first = host.split(".")[0] || "";
  const [cc, ...rest] = first.split("-");
  const country = /^[a-z]{2}$/i.test(cc || "") ? cc.toUpperCase() : "";
  const state = rest.join(" ").toUpperCase();
  return { country: country || "XX", state };
}

export const wgStorage = {
  list(): WgLocation[] {
    return vpnDb.prepare("SELECT id, country, state, host, status, created_at FROM wg_locations ORDER BY country, state").all().map(rowToLocation);
  },
  active(): WgLocation[] {
    return this.list().filter((l) => l.status === "ACTIVE");
  },
  config(id: number): string | null {
    const row = vpnDb.prepare("SELECT config FROM wg_locations WHERE id = ? AND status = 'ACTIVE'").get(id) as any;
    return row ? String(row.config) : null;
  },
  create(data: { country: string; state: string; host: string; config: string }): WgLocation {
    const r = vpnDb
      .prepare("INSERT INTO wg_locations (country, state, host, config, status) VALUES (?, ?, ?, ?, 'ACTIVE')")
      .run(data.country, data.state, data.host, data.config);
    return rowToLocation(vpnDb.prepare("SELECT * FROM wg_locations WHERE id = ?").get(r.lastInsertRowid));
  },
  update(id: number, data: Partial<Pick<WgLocation, "country" | "state" | "status">>): WgLocation | null {
    const sets: string[] = [];
    const vals: any[] = [];
    if (data.country !== undefined) { sets.push("country = ?"); vals.push(String(data.country).toUpperCase()); }
    if (data.state !== undefined) { sets.push("state = ?"); vals.push(String(data.state)); }
    if (data.status !== undefined) { sets.push("status = ?"); vals.push(data.status === "INACTIVE" ? "INACTIVE" : "ACTIVE"); }
    if (sets.length) vpnDb.prepare(`UPDATE wg_locations SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
    const row = vpnDb.prepare("SELECT * FROM wg_locations WHERE id = ?").get(id);
    return row ? rowToLocation(row) : null;
  },
  remove(id: number): void {
    vpnDb.prepare("DELETE FROM wg_locations WHERE id = ?").run(id);
  },
};

/** Risposte di ApiIPTV.php per le app (null = tag non WireGuard). */
export function wgApiResponse(tag: string, query: Record<string, unknown>): object | null {
  if (tag === "wg") {
    return {
      tag: "wg",
      success: "1",
      api_ver: "1.0v",
      wg: wgStorage.active().map((l) => ({ id: String(l.id), country: l.country, state: l.state, status: l.status })),
    };
  }
  if (tag === "wgconf") {
    const id = Number(query.id);
    const conf = Number.isFinite(id) ? wgStorage.config(id) : null;
    if (!conf) return { tag: "wgconf", success: "0", api_ver: "1.0v", message: "Posizione non trovata" };
    return { tag: "wgconf", success: "1", api_ver: "1.0v", id: String(id), conf };
  }
  return null;
}

/** API di amministrazione (solo con login: i .conf contengono la chiave privata). */
export function registerWireguardRoutes(app: Express, requireAuth: RequestHandler) {
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 64 * 1024, files: 300 } });

  app.get("/api/admin/wg-locations", requireAuth, (_req, res) => {
    try {
      res.json(wgStorage.list());
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Uno o piu' file .conf (campo "files"): una posizione per file, paese e citta' ricavati dal server.
  app.post("/api/admin/wg-locations/upload", requireAuth, upload.array("files", 300), (req, res) => {
    try {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (!files.length) return res.status(400).json({ message: "Nessun file caricato" });
      const results = files.map((f) => {
        const text = f.buffer.toString("utf8").replace(/\r\n/g, "\n").trim() + "\n";
        const parsed = parseWgConf(text);
        if (!parsed.ok) return { name: f.originalname, ok: false, error: parsed.error };
        const loc = guessLocation(parsed.host);
        const created = wgStorage.create({ ...loc, host: parsed.host, config: text });
        return { name: f.originalname, ok: true, id: created.id };
      });
      res.json({ results });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/wg-locations/:id", requireAuth, (req, res) => {
    try {
      const updated = wgStorage.update(Number(req.params.id), req.body ?? {});
      if (!updated) return res.status(404).json({ message: "Posizione non trovata" });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/wg-locations/:id", requireAuth, (req, res) => {
    try {
      wgStorage.remove(Number(req.params.id));
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
