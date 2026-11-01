import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import type { Express, Request, Response, NextFunction } from "express";

/**
 * Servizio di attivazione (login_type "mac" e "activation").
 *
 * Il dispositivo non conosce utente e password: manda al servizio il proprio MAC (o un codice scritto
 * dall'utente) e riceve le credenziali della linea Xtream associata. L'admin crea/associa le righe da
 * "Activations" nel pannello. Un MAC sconosciuto viene registrato come "pending" cosi' compare in elenco
 * e l'admin deve solo assegnargli utente e password.
 */

const DB_DIR = "./data";
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
export const activationsDb = new Database(path.join(DB_DIR, "activations.db"));

activationsDb.exec(`
  CREATE TABLE IF NOT EXISTS activations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL CHECK (kind IN ('mac','code')),
    identifier TEXT NOT NULL,
    username TEXT NOT NULL DEFAULT '',
    password TEXT NOT NULL DEFAULT '',
    portal_index INTEGER NOT NULL DEFAULT 0,
    label TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active','pending','blocked')),
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT,
    last_ip TEXT,
    device_model TEXT,
    device_sn TEXT,
    app_version TEXT,
    UNIQUE (kind, identifier)
  );
`);

const MAX_PENDING = 500;

/** AA:BB:CC:DD:EE:FF in maiuscolo; accetta anche senza separatori o con trattini. Null se non valido. */
export function normalizeMac(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const hex = raw.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (hex.length !== 12) return null;
  return hex.match(/.{2}/g)!.join(":");
}

function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const c = raw.trim().toUpperCase();
  return /^[A-Z0-9_-]{4,64}$/.test(c) ? c : null;
}

function generateCode(): string {
  // 8 caratteri senza simboli ambigui (0/O, 1/I)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

// Limite semplice per IP sull'endpoint pubblico (anti indovinare codici)
const hits = new Map<string, { n: number; t: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60_000) { hits.set(ip, { n: 1, t: now }); return false; }
  h.n++;
  return h.n > 30;
}

type Row = {
  id: number; kind: "mac" | "code"; identifier: string; username: string; password: string;
  portal_index: number; label: string; status: "active" | "pending" | "blocked";
  expires_at: string | null; created_at: string; last_seen: string | null; last_ip: string | null;
  device_model: string | null; device_sn: string | null; app_version: string | null;
};

const toApi = (r: Row) => ({
  id: r.id, kind: r.kind, identifier: r.identifier, username: r.username, password: r.password,
  portalIndex: r.portal_index, label: r.label, status: r.status, expiresAt: r.expires_at,
  createdAt: r.created_at, lastSeen: r.last_seen, lastIp: r.last_ip,
  deviceModel: r.device_model, deviceSn: r.device_sn, appVersion: r.app_version,
});

export function registerActivationRoutes(
  app: Express,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  getPortalUrl: (index: number) => string | null,
) {
  const activate = (req: Request, res: Response) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
    if (rateLimited(ip)) return res.status(429).json({ status: "error", error: "rate_limited", message: "Too many requests" });

    const src: any = { ...(req.query as any), ...(req.body && typeof req.body === "object" ? req.body : {}) };
    const mode = String(src.mode || "").toLowerCase();
    const isMac = mode === "mac" || (!mode && src.mac && !src.code);
    const kind: "mac" | "code" = isMac ? "mac" : "code";
    const identifier = isMac ? normalizeMac(src.mac) : normalizeCode(src.code);
    if (!identifier) {
      return res.status(400).json({ status: "error", error: isMac ? "invalid_mac" : "invalid_code",
        message: isMac ? "Invalid MAC address" : "Invalid Activation Code!" });
    }

    const model = typeof src.model === "string" ? src.model.slice(0, 80) : null;
    const sn = typeof src.sn === "string" ? src.sn.slice(0, 80) : null;
    const ver = typeof src.firmware_ver === "string" ? src.firmware_ver.slice(0, 40) : null;

    let row = activationsDb.prepare("SELECT * FROM activations WHERE kind = ? AND identifier = ?").get(kind, identifier) as Row | undefined;

    if (!row) {
      if (kind === "code") {
        return res.json({ status: "error", error: "invalid_code", message: "Invalid Activation Code!" });
      }
      // MAC sconosciuto: lo registro in attesa, cosi' l'admin lo vede e lo assegna.
      const pending = (activationsDb.prepare("SELECT COUNT(*) c FROM activations WHERE status = 'pending'").get() as any).c;
      if (pending < MAX_PENDING) {
        activationsDb.prepare(
          "INSERT INTO activations (kind, identifier, status, last_seen, last_ip, device_model, device_sn, app_version) VALUES ('mac', ?, 'pending', datetime('now'), ?, ?, ?, ?)"
        ).run(identifier, ip, model, sn, ver);
      }
      return res.json({ status: "error", error: "not_active", message: "Your device is not active. Please contact support and provide MAC address." });
    }

    activationsDb.prepare("UPDATE activations SET last_seen = datetime('now'), last_ip = ?, device_model = COALESCE(?, device_model), device_sn = COALESCE(?, device_sn), app_version = COALESCE(?, app_version) WHERE id = ?")
      .run(ip, model, sn, ver, row.id);

    if (row.status === "blocked") return res.json({ status: "error", error: "blocked", message: "This device has been blocked." });
    if (row.expires_at && new Date(row.expires_at.replace(" ", "T")).getTime() < Date.now()) {
      return res.json({ status: "error", error: "expired", message: "Activation expired." });
    }
    if (row.status !== "active" || !row.username || !row.password) {
      return res.json({
        status: "error", error: "not_active",
        message: kind === "mac" ? "Your device is not active. Please contact support and provide MAC address." : "Invalid Activation Code!",
      });
    }

    return res.json({
      status: "ok",
      username: row.username,
      password: row.password,
      portal: getPortalUrl(row.portal_index) || "",
    });
  };
  app.post("/api/activate", activate);
  app.get("/api/activate", activate);

  app.get("/api/admin/activations", requireAuth, (_req, res) => {
    const rows = activationsDb.prepare("SELECT * FROM activations ORDER BY (status = 'pending') DESC, COALESCE(last_seen, created_at) DESC").all() as Row[];
    res.json({ activations: rows.map(toApi), total: rows.length, pending: rows.filter((r) => r.status === "pending").length });
  });

  app.post("/api/admin/activations", requireAuth, (req, res) => {
    const b = req.body || {};
    const kind: "mac" | "code" = b.kind === "code" ? "code" : "mac";
    const identifier = kind === "mac" ? normalizeMac(b.identifier) : (b.identifier ? normalizeCode(b.identifier) : generateCode());
    if (!identifier) return res.status(400).json({ message: kind === "mac" ? "MAC non valido (12 cifre esadecimali)" : "Codice non valido (4-64 caratteri A-Z 0-9 _ -)" });
    const username = String(b.username || "").trim();
    const password = String(b.password || "").trim();
    if (!username || !password) return res.status(400).json({ message: "Utente e password della linea sono obbligatori" });
    try {
      const info = activationsDb.prepare(
        "INSERT INTO activations (kind, identifier, username, password, portal_index, label, status, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(kind, identifier, username, password, Number(b.portalIndex) || 0, String(b.label || ""), b.status === "blocked" ? "blocked" : "active", b.expiresAt || null);
      const row = activationsDb.prepare("SELECT * FROM activations WHERE id = ?").get(info.lastInsertRowid) as Row;
      res.status(201).json(toApi(row));
    } catch (e: any) {
      if (String(e.message).includes("UNIQUE")) return res.status(409).json({ message: "Esiste gia' un'attivazione con questo identificativo" });
      throw e;
    }
  });

  app.put("/api/admin/activations/:id", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const cur = activationsDb.prepare("SELECT * FROM activations WHERE id = ?").get(id) as Row | undefined;
    if (!cur) return res.status(404).json({ message: "Non trovata" });
    const b = req.body || {};
    const username = b.username !== undefined ? String(b.username).trim() : cur.username;
    const password = b.password !== undefined ? String(b.password).trim() : cur.password;
    let status: Row["status"] = ["active", "pending", "blocked"].includes(b.status) ? b.status : cur.status;
    // assegnando utente e password a una riga in attesa, diventa attiva
    if (cur.status === "pending" && b.status === undefined && username && password) status = "active";
    if (status === "active" && (!username || !password)) return res.status(400).json({ message: "Per attivare servono utente e password" });
    activationsDb.prepare("UPDATE activations SET username = ?, password = ?, portal_index = ?, label = ?, status = ?, expires_at = ? WHERE id = ?")
      .run(username, password, b.portalIndex !== undefined ? Number(b.portalIndex) || 0 : cur.portal_index,
        b.label !== undefined ? String(b.label) : cur.label, status, b.expiresAt !== undefined ? (b.expiresAt || null) : cur.expires_at, id);
    res.json(toApi(activationsDb.prepare("SELECT * FROM activations WHERE id = ?").get(id) as Row));
  });

  app.delete("/api/admin/activations/:id", requireAuth, (req, res) => {
    activationsDb.prepare("DELETE FROM activations WHERE id = ?").run(Number(req.params.id));
    res.json({ success: true });
  });
}
