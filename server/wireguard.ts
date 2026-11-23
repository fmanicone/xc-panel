import type { Express, RequestHandler } from "express";
import multer from "multer";
import { vpnDb } from "./sqlite";

/**
 * VPN WireGuard per le app Vega (Fire TV con Vega OS: la VPN di sistema accetta solo WireGuard, non OpenVPN).
 *
 * Due modi di avere le posizioni:
 *  - importazione dall'elenco pubblico Surfshark (server + chiave pubblica di ogni posizione) e una sola chiave
 *    privata del cliente salvata qui (Surfshark: Manual setup > WireGuard > genera la coppia di chiavi): il .conf
 *    si compone al volo;
 *  - caricamento dei file .conf gia' pronti (uno per posizione).
 * WireGuard riconosce i dispositivi dalla chiave: con la stessa chiave funziona un dispositivo alla volta. Per
 * collegare tutti insieme c'e' la scorta di chiavi (wg_keys): ogni abbonato (userid mandato dall'app) riceve una
 * chiave sua, sempre la stessa. Gli account demo/revisione e la scorta vuota usano la chiave principale.
 *
 * App:  ApiIPTV.php?tag=wg                          -> elenco posizioni utilizzabili (senza chiavi)
 *       ApiIPTV.php?tag=wgconf&id=<id>&userid=<u>   -> testo del .conf della posizione
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
  CREATE TABLE IF NOT EXISTS wg_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    private_key TEXT DEFAULT '',
    address TEXT DEFAULT '10.14.0.2/16',
    dns TEXT DEFAULT '162.252.172.57, 149.154.159.92',
    port INTEGER DEFAULT 51820
  );
  INSERT OR IGNORE INTO wg_settings (id) VALUES (1);
  CREATE TABLE IF NOT EXISTS wg_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    private_key TEXT NOT NULL UNIQUE,
    userid TEXT DEFAULT '',
    assigned_at TEXT,
    last_used TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS wg_keys_userid ON wg_keys (userid);
`);
// Colonne aggiunte dopo la prima versione (tabella gia' creata in produzione).
for (const [col, def] of [["server_pubkey", "TEXT DEFAULT ''"], ["source", "TEXT DEFAULT 'conf'"]] as const) {
  const cols = vpnDb.prepare("PRAGMA table_info(wg_locations)").all() as { name: string }[];
  if (!cols.some((c) => c.name === col)) vpnDb.exec(`ALTER TABLE wg_locations ADD COLUMN ${col} ${def}`);
}

const SURFSHARK_LIST = "https://api.surfshark.com/v4/server/clusters/generic";
const KEY_RE = /^[A-Za-z0-9+/]{43}=$/;

export interface WgLocation {
  id: number;
  country: string;
  state: string;
  host: string;
  status: string;
  source: string;
  createdAt: string | null;
}

interface WgSettings {
  privateKey: string;
  address: string;
  dns: string;
  port: number;
}

export interface WgKey {
  id: number;
  keyHint: string;
  userid: string;
  assignedAt: string | null;
  lastUsed: string | null;
}

/** Account che non ricevono una chiave della scorta: demo/revisione o utente non indicato. */
const SHARED_USERS = new Set(["", "guest", "amazon", "amzon"]);

function hint(k: string): string {
  return k ? `${k.slice(0, 4)}…${k.slice(-4)}` : "";
}

/**
 * Chiave privata per l'utente: quella gia' assegnata, altrimenti una libera della scorta, altrimenti (scorta
 * esaurita) quella usata meno di recente. Scorta vuota o account demo -> chiave principale.
 */
function keyForUser(rawUser: unknown, mainKey: string): string {
  const user = String(rawUser ?? "").trim().toLowerCase();
  if (SHARED_USERS.has(user)) return mainKey;
  const pick = vpnDb.transaction((): string => {
    let row = vpnDb.prepare("SELECT id, private_key FROM wg_keys WHERE userid = ?").get(user) as any;
    if (!row) {
      row =
        (vpnDb.prepare("SELECT id, private_key FROM wg_keys WHERE userid = '' ORDER BY id LIMIT 1").get() as any) ||
        (vpnDb.prepare("SELECT id, private_key FROM wg_keys ORDER BY last_used IS NOT NULL, last_used, id LIMIT 1").get() as any);
      if (!row) return mainKey;
      vpnDb.prepare("UPDATE wg_keys SET userid = ?, assigned_at = datetime('now') WHERE id = ?").run(user, row.id);
    }
    vpnDb.prepare("UPDATE wg_keys SET last_used = datetime('now') WHERE id = ?").run(row.id);
    return String(row.private_key);
  });
  return pick();
}

function poolSize(): number {
  return (vpnDb.prepare("SELECT COUNT(*) AS n FROM wg_keys").get() as any).n as number;
}

function rowToLocation(row: any): WgLocation {
  return {
    id: row.id,
    country: row.country,
    state: row.state || "",
    host: row.host || "",
    status: row.status || "ACTIVE",
    source: row.source || "conf",
    createdAt: row.created_at || null,
  };
}

function settings(): WgSettings {
  const r = vpnDb.prepare("SELECT * FROM wg_settings WHERE id = 1").get() as any;
  return { privateKey: r?.private_key || "", address: r?.address || "10.14.0.2/16", dns: r?.dns || "", port: Number(r?.port) || 51820 };
}

/** Controlla che sia un .conf WireGuard completo e ne ricava il server (Endpoint). */
export function parseWgConf(text: string): { ok: true; host: string } | { ok: false; error: string } {
  if (!/\[Interface\]/i.test(text)) return { ok: false, error: "missing [Interface] section" };
  if (!/^\s*PrivateKey\s*=\s*\S+/im.test(text)) return { ok: false, error: "missing PrivateKey" };
  if (!/^\s*Address\s*=\s*\S+/im.test(text)) return { ok: false, error: "missing Address" };
  if (!/\[Peer\]/i.test(text)) return { ok: false, error: "missing [Peer] section" };
  if (!/^\s*PublicKey\s*=\s*\S+/im.test(text)) return { ok: false, error: "missing server PublicKey" };
  const ep = /^\s*Endpoint\s*=\s*\[?([^\]\s]+?)\]?:(\d+)\s*$/im.exec(text);
  if (!ep) return { ok: false, error: "missing Endpoint (host:port)" };
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

/** .conf completo per una posizione importata: chiave del cliente + server della posizione. */
function composeConf(host: string, serverPubKey: string, s: WgSettings): string {
  const lines = ["[Interface]", `PrivateKey = ${s.privateKey}`, `Address = ${s.address}`];
  if (s.dns.trim()) lines.push(`DNS = ${s.dns}`);
  lines.push("", "[Peer]", `PublicKey = ${serverPubKey}`, "AllowedIPs = 0.0.0.0/0", `Endpoint = ${host}:${s.port}`, "");
  return lines.join("\n");
}

export const wgStorage = {
  list(): WgLocation[] {
    return vpnDb
      .prepare("SELECT id, country, state, host, status, source, created_at FROM wg_locations ORDER BY country, state")
      .all()
      .map(rowToLocation);
  },
  /** Posizioni attive e utilizzabili: .conf caricato, oppure importata e chiave privata impostata. */
  usable(): WgLocation[] {
    const hasKey = !!settings().privateKey || poolSize() > 0;
    return vpnDb
      .prepare(
        "SELECT id, country, state, host, status, source, created_at FROM wg_locations WHERE status = 'ACTIVE' AND (config != '' OR (? AND server_pubkey != '')) ORDER BY country, state",
      )
      .all(hasKey ? 1 : 0)
      .map(rowToLocation);
  },
  config(id: number, userid?: unknown): string | null {
    const row = vpnDb.prepare("SELECT host, config, server_pubkey FROM wg_locations WHERE id = ? AND status = 'ACTIVE'").get(id) as any;
    if (!row) return null;
    if (row.config) return String(row.config);
    if (!row.server_pubkey) return null;
    const s = settings();
    const privateKey = keyForUser(userid, s.privateKey);
    if (!privateKey) return null;
    return composeConf(row.host, row.server_pubkey, { ...s, privateKey });
  },
  /** Scorta di chiavi: solo un indizio della chiave, mai la chiave intera. */
  keys(): WgKey[] {
    return (vpnDb.prepare("SELECT * FROM wg_keys ORDER BY id").all() as any[]).map((r) => ({
      id: r.id,
      keyHint: hint(String(r.private_key)),
      userid: r.userid || "",
      assignedAt: r.assigned_at || null,
      lastUsed: r.last_used || null,
    }));
  },
  /** Chiavi private incollate in blocco (una per riga, o separate da spazi/virgole). */
  addKeys(text: string): { added: number; duplicates: number; invalid: number } {
    const items = String(text || "").split(/[\s,;]+/).map((k) => k.trim()).filter(Boolean);
    const ins = vpnDb.prepare("INSERT OR IGNORE INTO wg_keys (private_key) VALUES (?)");
    let added = 0, duplicates = 0, invalid = 0;
    vpnDb.transaction(() => {
      for (const k of items) {
        if (!KEY_RE.test(k)) { invalid++; continue; }
        if (ins.run(k).changes) added++; else duplicates++;
      }
    })();
    return { added, duplicates, invalid };
  },
  releaseKey(id: number): void {
    vpnDb.prepare("UPDATE wg_keys SET userid = '', assigned_at = NULL WHERE id = ?").run(id);
  },
  removeKey(id: number): void {
    vpnDb.prepare("DELETE FROM wg_keys WHERE id = ?").run(id);
  },
  create(data: { country: string; state: string; host: string; config: string }): WgLocation {
    const r = vpnDb
      .prepare("INSERT INTO wg_locations (country, state, host, config, status, source) VALUES (?, ?, ?, ?, 'ACTIVE', 'conf')")
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
  /** Elenco pubblico Surfshark (server + chiave pubblica): aggiunge le posizioni nuove e aggiorna le chiavi. */
  async importSurfshark(): Promise<{ added: number; updated: number; total: number }> {
    const res = await fetch(SURFSHARK_LIST, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Surfshark: HTTP ${res.status}`);
    const list = (await res.json()) as any[];
    if (!Array.isArray(list)) throw new Error("Surfshark: invalid response");
    const find = vpnDb.prepare("SELECT id FROM wg_locations WHERE host = ?");
    const ins = vpnDb.prepare(
      "INSERT INTO wg_locations (country, state, host, config, status, source, server_pubkey) VALUES (?, ?, ?, '', 'ACTIVE', 'surfshark', ?)",
    );
    const upd = vpnDb.prepare("UPDATE wg_locations SET server_pubkey = ? WHERE id = ? AND source = 'surfshark'");
    let added = 0, updated = 0;
    const tx = vpnDb.transaction(() => {
      for (const s of list) {
        const host = String(s?.connectionName || "");
        const key = String(s?.pubKey || "");
        if (!host || !KEY_RE.test(key)) continue;
        const cc = String(s?.countryCode || guessLocation(host).country).toUpperCase();
        const city = String(s?.location || guessLocation(host).state);
        const ex = find.get(host) as any;
        if (ex) { upd.run(key, ex.id); updated++; } else { ins.run(cc, city, host, key); added++; }
      }
    });
    tx();
    return { added, updated, total: list.length };
  },
  settingsPublic() {
    const s = settings();
    const k = s.privateKey;
    return { hasKey: !!k, keyHint: hint(k), address: s.address, dns: s.dns, port: s.port };
  },
  saveSettings(data: { privateKey?: string; address?: string; dns?: string; port?: number }) {
    const sets: string[] = [];
    const vals: any[] = [];
    if (data.privateKey !== undefined && data.privateKey !== "") {
      const k = String(data.privateKey).trim();
      if (!KEY_RE.test(k)) throw Object.assign(new Error("Invalid private key (44 base64 characters)"), { status: 400 });
      sets.push("private_key = ?"); vals.push(k);
    }
    if (data.address !== undefined) { sets.push("address = ?"); vals.push(String(data.address).trim()); }
    if (data.dns !== undefined) { sets.push("dns = ?"); vals.push(String(data.dns).trim()); }
    if (data.port !== undefined && Number(data.port) > 0) { sets.push("port = ?"); vals.push(Number(data.port)); }
    if (sets.length) vpnDb.prepare(`UPDATE wg_settings SET ${sets.join(", ")} WHERE id = 1`).run(...vals);
    return this.settingsPublic();
  },
};

/** Risposte di ApiIPTV.php per le app (null = tag non WireGuard). */
export function wgApiResponse(tag: string, query: Record<string, unknown>): object | null {
  if (tag === "wg") {
    return {
      tag: "wg",
      success: "1",
      api_ver: "1.0v",
      wg: wgStorage.usable().map((l) => ({ id: String(l.id), country: l.country, state: l.state, status: l.status })),
    };
  }
  if (tag === "wgconf") {
    const id = Number(query.id);
    const conf = Number.isFinite(id) ? wgStorage.config(id, query.userid) : null;
    if (!conf) return { tag: "wgconf", success: "0", api_ver: "1.0v", message: "Posizione non disponibile" };
    return { tag: "wgconf", success: "1", api_ver: "1.0v", id: String(id), conf };
  }
  return null;
}

/** API di amministrazione (solo con login: chiave privata e .conf sono segreti). */
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
      if (!files.length) return res.status(400).json({ message: "No files uploaded" });
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

  // Tutte le posizioni dall'elenco pubblico Surfshark (nessun account richiesto).
  app.post("/api/admin/wg-locations/import-surfshark", requireAuth, async (_req, res) => {
    try {
      res.json(await wgStorage.importSurfshark());
    } catch (e: any) {
      res.status(502).json({ message: String(e?.message || e) });
    }
  });

  app.get("/api/admin/wg-settings", requireAuth, (_req, res) => {
    res.json(wgStorage.settingsPublic());
  });

  app.put("/api/admin/wg-settings", requireAuth, (req, res) => {
    try {
      res.json(wgStorage.saveSettings(req.body ?? {}));
    } catch (e: any) {
      res.status(e?.status || 500).json({ message: String(e?.message || e) });
    }
  });

  app.get("/api/admin/wg-keys", requireAuth, (_req, res) => {
    try {
      res.json(wgStorage.keys());
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/wg-keys", requireAuth, (req, res) => {
    try {
      res.json(wgStorage.addKeys(String(req.body?.keys ?? "")));
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/wg-keys/:id/release", requireAuth, (req, res) => {
    try {
      wgStorage.releaseKey(Number(req.params.id));
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/wg-keys/:id", requireAuth, (req, res) => {
    try {
      wgStorage.removeKey(Number(req.params.id));
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/wg-locations/:id", requireAuth, (req, res) => {
    try {
      const updated = wgStorage.update(Number(req.params.id), req.body ?? {});
      if (!updated) return res.status(404).json({ message: "Location not found" });
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
