import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import express from "express";
import session from "express-session";
import Database from "better-sqlite3";
import SqliteStore from "better-sqlite3-session-store";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { defaultInterfaceToggles } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";

const SessionStore = SqliteStore(session);
const sessionDb = new Database(path.join(process.cwd(), "data", "sessions.db"));
import {
  sendCommandToUser,
  sendCommandToUsers,
  sendCommandToAll,
  sendCommandAndWaitForResponse,
  getConnectedDevices,
  isUserConnected,
  getWebSocketStats,
  REMOTE_COMMANDS,
  sendMessageToUser,
  sendMessageToUsers,
  sendMessageToAll,
  sendAnnouncementToUser,
  type AnnouncementParams
} from "./devices";

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    username?: string;
  }
}

const introUpload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, "intro.mp4");
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 }
});

function encode(str: string, key: string): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return Buffer.from(result, "binary").toString("base64");
}

function encryptAES(data: string): string {
  const key = "mysecretkeywsdef";
  const iv = "myuniqueivparamu";
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
  return encrypted.toString("hex");
}

const announcementSchema = z.object({
  announcement: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
  status: z.string().optional(),
  expiration: z.string().optional(),
  expire: z.string().optional(),
  displayTime: z.number().optional(),
  displayFor: z.number().optional(),
  disappearTime: z.number().optional(),
  disappearAfter: z.number().optional(),
}).refine((data) => data.announcement || data.message, {
  message: "Announcement message is required",
});

const messageSchema = z.object({
  username: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  message: z.string().min(1),
  status: z.string().optional(),
  expiration: z.string().optional(),
  expire: z.string().optional(),
}).refine((data) => data.username || data.userId, {
  message: "Username or userId is required",
});

const globalMessageSchema = z.object({
  message: z.string(),
  status: z.string().optional(),
});

const vpnServerSchema = z.object({
  country: z.string().min(1),
  state: z.string().optional(),
  ovpnUrl: z.string().optional(),
  authType: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  status: z.string().optional(),
  authEmbedded: z.string().optional(),
  vpnCountry: z.string().optional(),
});

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.use(session({
    store: new SessionStore({
      client: sessionDb,
      expired: { clear: true, intervalMs: 900000 }
    }),
    secret: process.env.SESSION_SECRET || 'iptv-admin-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 giorni
    },
  }));

  // Serve uploads folder as static files
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));

  const existingSettings = storage.getSettings();
  if (!existingSettings) {
    storage.initializeSettings();
  }

  app.post("/api/auth/login", (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const admin = storage.getAdminUserByUsername(username);
      
      if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
        storage.createLoginAttempt({
          attemptedUsername: username,
          ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || '',
          userAgent: req.headers['user-agent'] || '',
        });
        return res.status(401).json({ message: "Invalid username or password" });
      }

      req.session.userId = admin.id;
      req.session.username = admin.username;
      
      res.json({ success: true, username: admin.username });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/session", (req, res) => {
    if (req.session.userId) {
      res.json({ authenticated: true, username: req.session.username });
    } else {
      res.json({ authenticated: false });
    }
  });

  app.get("/api/admin/login-attempts", requireAuth, (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const attempts = storage.getLoginAttempts(limit, offset);
      const total = storage.getLoginAttemptsCount();
      res.json({ attempts, total });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/login-attempts", requireAuth, (req, res) => {
    try {
      storage.clearLoginAttempts();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/change-password", requireAuth, (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password required" });
      }

      const admin = storage.getAdminUser();
      if (!admin || !bcrypt.compareSync(currentPassword, admin.passwordHash)) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const newHash = bcrypt.hashSync(newPassword, 10);
      storage.updateAdminPassword(admin.username, newHash);
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/intro.php", (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['host'] || '';
    const introUrl = `${protocol}://${host}/uploads/intro.mp4`;
    res.redirect(301, introUrl);
  });

  // CloudBackup.php endpoint - handles cloud backup save and restore
  app.all("/api/CloudBackup.php", (req, res) => {
    console.log('CloudBackup request:', { method: req.method, body: req.body, query: req.query });
    try {
      const resetcode = req.body?.resetcode || req.query?.resetcode || '';
      const backup = req.body?.backup || req.query?.backup || '';
      const userId = req.body?.user || req.query?.user || '';
      const pass = req.body?.pass || req.query?.pass || '';

      // Response templates matching PHP format
      const backedup = '{\r\n\t"tag":"CloudBackup",\r\n\t"success":"1",\r\n\t"api_ver":"1.4v",\r\n\t"version":"1.4",\r\n\t"msg":"Your backup has been completed successfully"\r\n}';
      const badpass = '{\r\n\t"tag":"CloudBackup",\r\n\t"success":"0",\r\n\t"api_ver":"1.4v",\r\n\t"version":"1.4",\r\n\t"msg":"Backup Password is incorrect. Please check your password and try again. Code: BPE"\r\n}';
      const nouser = '{"tag":"CloudBackup","success":"0","api_ver":"1.0v","version":"1.0","msg":"Your Cloud Backup has been failed. Please try again or contact support. Code: JE"}';

      // Get existing backup for this user
      const existingBackup = storage.getCloudBackup(userId);

      // If resetcode is provided - this is a save/update operation
      if (resetcode) {
        if (!existingBackup) {
          // User doesn't exist - create new backup
          storage.createCloudBackup({
            user: userId,
            pass: pass,
            resetcode: resetcode,
            backup: backup
          });
          res.type('application/json').send(backedup);
        } else {
          // User exists - update backup
          storage.updateCloudBackup(userId, backup);
          res.type('application/json').send(backedup);
        }
        return;
      }

      // No resetcode - this is a restore operation
      if (!resetcode || resetcode === '') {
        if (existingBackup && pass === existingBackup.pass) {
          // Password matches - return the backup
          const restoreResponse = '\r\n{\r\n"tag":"CloudBackup",\r\n"success":"1",\r\n"api_ver":"1.4v",\r\n\t"version":"1.4",\r\n"backup":"' + (existingBackup.backup || '') + '",\r\n"msg":"Backup has been downloaded successfully"\r\n}';
          res.type('application/json').send(restoreResponse);
        } else {
          // Password doesn't match
          res.type('application/json').send(badpass);
        }
        return;
      }

      // Fallback
      res.type('application/json').send(nouser);
    } catch (err) {
      console.error('CloudBackup error:', err);
      res.type('application/json').send('{"tag":"CloudBackup","success":"0","api_ver":"1.0v","version":"1.0","msg":"Your Cloud Backup has been failed. Please try again or contact support. Code: SE"}');
    }
  });

  app.get(api.settings.get.path, (req, res) => {
    try {
      let settings = storage.getSettings();
      if (!settings) {
        settings = storage.initializeSettings();
      }
      res.json(settings);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.settings.update.path, (req, res) => {
    try {
      const updated = storage.updateSettings(req.body);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.announcements.get.path, (req, res) => {
    try {
      let announcement = storage.getAnnouncement();
      if (!announcement) {
        announcement = storage.updateAnnouncement({
          announcement: "hello world this is an announcement test",
          status: "INACTIVE",
          expiration: "2025-12-31 00:00:00",
          displayTime: 1,
          disappearTime: 1,
        });
      }
      res.json(announcement);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.announcements.update.path, (req, res) => {
    try {
      const input = announcementSchema.parse(req.body);
      const updated = storage.updateAnnouncement(input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.messages.list.path, (req, res) => {
    try {
      const messages = storage.getMessages();
      res.json(messages);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.messages.create.path, (req, res) => {
    try {
      const input = messageSchema.parse(req.body);
      const created = storage.createMessage(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.messages.update.path, (req, res) => {
    try {
      const id = Number(req.params.id);
      const updated = storage.updateMessage(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Message not found" });
      }
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.messages.delete.path, (req, res) => {
    try {
      const id = Number(req.params.id);
      storage.deleteMessage(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.globalMessage.get.path, (req, res) => {
    try {
      let gm = storage.getGlobalMessage();
      if (!gm) {
        gm = storage.updateGlobalMessage({
          message: "hello world this message is for everyone",
          status: "INACTIVE",
        });
      }
      res.json(gm);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.globalMessage.update.path, (req, res) => {
    try {
      const input = globalMessageSchema.parse(req.body);
      const updated = storage.updateGlobalMessage(input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.vpnServers.list.path, (req, res) => {
    try {
      const servers = storage.getVpnServers();
      res.json(servers);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.vpnServers.create.path, (req, res) => {
    try {
      const input = vpnServerSchema.parse(req.body);
      const created = storage.createVpnServer(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.vpnServers.update.path, (req, res) => {
    try {
      const id = Number(req.params.id);
      const updated = storage.updateVpnServer(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "VPN Server not found" });
      }
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.vpnServers.delete.path, (req, res) => {
    try {
      const id = Number(req.params.id);
      storage.deleteVpnServer(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.connectedUsers.list.path, (req, res) => {
    try {
      const users = storage.getConnectedUsers();
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.connectedUsers.stats.path, (req, res) => {
    try {
      const total = storage.getTotalUsersCount();
      const online = storage.getOnlineUsersCount();
      res.json({ total, online });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.connectedUsers.delete.path, (req, res) => {
    try {
      const id = Number(req.params.id);
      storage.deleteConnectedUser(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.logs.list.path, (req, res) => {
    try {
      const logs = storage.getAccessLogs();
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/ApiIPTV.php", (req, res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.removeHeader('ETag');
    
    const tag = req.query.tag as string;
    const userId = req.query.userid as string;
    const ipAddress =
      (req.headers['x-forwarded-for']?.toString().split(',')[0].trim()) ||
      req.ip ||
      req.socket.remoteAddress ||
      '';

    try {
      const settings = storage.getSettings();
      if (!settings) {
        return res.status(500).json({ error: "Settings not found" });
      }

      storage.createAccessLog({
        userId,
        action: tag,
        ipAddress,
        userAgent: req.headers['user-agent'],
      });

      if (tag === "conn" || tag === "msg_conf") {
        return res.json({ tag, success: "1", api_ver: "1.0v" });
      }

      if (tag === "whatsup") {
        return res.json({ tag: "whatsup", success: "0", api_ver: "1.0v", whatsup: "no" });
      }

      if (tag === "gfilter") {
        return res.json({ tag: "gfilter_n", success: "1", api_ver: "1.0v", status: "No", filter: [] });
      }

      if (tag === "msg" || tag === "msg_cat_view") {
        if (userId) {
          const message = storage.getMessageByUserId(userId);
          if (message) {
            return res.json({
              tag,
              success: "1",
              api_ver: "1.0v",
              status: message.status,
              msgid: String(message.id),
              message: message.message,
            });
          }
        }
        return res.json({ tag, success: "0", api_ver: "1.0v", message: "No Messages" });
      }

      if (tag === "man" || tag === "ann") {
        const announcement = storage.getAnnouncement();
        const gm = storage.getGlobalMessage();
        return res.json({
          tag: "connv2",
          success: announcement?.status === "ACTIVE" ? "1" : "0",
          api_ver: "1.0v",
          message: gm?.message || "",
          msgid: "0",
          msg_status: gm?.status || "INACTIVE",
          msg_expire: "",
          announcement: announcement?.announcement || "",
          ann_status: announcement?.status || "INACTIVE",
          ann_expire: announcement?.expiration || "",
          ann_interval: String(announcement?.displayTime || 1),
          ann_disappear: String(announcement?.disappearTime || 1),
        });
      }

      if (tag === "connv2") {
        const online = req.query.online as string;
        if (userId) {
          storage.upsertConnectedUser({
            userId,
            username: userId,
            ipAddress,
            online,
            appid: req.query.appid as string,
            version: req.query.version as string,
            device_type: req.query.device_type as string,
            p: req.query.p as string,
            an: req.query.an as string,
            customerid: req.query.customerid as string,
            did: req.query.did as string,
          });
        }

        const announcement = storage.getAnnouncement();
        const gm = storage.getGlobalMessage();
        
        // Check for user-specific message first
        let userMessage = null;
        if (userId) {
          userMessage = storage.getMessageByUserId(userId);
        }

        // Use user-specific message if exists and active, otherwise use global message
        const msgToShow = userMessage && userMessage.status === "ACTIVE" ? userMessage : null;
        const gmToShow = gm?.status === "ACTIVE" ? gm : null;

        return res.json({
          tag: "connv2",
          success: "1",
          api_ver: "1.0v",
          message: msgToShow?.message || gmToShow?.message || "",
          msgid: msgToShow ? String(msgToShow.id) : "0",
          msg_status: msgToShow ? msgToShow.status : (gmToShow?.status || "INACTIVE"),
          msg_expire: msgToShow?.expiration || "",
          announcement: announcement?.announcement || "",
          ann_status: announcement?.status || "INACTIVE",
          ann_expire: announcement?.expiration || "",
          ann_interval: String(announcement?.displayTime || 1),
          ann_disappear: String(announcement?.disappearTime || 1),
        });
      }

      const customerId = req.query.customerid as string || req.query.cid as string || settings.customerId;
      const appName = req.query.an as string || settings.appName;

      if (tag === "vpnconfigV2") {
        const vpnServers = storage.getVpnServers();
        const vpnconfigs = vpnServers
          .filter(v => v.ovpnUrl)
          .map(v => ({
            id: String(v.id),
            userid: customerId,
            vpn_appid: req.query.appid as string || "",
            vpn_country: v.vpnCountry || v.country,
            vpn_state: v.state || "",
            vpn_config: v.ovpnUrl || "",
            vpn_status: v.status || "ACTIVE",
            auth_type: v.authType || "Username and Password required",
            auth_embedded: v.authEmbedded || "NO",
            username: v.username || "",
            password: v.password || "",
            date: v.createdAt ? new Date(v.createdAt).toISOString() : "",
          }));
        
        const output = JSON.stringify({
          tag: "vpnconfigV2",
          success: "1",
          api_ver: "1.0v",
          vpnconfigs,
        });

        return res.send(encryptAES(output));
      }

      if (tag === "licV3" || tag === "licV4") {
        const interfaceToggles = (settings.interfaceToggles || defaultInterfaceToggles) as Record<string, string>;
        const key2 = appName + customerId;

        const getToggle = (feature: string, portal: number) => {
          return interfaceToggles[`${feature}_portal${portal}`] === "On" ? "Yes" : "No";
        };
        
        const getToggleLower = (feature: string, portal: number) => {
          return interfaceToggles[`${feature}_portal${portal}`] === "On" ? "yes" : "no";
        };

        const appData = " " + JSON.stringify({
          id: "10",
          appname: settings.appName,
          expire: null,
          login_type: settings.loginType,
          version_code: settings.versionCode,
          filter_status: "No",
          epg_mode: settings.epgUrl !== "No" ? "yes" : "no",
          apkautoupdate: settings.apkAutoUpdate || "yes",
          show_expire: settings.showSubExpiry === "Enabled" ? "yes" : "no",
        });

        const portalData = " " + JSON.stringify({
          panel: "xtreamcodes",
          portal: settings.portal1Url || "0",
          portal2: settings.portal2Url || "0",
          portal3: settings.portal3Url || "0",
          portal4: settings.portal4Url || "0",
          portal5: settings.portal5Url || "0",
          portal_name: settings.portal1Name || "0",
          portal2_name: settings.portal2Name || "0",
          portal3_name: settings.portal3Name || "0",
          portal4_name: settings.portal4Name || "0",
          portal5_name: settings.portal5Name || "0",
          portal_vod: settings.portalVod || "0",
          portal_series: settings.portalSeries || "0",
        });

        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['host'] || '';
        const hostname = host.split(':')[0] || 'localhost';
        const baseUrl = `${protocol}://${host}`;

        // Generate Socket.IO URL (without port)
        const socketUrl = `${protocol}://${hostname}`;

        // Generate MQTT URL for apps that use MQTT
        const mqttPort = process.env.MQTT_PORT || '1883';
        const mqttUrl = `tcp://${hostname}:${mqttPort}`;

        const urlsData = " " + JSON.stringify({
          apkurl: settings.apkUrl || "",
          backupurl: `${baseUrl}/api/`,
          logurl: `${baseUrl}/api/`,
          activation_url: "",
          socket_url: socketUrl,  // HTTP URL for Socket.IO
          mqtt_url: mqttUrl,      // TCP URL for MQTT
          epg_url: settings.epgUrl || "no",
          ovpn_url: settings.ovpnConfigUrl || "no",
        });

        let buttonData = " " + JSON.stringify({
          btn_live: getToggle("live", 1),
          btn_live2: getToggle("live", 2),
          btn_live3: getToggle("live", 3),
          btn_live4: getToggle("live", 4),
          btn_live5: getToggle("live", 5),
          btn_vod: getToggle("vod", 1),
          btn_vod2: getToggle("vod", 2),
          btn_vod3: getToggle("vod", 3),
          btn_vod4: getToggle("vod", 4),
          btn_vod5: getToggle("vod", 5),
          btn_epg: getToggle("epg", 1),
          btn_epg2: getToggle("epg", 2),
          btn_epg3: getToggle("epg", 3),
          btn_epg4: getToggle("epg", 4),
          btn_epg5: getToggle("epg", 5),
          btn_series: getToggle("series", 1),
          btn_series2: getToggle("series", 2),
          btn_series3: getToggle("series", 3),
          btn_series4: getToggle("series", 4),
          btn_series5: getToggle("series", 5),
          btn_radio: getToggle("radio", 1),
          btn_radio2: getToggle("radio", 2),
          btn_radio3: getToggle("radio", 3),
          btn_radio4: getToggle("radio", 4),
          btn_radio5: getToggle("radio", 5),
          btn_catchup: getToggle("catchup", 1),
          btn_catchup2: getToggle("catchup", 2),
          btn_catchup3: getToggle("catchup", 3),
          btn_catchup4: getToggle("catchup", 4),
          btn_catchup5: getToggle("catchup", 5),
          btn_account: settings.showAccount === "Enabled" ? "yes" : "no",
          btn_account2: settings.showAccount === "Enabled" ? "yes" : "no",
          btn_account3: settings.showAccount === "Enabled" ? "yes" : "no",
          btn_pr: settings.showReminders === "Enabled" ? "yes" : "no",
          btn_rec: settings.showRecord === "Enabled" ? "yes" : "no",
          btn_vpn: settings.showVpn === "Enabled" ? "yes" : "no",
          btn_noti: settings.showMessage === "Enabled" ? "yes" : "no",
          btn_update: settings.showUpdate === "Enabled" ? "yes" : "no",
          btn_login_settings: settings.loginSettingsButton === "Enabled" ? "yes" : "no",
          btn_login_account: settings.loginAccountsButton === "Enabled" ? "yes" : "no",
          btn_fav: settings.showFavorites === "Enabled" ? "yes" : "no",
          btn_fav2: settings.showFavorites === "Enabled" ? "yes" : "no",
          btn_fav3: settings.showFavorites === "Enabled" ? "yes" : "no",
          btn_signup: settings.signupButton === "Enabled" ? "yes" : "no",
          signup_url: settings.signupUrl || "",
          ms: settings.showMultiscreen === "Enabled" ? "yes" : "no",
          ms2: settings.showMultiscreen === "Enabled" ? "yes" : "no",
          ms3: settings.showMultiscreen === "Enabled" ? "yes" : "no",
        });

        // Disable buttons if beta=1 parameter is present
        if (req.query.beta === '1') {
          const buttonObj = JSON.parse(buttonData.trim());
          buttonObj.btn_live = 'No';
          buttonObj.btn_vod = 'No';
          buttonObj.btn_epg = 'No';
          buttonObj.btn_series = 'No';
          buttonData = " " + JSON.stringify(buttonObj);
        }

        const settingsData = " " + JSON.stringify({
          agent: settings.userAgent || "XCIPTV",
          all_cat: "yes",
          message_enabled: settings.messagesEnabled === "Enabled" ? "yes" : "no",
          announcement_enabled: settings.announcementsEnabled === "Enabled" ? "yes" : "no",
          updateuserinfo_enabled: settings.updateUserInfo === "Enabled" ? "yes" : "no",
          whatsupcheck_enabled: "no",
          login_logo: settings.showLoginLogo === "Enabled" ? "yes" : "no",
          bjob: settings.showAppLogo === "Enabled" ? "yes" : "no",
          settings_app: settings.settingsAppIcon === "Enabled" ? "yes" : "no",
          settings_account: settings.settingsAccountIcon === "Enabled" ? "yes" : "no",
          logs: "no",
          app_language: settings.appLanguage || "Italian",
          load_last_channel: settings.loadLastChannel === "Enabled" ? "yes" : "no",
          admob_banner_id: "",
          admob_interstitial_id: "",
          show_cat_count: settings.showCategoryCount === "Enabled" ? "yes" : "no",
          send_udid: settings.sendUdid === "Enabled" ? "yes" : "no",
          theme: settings.theme || "Theme 2",
          vpn_login_view: settings.hideAutoConnVpn === "Enabled" ? "no" : "yes",
          hide_other_login_type: settings.hideOtherLoginType === "Enabled" ? "yes" : "no",
          max_epg_file_size: settings.maxEpgFileSize || "50",
        });

        const playerMap: Record<string, string> = {
          "EXO": "EXO",
          "VLC": "VLC",
        };

        return res.json({
          success: "1",
          status: "ACTIVE",
          cid: customerId,
          which: tag,
          app: encode(appData, key2 + "app"),
          portal: encode(portalData, key2 + "portal"),
          urls: encode(urlsData, key2 + "urls"),
          support: {
            support_email: settings.supportEmail || "",
            support_phone: settings.supportPhone || "",
          },
          button: encode(buttonData, key2 + "buttons"),
          settings: encode(settingsData, key2 + "sett"),
          admobconfig: {
            admob_enabled: "no",
          },
          prebid: {
            prebid_enabled: "no",
            Host: "",
            AdUnitId: "",
            AccountId: "",
            Banner: "",
          },
          vastconfig: {
            vast_enabled: settings.vastEnabled || "no",
            mid_roll_interval: settings.midRollInterval || "",
            post_roll_start_at: settings.postRollStartAt || "",
            vod_mid_roll_interval: settings.vodMidRollInterval || "",
            vod_pre_roll_url: settings.vodPreRollUrl || "",
            vod_mid_roll_url: settings.vodMidRollUrl || "",
            vod_post_roll_url: settings.vodPostRollUrl || "",
            series_mid_roll_interval: settings.seriesMidRollInterval || "",
            series_pre_roll_url: settings.seriesPreRollUrl || "",
            series_mid_roll_url: settings.seriesMidRollUrl || "",
            series_post_roll_url: settings.seriesPostRollUrl || "",
          },
          freestar: settings.freestar || "no",
          players: {
            player: settings.defaultPlayer || "EXO",
            player_tv: settings.playerTv || "EXO",
            player_vod: settings.playerVod || "EXO",
            player_series: settings.playerSeries || "EXO",
            player_catchup: settings.playerCatchup || "VLC",
            stream_type: settings.streamFormat === "m3u8" ? "m3u8" : "ts",
          },
          ort_settings: {
            vlc_hw: settings.vlcHw || "yes",
            last_volume_vlc: settings.lastVolumeVlc || "100",
            plyer_vlc_buffer: settings.playerVlcBuffer || "5000",
            video_resize_vlc: settings.videoResizeVlc || "0",
            video_subtiltes_vlc: settings.videoSubtitlesVlc || "yes",
            exo_hw: settings.exoHw || "yes",
            last_volume_exo: settings.lastVolumeExo || "100",
            plyer_exo_buffer: settings.playerExoBuffer || "50000",
            video_resize_exo: settings.videoResizeExo || "0",
            video_subtiltes_exo: settings.videoSubtitlesExo || "no",
          },
          maintenance: {
            mnt_message: settings.maintenanceMessage || "Maintenance Message",
            mnt_status: settings.maintenanceMode === "ACTIVE" ? "ACTIVE" : "INACTIVE",
            mnt_expire: (settings as any).maintenanceExpire || "2025-12-31 23:59:00",
          },
        });
      }

      if (tag === "ovpn") {
        const vpnServers = storage.getVpnServers();
        return res.json({
          tag: "ovpn",
          success: "1",
          api_ver: "1.0v",
          ovpn: vpnServers.filter(s => s.status === "ACTIVE").map(s => ({
            id: String(s.id),
            country: s.country,
            state: s.state,
            ovpn_url: s.ovpnUrl,
            auth_type: s.authType,
            username: s.username,
            password: s.password,
            status: s.status,
            auth_embedded: s.authEmbedded,
          })),
        });
      }

      if (tag === "checkupdate") {
        return res.json({
          tag: "checkupdate",
          success: "1",
          api_ver: "1.0v",
          version_code: settings.versionCode || "2001",
          apkurl: settings.apkUrl || "",
        });
      }

      // man or ann - return connv2 style response
      if (tag === "man" || tag === "ann") {
        const announcement = storage.getAnnouncement();
        const gm = storage.getGlobalMessage();
        
        let userMessage = null;
        if (userId) {
          userMessage = storage.getMessageByUserId(userId);
        }
        
        const msgToShow = userMessage && userMessage.status === "ACTIVE" ? userMessage : null;
        const gmToShow = gm?.status === "ACTIVE" ? gm : null;

        return res.json({
          tag: "connv2",
          success: "1",
          api_ver: "1.0v",
          message: msgToShow?.message || gmToShow?.message || "",
          msgid: msgToShow ? String(msgToShow.id) : "0",
          msg_status: msgToShow ? msgToShow.status : (gmToShow?.status || "INACTIVE"),
          msg_expire: msgToShow?.expiration || "",
          announcement: announcement?.announcement || "",
          ann_status: announcement?.status || "INACTIVE",
          ann_expire: announcement?.expiration || "",
          ann_interval: String(announcement?.displayTime || 1),
          ann_disappear: String(announcement?.disappearTime || 1),
        });
      }

      return res.json({ success: "0", message: "Unknown tag", tag });
    } catch (err) {
      console.error("ApiIPTV error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Server-side TheSportsDB events cache (30 min TTL)
  let eventsCache: { data: any[]; ts: number; key: string } | null = null;
  const EVENTS_CACHE_TTL = 1800000; // 30 min

  async function fetchSportsdbEvents(apiKey: string, leagueIds: number[]): Promise<any[]> {
    const cacheKey = apiKey + ':' + leagueIds.join(',');
    if (eventsCache && eventsCache.key === cacheKey && Date.now() - eventsCache.ts < EVENTS_CACHE_TTL) {
      return eventsCache.data;
    }

    const now = new Date();
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }

    const leagueSet = new Set(leagueIds.map(String));
    const allEvents: any[] = [];
    const seen = new Set<string>();

    const results = await Promise.allSettled(
      days.map(day =>
        fetch(`https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(apiKey)}/eventsday.php?d=${day}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => data?.events || [])
      )
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        for (const e of r.value) {
          if (leagueSet.has(String(e.idLeague)) && !seen.has(e.idEvent)) {
            seen.add(e.idEvent);
            allEvents.push(e);
          }
        }
      }
    }

    eventsCache = { data: allEvents, ts: Date.now(), key: cacheKey };
    return allEvents;
  }

  app.get("/api/sport.php", async (req, res) => {
    try {
      const settings = storage.getSettings();
      const widgetSource = settings?.widgetSource || 'futbolenlatv';

      if (widgetSource === 'thesportsdb') {
        const apiKey = settings?.widgetApiKey || '123';
        const tvMapJson = settings?.widgetTvMap || '{}';
        const widgetLang = settings?.widgetLanguage || 'it-IT';
        const widgetTz = settings?.widgetTimezone || 'Europe/Rome';
        const widgetTimeFormat = settings?.widgetTimeFormat || '24h';

        let selectedLeagueIds: number[] = [];
        const leaguesRaw = settings?.widgetSportsdbLeagues;
        if (leaguesRaw) {
          try {
            const parsed = JSON.parse(leaguesRaw);
            if (Array.isArray(parsed)) selectedLeagueIds = parsed;
          } catch {}
        }

        // Fetch events server-side (cached 30 min)
        const cachedEvents = await fetchSportsdbEvents(apiKey, selectedLeagueIds);

        res.setHeader("Content-Type", "text/html");
        res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
*{box-sizing:border-box}
:root{--neon:#00f2ff;--glass:rgba(255,255,255,.05);--purple:#a0f;--tv-gold:#ffd700}
body{margin:0;background:#000;color:#fff;font-family:'Segoe UI',sans-serif;scroll-behavior:smooth}
.date-group{scroll-margin-top:140px}
.header-nav{position:sticky;top:0;background:rgba(17,17,17,.95);backdrop-filter:blur(10px);z-index:100;border-bottom:1px solid var(--neon)}
.nav-row{display:flex;overflow-x:auto;padding:10px;gap:8px;scrollbar-width:none}
.nav-row::-webkit-scrollbar{display:none}
.nav-item{background:#222;padding:8px 12px;border-radius:5px;text-decoration:none;color:#fff;font-size:11px;white-space:nowrap;border:1px solid #444;text-transform:uppercase;font-weight:bold;cursor:pointer}
.active-filter{border-color:var(--neon);color:var(--neon);background:rgba(0,242,255,.1)}
.league-item{border-color:var(--purple);color:var(--purple)}
.container{padding:20px;max-width:1200px;margin:0 auto}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;margin-bottom:40px}
.card{background:var(--glass);padding:20px;border-radius:20px;border:1px solid #333;text-align:center;transition:border-color .2s}
.card:hover{border-color:var(--neon)}
.hidden-match{display:none!important}
.day-header{border-left:4px solid var(--neon);padding-left:15px;margin:40px 0 20px;text-transform:uppercase;font-weight:900;color:var(--neon)}
.time-box{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}
.time{color:var(--neon);font-size:18px;font-weight:800}
.tv-station{font-size:10px;color:var(--tv-gold);border:1px solid var(--tv-gold);padding:2px 8px;border-radius:4px;font-weight:900;background:rgba(255,215,0,.1)}
.badge{width:60px;height:60px;object-fit:contain;transition:opacity .3s}
.badge[src=""]{display:none}
.team{flex:1;text-align:center}
.name{font-size:12px;font-weight:bold;text-transform:uppercase;height:30px;display:flex;align-items:center;justify-content:center}
.vs{opacity:.3;font-weight:900;padding:0 5px}
.league-footer{font-size:10px;margin-top:15px;color:#666;border-top:1px solid rgba(255,255,255,.1);padding-top:10px}
.loading{text-align:center;padding:60px 20px;color:var(--neon);font-size:16px}
.spinner{display:inline-block;width:30px;height:30px;border:3px solid #333;border-top-color:var(--neon);border-radius:50%;animation:spin .8s linear infinite;margin-bottom:15px}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="header-nav">
  <div class="nav-row" id="dateNav"><a onclick="currentDateFilter=null;currentLeagueFilter='all';document.querySelectorAll('.nav-item').forEach(function(b){b.classList.remove('active-filter')});this.classList.add('active-filter');applyFilters()" class="nav-item active-filter">ALL MATCHES</a></div>
  <div class="nav-row" id="leagueNav" style="padding-top:0"></div>
</div>
<div class="container" id="container">
  <div class="loading"><div class="spinner"></div><br>Loading matches...</div>
</div>
<script>
(function(){
  var LANG=${JSON.stringify(widgetLang)},TZ=${JSON.stringify(widgetTz)},TIME_FORMAT=${JSON.stringify(widgetTimeFormat)};
  var tvMap=${tvMapJson};
  var now=new Date(),todayStr=now.toISOString().split('T')[0];

  // Events pre-fetched server-side (cached 30 min)
  var rawEvents=${JSON.stringify(cachedEvents)};
  var events=[],activeLeagues={};
  for(var i=0;i<rawEvents.length;i++){
    var e=rawEvents[i];
    e.strTVStation=tvMap[e.idLeague]||e.strTVStation||'';
    events.push(e);
    activeLeagues[e.idLeague]=e.strLeague;
  }
  events.sort(function(a,b){return new Date(a.dateEvent+'T'+a.strTime).getTime()-new Date(b.dateEvent+'T'+b.strTime).getTime()});
  render();

  function render(){
    // Date nav - only dates that have events
    var eventDates=new Set();
    events.forEach(function(e){eventDates.add(e.dateEvent)});
    var dateNav=document.getElementById('dateNav');
    for(var i=0;i<7;i++){
      var d=new Date(now);d.setDate(d.getDate()+i);
      var ds=d.toISOString().split('T')[0];
      if(!eventDates.has(ds))continue;
      var a=document.createElement('a');
      a.className='nav-item';a.setAttribute('data-datefilter',ds);
      a.textContent=ds===todayStr?'TODAY':d.toLocaleDateString(LANG,{weekday:'short',day:'numeric',timeZone:TZ}).toUpperCase();
      a.onclick=function(){filterDate(this.getAttribute('data-datefilter'),this)};
      dateNav.appendChild(a);
    }

    // League filters
    var leagueNav=document.getElementById('leagueNav');
    Object.keys(activeLeagues).forEach(function(id){
      var a=document.createElement('a');a.className='nav-item league-item';
      a.textContent=activeLeagues[id].replace(/English |Spanish |German |UEFA /g,'');
      a.onclick=function(){filterLeague(id,this)};
      leagueNav.appendChild(a);
    });

    // Cards
    var container=document.getElementById('container');
    container.innerHTML='';
    if(!events.length){container.innerHTML='<div class="loading" style="color:#666">No matches found for the next 7 days.</div>';return}
    var lastDate='',grid;
    for(var i=0;i<events.length;i++){
      var e=events[i];
      if(e.dateEvent!==lastDate){
        lastDate=e.dateEvent;
        var h=document.createElement('div');h.id='date-'+e.dateEvent;h.className='day-header date-group';
        h.textContent=new Date(e.dateEvent+'T12:00:00').toLocaleDateString(LANG,{weekday:'long',day:'numeric',month:'long',timeZone:TZ});
        container.appendChild(h);
        grid=document.createElement('div');grid.className='grid';container.appendChild(grid);
      }
      var utc=new Date(e.dateEvent+'T'+(e.strTime||'00:00:00').substring(0,8)+'Z');
      var time=utc.toLocaleTimeString(LANG,{hour:'2-digit',minute:'2-digit',hour12:TIME_FORMAT==='12h',timeZone:TZ});
      var hb=e.strHomeTeamBadge||'',ab=e.strAwayTeamBadge||'';
      var card=document.createElement('div');card.className='card match-card';card.setAttribute('data-league',e.idLeague);card.setAttribute('data-date',e.dateEvent);
      var isTeamMatch=e.strHomeTeam&&e.strAwayTeam&&e.strHomeTeam!==e.strAwayTeam;
      if(isTeamMatch){
        card.innerHTML='<div class="time-box"><span class="time">'+time+'</span>'+(e.strTVStation?'<span class="tv-station">\\ud83d\\udcfa '+e.strTVStation+'</span>':'')+'</div><div style="display:flex;justify-content:space-around;align-items:center"><div class="team"><img class="badge" data-team="'+esc(e.strHomeTeam)+'" src="'+hb+'" onerror="this.style.display=\\'none\\'"><div class="name">'+esc(e.strHomeTeam)+'</div></div><div class="vs">VS</div><div class="team"><img class="badge" data-team="'+esc(e.strAwayTeam)+'" src="'+ab+'" onerror="this.style.display=\\'none\\'"><div class="name">'+esc(e.strAwayTeam)+'</div></div></div><div class="league-footer">'+esc(e.strLeague)+'</div>';
      }else{
        var thumb=e.strThumb||e.strPoster||'';
        var thumbHtml=thumb?'<img src="'+thumb+'" style="width:100%;max-height:120px;object-fit:contain;margin-bottom:10px;border-radius:8px">':'';
        card.innerHTML='<div class="time-box"><span class="time">'+time+'</span>'+(e.strTVStation?'<span class="tv-station">\\ud83d\\udcfa '+e.strTVStation+'</span>':'')+'</div>'+thumbHtml+'<div style="font-size:16px;font-weight:900;text-transform:uppercase;margin:10px 0">'+esc(e.strEvent)+'</div>'+(e.strVenue?'<div style="font-size:11px;color:#aaa;margin-bottom:5px">\\ud83d\\udccd '+esc(e.strVenue)+'</div>':'')+(e.strCity?'<div style="font-size:10px;color:#888">'+esc(e.strCity)+(e.strCountry?', '+esc(e.strCountry):'')+'</div>':'')+'<div class="league-footer">'+esc(e.strLeague)+'</div>';
      }
      grid.appendChild(card);
    }
  }

  function esc(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

})();

var currentDateFilter=null,currentLeagueFilter='all';

function applyFilters(){
  document.querySelectorAll('.match-card').forEach(function(c){
    var matchDate=currentDateFilter===null||c.getAttribute('data-date')===currentDateFilter;
    var matchLeague=currentLeagueFilter==='all'||c.getAttribute('data-league')===currentLeagueFilter;
    c.classList.toggle('hidden-match',!(matchDate&&matchLeague));
  });
  document.querySelectorAll('.date-group').forEach(function(h){
    var g=h.nextElementSibling;if(!g)return;
    var v=g.querySelectorAll('.match-card:not(.hidden-match)').length>0;
    h.style.display=v?'':'none';g.style.display=v?'grid':'none';
  });
}

function filterDate(date,el){
  document.querySelectorAll('#dateNav .nav-item').forEach(function(b){b.classList.remove('active-filter')});
  el.classList.add('active-filter');
  currentDateFilter=date;
  applyFilters();
  var target=document.getElementById('date-'+date);
  if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
}

function filterLeague(id,el){
  document.querySelectorAll('#leagueNav .nav-item').forEach(function(b){b.classList.remove('active-filter')});
  el.classList.add('active-filter');
  currentLeagueFilter=id;
  applyFilters();
}
</script>
</body>
</html>`);
      } else {
        // Default: futbolenlatv widget
        const width = settings?.widgetWidth || '280';
        const height = settings?.widgetHeight || '500';
        const color = (settings?.widgetColor || '#005df8').replace('#', '');
        const widgetType = settings?.widgetType || 'soccer';
        const competition = settings?.widgetCompetition || '';
        const allCompetitions = settings?.widgetAllCompetitions === 'true';
        const team = settings?.widgetTeam || '';
        const allTeams = settings?.widgetAllTeams === 'true';
        const sport = settings?.widgetSport || 'futbol';
        const language = settings?.widgetLanguage || 'en-CA';

        let params = `w=${width}&h=${height}&color=${color}&culture=${language}`;

        if (widgetType === 'soccer') {
          if (!allCompetitions && competition) {
            params += `&competition=${competition}`;
          }
          if (!allTeams && team) {
            params += `&team=${team}`;
          }
        } else {
          params += `&agenda=1`;
          if (sport) {
            params += `&sport=${sport}`;
          }
        }

        const iframeWidth = parseInt(width) + 10;
        const iframeHeight = parseInt(height) + 10;

        res.setHeader("Content-Type", "text/html");
        res.send(`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, text/html, charset=utf-8">
<style>
body {
  margin: 0;
}
iframe {
  display: block;
  background: #000;
  border: none;
  height: 100vh;
  width: 100vw;
}
</style>
</head>
<body>
<iframe src="https://widgets.futbolenlatv.com/js/iframe?${params}" width="${iframeWidth}" height="${iframeHeight}" frameborder="0" scrolling="auto"></iframe>
</body>
</html>`);
      }
    } catch (err) {
      res.status(500).send("Error loading widget");
    }
  });
  
  // Proxy TheSportsDB leagues endpoint (cached 1h, fetches all sports in parallel)
  const SPORTSDB_SPORTS = [
    'Soccer', 'Basketball', 'Ice Hockey', 'American Football', 'Baseball',
    'Fighting', 'Motorsport', 'Tennis', 'Rugby', 'Cricket', 'Golf',
    'Cycling', 'Volleyball', 'Handball', 'Australian Football', 'Esports',
  ];
  // Well-known leagues guaranteed to appear (free API key returns limited results)
  const WELL_KNOWN_LEAGUES: { sport: string; id: number; name: string }[] = [
    { sport: 'Soccer', id: 4332, name: 'Italian Serie A' },
    { sport: 'Soccer', id: 4329, name: 'Italian Serie B' },
    { sport: 'Soccer', id: 4328, name: 'English Premier League' },
    { sport: 'Soccer', id: 4335, name: 'Scottish Premiership' },
    { sport: 'Soccer', id: 4337, name: 'Spanish La Liga' },
    { sport: 'Soccer', id: 4331, name: 'German Bundesliga' },
    { sport: 'Soccer', id: 4334, name: 'French Ligue 1' },
    { sport: 'Soccer', id: 4339, name: 'Dutch Eredivisie' },
    { sport: 'Soccer', id: 4344, name: 'Portuguese Primeira Liga' },
    { sport: 'Soccer', id: 4357, name: 'Turkish Super Lig' },
    { sport: 'Soccer', id: 4351, name: 'Brazilian Serie A' },
    { sport: 'Soccer', id: 4350, name: 'Mexican Liga MX' },
    { sport: 'Soccer', id: 4346, name: 'American Major League Soccer' },
    { sport: 'Soccer', id: 4480, name: 'UEFA Champions League' },
    { sport: 'Soccer', id: 4481, name: 'UEFA Europa League' },
    { sport: 'Soccer', id: 4502, name: 'UEFA Conference League' },
    { sport: 'Soccer', id: 4482, name: 'FA Cup' },
    { sport: 'Soccer', id: 4483, name: 'EFL Cup (Carabao)' },
    { sport: 'Basketball', id: 4387, name: 'NBA' },
    { sport: 'Basketball', id: 4431, name: 'EuroLeague' },
    { sport: 'Ice Hockey', id: 4380, name: 'NHL' },
    { sport: 'American Football', id: 4391, name: 'NFL' },
    { sport: 'Baseball', id: 4424, name: 'MLB' },
    { sport: 'Fighting', id: 4443, name: 'UFC' },
    { sport: 'Motorsport', id: 4370, name: 'Formula 1' },
    { sport: 'Motorsport', id: 4407, name: 'MotoGP' },
    { sport: 'Motorsport', id: 4393, name: 'NASCAR Cup Series' },
    { sport: 'Tennis', id: 4464, name: 'ATP World Tour' },
    { sport: 'Tennis', id: 4463, name: 'WTA Tour' },
    { sport: 'Rugby', id: 4401, name: 'Six Nations' },
    { sport: 'Cricket', id: 4472, name: 'IPL' },
    { sport: 'Golf', id: 4396, name: 'PGA Tour' },
  ];
  let leaguesCache: { data: any; ts: number; key: string } | null = null;
  const LEAGUES_CACHE_TTL = 3600000;

  app.get("/api/admin/sportsdb-leagues", async (req, res) => {
    try {
      const settings = storage.getSettings();
      const apiKey = settings?.widgetApiKey || '3';

      if (leaguesCache && leaguesCache.key === apiKey && Date.now() - leaguesCache.ts < LEAGUES_CACHE_TTL) {
        return res.json(leaguesCache.data);
      }

      const base = `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(apiKey)}`;

      // Fetch from both endpoints in parallel and merge (free key limits per-sport results)
      const [allLeaguesRes, ...perSportResults] = await Promise.allSettled([
        fetch(`${base}/all_leagues.php`)
          .then(r => r.ok ? r.json() : null)
          .then(data => (data?.leagues || []) as any[]),
        ...SPORTSDB_SPORTS.map(sport =>
          fetch(`${base}/search_all_leagues.php?s=${encodeURIComponent(sport)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => ({ sport, leagues: (data?.countries || []) as any[] }))
        )
      ]);

      const seen = new Set<number>();
      const grouped: Record<string, { id: number; name: string }[]> = {};

      function addLeague(sport: string, id: number, name: string) {
        if (seen.has(id) || !name) return;
        seen.add(id);
        if (!grouped[sport]) grouped[sport] = [];
        grouped[sport].push({ id, name });
      }

      // 1. Well-known leagues always present
      for (const l of WELL_KNOWN_LEAGUES) addLeague(l.sport, l.id, l.name);

      // 2. all_leagues.php returns featured/major leagues
      if (allLeaguesRes.status === 'fulfilled' && allLeaguesRes.value) {
        for (const l of allLeaguesRes.value) {
          addLeague(l.strSport || '', Number(l.idLeague), l.strLeague || '');
        }
      }

      // 3. search_all_leagues per sport adds more leagues
      for (const r of perSportResults) {
        if (r.status !== 'fulfilled' || !r.value.leagues.length) continue;
        for (const l of r.value.leagues) {
          addLeague(r.value.sport, Number(l.idLeague), l.strLeague || '');
        }
      }

      for (const sport of Object.keys(grouped)) {
        grouped[sport].sort((a, b) => a.name.localeCompare(b.name));
      }

      const result = { grouped };
      leaguesCache = { data: result, ts: Date.now(), key: apiKey };
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/widget-settings", (req, res) => {
    try {
      const settings = storage.getSettings();
      res.json({
        widgetWidth: settings?.widgetWidth || '280',
        widgetHeight: settings?.widgetHeight || '500',
        widgetColor: settings?.widgetColor || '#005df8',
        widgetType: settings?.widgetType || 'soccer',
        widgetCompetition: settings?.widgetCompetition || '',
        widgetAllCompetitions: settings?.widgetAllCompetitions || 'true',
        widgetTeam: settings?.widgetTeam || '',
        widgetAllTeams: settings?.widgetAllTeams || 'true',
        widgetSport: settings?.widgetSport || 'futbol',
        widgetLanguage: settings?.widgetLanguage || 'en-CA',
        widgetSource: settings?.widgetSource || 'futbolenlatv',
        widgetApiKey: settings?.widgetApiKey || '',
        widgetSportsdbSport: settings?.widgetSportsdbSport || 'Soccer',
        widgetSportsdbLeagues: settings?.widgetSportsdbLeagues || '',
        widgetTvCountry: settings?.widgetTvCountry || 'italy',
        widgetTvMap: settings?.widgetTvMap || '',
        widgetTimezone: settings?.widgetTimezone || 'Europe/Rome',
        widgetTimeFormat: settings?.widgetTimeFormat || '24h',
      });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/widget-settings", (req, res) => {
    try {
      const {
        widgetWidth,
        widgetHeight,
        widgetColor,
        widgetType,
        widgetCompetition,
        widgetAllCompetitions,
        widgetTeam,
        widgetAllTeams,
        widgetSport,
        widgetLanguage,
        widgetSource,
        widgetApiKey,
        widgetSportsdbSport,
        widgetSportsdbLeagues,
        widgetTvCountry,
        widgetTvMap,
        widgetTimezone,
        widgetTimeFormat,
      } = req.body;

      storage.updateSettings({
        widgetWidth,
        widgetHeight,
        widgetColor,
        widgetType,
        widgetCompetition,
        widgetAllCompetitions,
        widgetTeam,
        widgetAllTeams,
        widgetSport,
        widgetLanguage,
        widgetSource,
        widgetApiKey,
        widgetSportsdbSport,
        widgetSportsdbLeagues,
        widgetTvCountry,
        widgetTvMap,
        widgetTimezone,
        widgetTimeFormat,
      });
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/update-settings", (req, res) => {
    try {
      const settings = storage.getSettings();
      res.json({
        versionCode: settings?.versionCode || "2001",
        apkAutoUpdate: settings?.apkAutoUpdate || "yes",
        apkUrl: settings?.apkUrl || "",
      });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/update-settings", (req, res) => {
    try {
      const { versionCode, apkAutoUpdate, apkUrl } = req.body;
      storage.updateSettings({
        versionCode,
        apkAutoUpdate,
        apkUrl,
      });
      res.json({ success: true });
    } catch (err) {
      console.error("Update settings error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/parental-reset", (req, res) => {
    try {
      const { masterCode } = req.body;
      if (!masterCode || typeof masterCode !== "string") {
        return res.status(400).json({ success: false, message: "Master code required" });
      }
      
      let hash = 0;
      for (let i = 0; i < masterCode.length; i++) {
        const char = masterCode.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const resetCode = String(Math.abs(hash) % 10000).padStart(4, "0");
      
      res.json({ success: true, resetCode });
    } catch (err) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  app.get("/api/admin/backdrop-settings", (req, res) => {
    try {
      const settings = storage.getSettings();
      res.json({
        backdropEnabled: settings?.backdropEnabled || 'true',
        backdropApiKey: settings?.backdropApiKey || '6b8e3eaa1a03ebb45642e9531d8a76d2',
        backdropPageCount: settings?.backdropPageCount || '15',
        backdropInterval: settings?.backdropInterval || '9000',
        backdropInitialDelay: settings?.backdropInitialDelay || '2000',
        backdropLanguage: settings?.backdropLanguage || 'en-US',
      });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/backdrop-settings", (req, res) => {
    try {
      const { backdropEnabled, backdropApiKey, backdropPageCount, backdropInterval, backdropInitialDelay, backdropLanguage } = req.body;
      storage.updateSettings({
        backdropEnabled,
        backdropApiKey,
        backdropPageCount,
        backdropInterval,
        backdropInitialDelay,
        backdropLanguage,
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/backdrop.php", (req, res) => {
    const settings = storage.getSettings();
    const enabled = settings?.backdropEnabled !== 'false';
    const apiKey = settings?.backdropApiKey || '6b8e3eaa1a03ebb45642e9531d8a76d2';
    const pageCount = settings?.backdropPageCount || '15';
    const interval = settings?.backdropInterval || '9000';
    const initialDelay = settings?.backdropInitialDelay || '2000';
    const language = settings?.backdropLanguage || 'en-US';

    if (!enabled) {
      res.setHeader("Content-Type", "text/html");
      return res.send('<!DOCTYPE html><html><head><title>Backdrop</title></head><body style="background:#000;"></body></html>');
    }

    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Full-Screen Movie Banner</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: flex-start;
            align-items: center;
            height: 100vh;
            background-color: #222;
            backdrop-filter: blur(0px); 
            background-repeat: no-repeat;
            background-size: cover; 
            position: relative;
            overflow: hidden; 
        }
        #movie-container {
            opacity: 0; 
            transition: opacity 0.2s ease-in-out; 
        }
        .movie-banner {
            display: flex;
            flex-direction: column;
            justify-content: space-between; 
            align-items: flex-start; 
            color: #fff;
            padding-left: 0; 
            position: relative;
            z-index: 2; 
            height: 100%;
        }
        #movie-poster-container {
            position: relative;
            width: auto;
            max-height: 100%; 
        }
        #movie-poster {
            width: 100%;
            height: 100%; 
            -webkit-mask-image: -webkit-gradient(linear, right top, left top, from(rgba(0,0,0,0)), to(rgba(0,0,0,1))); 
        }
        .overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to right, rgba(0, 0, 0, 1), transparent);
            z-index: 1; 
        }
        .movie-info-larger {
            position: absolute;
            top: 30%;
            left: 01%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-transform: uppercase;
            color: white;
            white-space: nowrap;
            font-size:3.3vw;
        }
        .subtitial-info{
            position: absolute;
            top: 8vw;
            right: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-transform: uppercase;
            color: white;
            font-size: 1.5vw;
        }
        .ratingbar-location{
            position: absolute;
            top: 12vw;
            right: 16px;
            font-size: 1.5vw;
        }
        .movie-info-overview {
            text-align: left;
            position: fixed;
            top: 22.8vw;
            left: 01%;
            right: 25%;
            font-size: 0.1vm;
            color: white;
        }
        .overview-location{
            top: 20.8vw;
            left: 01%;
            position: fixed;
            display: flex;
            align-items: center;
            justify-content: center;
            text-transform: uppercase;
            color: white;
            font-size: 1.5vw;
        }
    </style>
</head>
<body>
    <div class="movie-container" id="movie-container">
    <div class="overlay" id="viewport_capture">
        <div class="movie-banner">
            <div id="movie-poster-container"></div>
        </div> 
        <h1 id="movie-title" class="movie-info-larger"></h1>
        <p id="msubtitial" class="subtitial-info"></p>
        <rating-bar class="ratingbar-location" id="rating-rtx"></rating-bar>
        <h1 id="overview-title" class="overview-location"></h1>
        <h3 id="movie-overview" class="movie-info-overview"></h3>
    </div>
    </div>
    
    <script>
        const apiKey = '${apiKey}';
        const language = '${language}';
        let currentIndex = 0;
        let currentPage = 1;
        let totalPageCount = ${pageCount};
        let movieIds = [];
        let nextImage = null;

        async function fetchPopularMovieIds() {
            while (currentPage <= totalPageCount) {
                try {
                    const response = await fetch(\`https://api.themoviedb.org/3/discover/movie?api_key=\${apiKey}&language=\${language}&page=\${currentPage}&sort_by=popularity.desc\`);
                    const data = await response.json();
                    movieIds = [...movieIds, ...data.results.map(movie => movie.id)];
                    currentPage++;
                } catch (error) {
                    console.error(error);
                    break;
                }
            }
        }

        function preloadNextImage() {
            if (movieIds.length === 0) return;
            const nextIndex = (currentIndex + 1) % movieIds.length;
            const nextMovieId = movieIds[nextIndex];

            fetch(\`https://api.themoviedb.org/3/movie/\${nextMovieId}?api_key=\${apiKey}&language=\${language}\`)
                .then((response) => response.json())
                .then((data) => {
                    nextImage = new Image();
                    nextImage.src = \`https://image.tmdb.org/t/p/original\${data.backdrop_path}\`;
                })
                .catch((error) => console.error(error));
        }

        async function updateMovieInfo() {
            if (movieIds.length === 0) return;

            const movieId = movieIds[currentIndex];

            fetch(\`https://api.themoviedb.org/3/movie/\${movieId}?api_key=\${apiKey}&language=\${language}\`)
                .then((response) => response.json())
                .then((data) => {
                    const movieContainer = document.getElementById('movie-container');
                    movieContainer.style.opacity = 0;

                    setTimeout(() => {
                        preloadNextImage();
                        
                        const movieTitle = document.getElementById('movie-title');
                        const mcategory = document.getElementById('msubtitial');
                        const rtxratingbar = document.getElementById('rating-rtx');

                        const posterPath = \`https://image.tmdb.org/t/p/original\${data.backdrop_path}\`;
                        document.body.style.backgroundImage = \`url('\${posterPath}')\`;

                        const releaseDate = data.release_date;
                        const releaseYear = new Date(releaseDate).getFullYear();
                        movieTitle.innerText = data.title + \` (\${releaseYear})\`;

                        const releaseDate_full = data.release_date;
                        const genresArray = data.genres.map(genre => genre.name).join(' | ');
                        const origin_country = data.production_companies.map(pc => pc.origin_country).filter(c => c).join(' ');
                        const duration = data.runtime;
                        const hours = Math.floor(duration / 60) + 'h';
                        const minutes = duration % 60 + 'm';
                        const fullSubtitial = releaseDate_full + \` (\${origin_country}) | \${genresArray} | \${hours} \${minutes}\`;
                        mcategory.innerText = fullSubtitial;

                        const mrating = data.vote_average;
                        rtxratingbar.setAttribute("value", mrating);

                        movieContainer.style.opacity = 1;
                    }, 200);

                    currentIndex = (currentIndex + 1) % movieIds.length;
                    preloadNextImage();
                })
                .catch((error) => console.error(error));
        }

        fetchPopularMovieIds().then(() => {
            preloadNextImage();
            setTimeout(updateMovieInfo, ${initialDelay});
            setInterval(updateMovieInfo, ${interval});
        });
    </script>
</body>
</html>`);
  });

  app.get("/api/admin/intro-status", (req, res) => {
    try {
      const introPath = path.join(process.cwd(), "uploads", "intro.mp4");
      if (fs.existsSync(introPath)) {
        const stats = fs.statSync(introPath);
        res.json({
          exists: true,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
        });
      } else {
        res.json({ exists: false });
      }
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/intro", introUpload.single("video"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/intro", (req, res) => {
    try {
      const introPath = path.join(process.cwd(), "uploads", "intro.mp4");
      if (fs.existsSync(introPath)) {
        fs.unlinkSync(introPath);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== Remote Commands API ====================

  // Get available remote commands
  app.get("/api/admin/remote-commands", requireAuth, (req, res) => {
    res.json({
      commands: Object.entries(REMOTE_COMMANDS).map(([key, value]) => ({
        id: value,
        name: key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        description: getCommandDescription(value),
      })),
    });
  });

  // Get WebSocket connection stats
  app.get("/api/admin/ws-stats", requireAuth, (req, res) => {
    try {
      const stats = getWebSocketStats();
      const devices = getConnectedDevices();
      res.json({
        ...stats,
        devices: devices.map(d => ({
          username: d.username,
          customerId: d.customerId,
          ...d.deviceInfo,
          connectedAt: d.connectedAt,
          lastPing: d.lastPing,
          protocol: d.protocol,
        })),
      });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check if a user is connected via WebSocket
  app.get("/api/admin/ws-connected/:username", requireAuth, (req, res) => {
    try {
      const { username } = req.params;
      const connected = isUserConnected(username);
      res.json({ username, connected });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Send command to a single user
  app.post("/api/admin/remote-command/user", requireAuth, async (req, res) => {
    try {
      const { username, command } = req.body;

      if (!username || !command) {
        return res.status(400).json({
          success: false,
          message: "Username and command are required",
        });
      }

      // Validate command
      const validCommands = Object.values(REMOTE_COMMANDS);
      if (!validCommands.includes(command)) {
        return res.status(400).json({
          success: false,
          message: `Invalid command. Valid commands: ${validCommands.join(", ")}`,
        });
      }

      try {
        // Wait for device response (timeout 10 seconds)
        const deviceResponse = await sendCommandAndWaitForResponse(username, command, undefined, 10000);
        res.json({
          success: true,
          message: deviceResponse,
        });
      } catch (err: any) {
        res.status(404).json({
          success: false,
          message: err.message || `User "${username}" is not connected`,
        });
      }
    } catch (err) {
      console.error("Remote command error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // Send command to multiple users
  app.post("/api/admin/remote-command/users", requireAuth, (req, res) => {
    try {
      const { usernames, command } = req.body;

      if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Usernames array is required",
        });
      }

      if (!command) {
        return res.status(400).json({
          success: false,
          message: "Command is required",
        });
      }

      // Validate command
      const validCommands = Object.values(REMOTE_COMMANDS);
      if (!validCommands.includes(command)) {
        return res.status(400).json({
          success: false,
          message: `Invalid command. Valid commands: ${validCommands.join(", ")}`,
        });
      }

      const result = sendCommandToUsers(usernames, command);

      res.json({
        success: true,
        message: `Command "${command}" sent to ${result.sent.length} users`,
        sent: result.sent,
        failed: result.failed,
      });
    } catch (err) {
      console.error("Remote command error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // Send command to all connected users
  app.post("/api/admin/remote-command/broadcast", requireAuth, (req, res) => {
    try {
      const { command } = req.body;

      if (!command) {
        return res.status(400).json({
          success: false,
          message: "Command is required",
        });
      }

      // Validate command
      const validCommands = Object.values(REMOTE_COMMANDS);
      if (!validCommands.includes(command)) {
        return res.status(400).json({
          success: false,
          message: `Invalid command. Valid commands: ${validCommands.join(", ")}`,
        });
      }

      const count = sendCommandToAll(command);

      res.json({
        success: true,
        message: `Command "${command}" broadcast to ${count} connected devices`,
        count,
      });
    } catch (err) {
      console.error("Remote command error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // ==================== MQTT Messages API ====================

  // Send message to a single user via MQTT
  app.post("/api/admin/mqtt-message/user", requireAuth, (req, res) => {
    try {
      const { username, message } = req.body;

      if (!username || !message) {
        return res.status(400).json({
          success: false,
          message: "Username and message are required",
        });
      }

      const sent = sendMessageToUser(username, message);

      if (sent) {
        res.json({
          success: true,
          message: `Message sent to ${username}`,
        });
      } else {
        res.status(404).json({
          success: false,
          message: `User "${username}" is not connected via MQTT`,
        });
      }
    } catch (err) {
      console.error("MQTT message error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // Send message to multiple users via MQTT
  app.post("/api/admin/mqtt-message/users", requireAuth, (req, res) => {
    try {
      const { usernames, message } = req.body;

      if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Usernames array is required",
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          message: "Message is required",
        });
      }

      const result = sendMessageToUsers(usernames, message);

      res.json({
        success: true,
        message: `Message sent to ${result.sent.length} users`,
        sent: result.sent,
        failed: result.failed,
      });
    } catch (err) {
      console.error("MQTT message error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // Broadcast message to all connected devices via MQTT
  app.post("/api/admin/mqtt-message/broadcast", requireAuth, (req, res) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: "Message is required",
        });
      }

      const count = sendMessageToAll(message);

      res.json({
        success: true,
        message: `Message broadcast to ${count} connected devices`,
        count,
      });
    } catch (err) {
      console.error("MQTT message error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // Send announcement to a single user via MQTT
  app.post("/api/admin/mqtt-announcement/user", requireAuth, (req, res) => {
    try {
      const { username, message, status, expiration, displayInterval, disappearAfter } = req.body;

      if (!username || !message) {
        return res.status(400).json({
          success: false,
          message: "Username and message are required",
        });
      }

      // Validate displayInterval
      const validIntervals = [2, 5, 10, 15, 20, 30, 60];
      if (displayInterval && !validIntervals.includes(Number(displayInterval))) {
        return res.status(400).json({
          success: false,
          message: `Invalid displayInterval. Valid values: ${validIntervals.join(", ")}`,
        });
      }

      // Validate disappearAfter
      const validDisappear = [1, 2, 3, 4, 5, 10];
      if (disappearAfter && !validDisappear.includes(Number(disappearAfter))) {
        return res.status(400).json({
          success: false,
          message: `Invalid disappearAfter. Valid values: ${validDisappear.join(", ")}`,
        });
      }

      const params: AnnouncementParams = {
        message,
        status: status || "ACTIVE",
        expiration,
        displayInterval: displayInterval ? Number(displayInterval) : undefined,
        disappearAfter: disappearAfter ? Number(disappearAfter) : undefined,
      };

      const sent = sendAnnouncementToUser(username, params);

      if (sent) {
        res.json({
          success: true,
          message: `Announcement sent to ${username}`,
        });
      } else {
        res.status(404).json({
          success: false,
          message: `User "${username}" is not connected via MQTT`,
        });
      }
    } catch (err) {
      console.error("MQTT announcement error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  return httpServer;
}

// Helper function for command descriptions
function getCommandDescription(command: string): string {
  switch (command) {
    case "reset_players_settings":
      return "Reset all player settings to default values";
    case "reset_parental_password":
      return "Reset parental control PIN to 0000";
    case "delete_cache":
      return "Clear application cache";
    case "get_info_dm":
      return "Request device information";
    default:
      return "Unknown command";
  }
}
