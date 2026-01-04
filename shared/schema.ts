import { pgTable, text, serial, jsonb, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === Settings Table (main.json) ===
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  
  // Application Info
  appName: text("app_name").notNull().default("AltaIPTV"),
  customerId: text("customer_id").notNull().default("2001"),
  versionCode: text("version_code").notNull().default("2001"),
  loginType: text("login_type").notNull().default("login"),
  
  // Developer Info
  developerName: text("developer_name").default(""),
  developerContact: text("developer_contact").default(""),
  supportEmail: text("support_email").default(""),
  supportPhone: text("support_phone").default(""),
  
  // Portal URLs (1-5)
  portal1Name: text("portal1_name").default("MultififaIPTV"),
  portal1Url: text("portal1_url").default("http://example.com:8080"),
  portal2Name: text("portal2_name").default(""),
  portal2Url: text("portal2_url").default(""),
  portal3Name: text("portal3_name").default(""),
  portal3Url: text("portal3_url").default(""),
  portal4Name: text("portal4_name").default(""),
  portal4Url: text("portal4_url").default(""),
  portal5Name: text("portal5_name").default(""),
  portal5Url: text("portal5_url").default(""),
  
  // Other URLs
  apkUrl: text("apk_url").default(""),
  backupUrl: text("backup_url").default(""),
  epgUrl: text("epg_url").default("No"),
  ovpnConfigUrl: text("ovpn_config_url").default("No"),
  
  // App Options
  userAgent: text("user_agent").default("XCIPTV"),
  streamFormat: text("stream_format").default("ts"),
  loadLastChannel: text("load_last_channel").default("Disabled"),
  showLoginLogo: text("show_login_logo").default("Enabled"),
  showAppLogo: text("show_app_logo").default("Enabled"),
  showCategoryCount: text("show_category_count").default("Enabled"),
  
  // Feature Toggles (single values)
  loginAccountsButton: text("login_accounts_button").default("Enabled"),
  loginSettingsButton: text("login_settings_button").default("Enabled"),
  signupButton: text("signup_button").default("Disabled"),
  signupUrl: text("signup_url").default(""),
  announcementsEnabled: text("announcements_enabled").default("Enabled"),
  messagesEnabled: text("messages_enabled").default("Enabled"),
  updateUserInfo: text("update_user_info").default("Enabled"),
  
  // Interface Settings - Per Portal toggles (stored as JSON)
  // Each key like "live_portal1": "On", "live_portal2": "Off", etc.
  interfaceToggles: jsonb("interface_toggles").$type<Record<string, string>>().notNull().default({}),
  
  // Extra Interface Options
  showReminders: text("show_reminders").default("Disabled"),
  showRecord: text("show_record").default("Disabled"),
  showVpn: text("show_vpn").default("Enabled"),
  showMessage: text("show_message").default("Enabled"),
  showUpdate: text("show_update").default("Enabled"),
  showSubExpiry: text("show_sub_expiry").default("Disabled"),
  
  // Theme
  theme: text("theme").default("3"),
  
  // Language
  appLanguage: text("app_language").default("Italian"),
  userLanguage: text("user_language").default("Italian"),
  
  // Players
  playerLive: text("player_live").default("EXO"),
  playerEpg: text("player_epg").default("EXO"),
  playerVod: text("player_vod").default("EXO"),
  playerSeries: text("player_series").default("EXO"),
  playerCatchup: text("player_catchup").default("VLC"),
  
  // Maintenance
  maintenanceMessage: text("maintenance_message").default("Maintenance in progress..."),
  maintenanceStatus: text("maintenance_status").default("INACTIVE"),
  maintenanceExpire: text("maintenance_expire").default("2025-12-31 23:59:00"),
  
  // Remote Update
  remoteUpdateEnabled: text("remote_update_enabled").default("yes"),
  
  // Ads (JSON)
  adsConfig: jsonb("ads_config").$type<Record<string, any>>().default({}),
  
  // Parental PIN
  parentalPinEnabled: text("parental_pin_enabled").default("no"),
  
  // VAST Ads Settings
  vastEnabled: text("vast_enabled").default("no"),
  midRollInterval: text("mid_roll_interval").default(""),
  postRollStartAt: text("post_roll_start_at").default(""),
  vodMidRollInterval: text("vod_mid_roll_interval").default(""),
  vodPreRollUrl: text("vod_pre_roll_url").default(""),
  vodMidRollUrl: text("vod_mid_roll_url").default(""),
  vodPostRollUrl: text("vod_post_roll_url").default(""),
  seriesMidRollInterval: text("series_mid_roll_interval").default(""),
  seriesPreRollUrl: text("series_pre_roll_url").default(""),
  seriesMidRollUrl: text("series_mid_roll_url").default(""),
  seriesPostRollUrl: text("series_post_roll_url").default(""),
  freestar: text("freestar").default("no"),
  
  // Player Selection
  defaultPlayer: text("default_player").default("EXO"),
  playerTv: text("player_tv").default("EXO"),
  streamType: text("stream_type").default("MPEGTS (ts)"),
  
  // VLC Player Settings (ort_settings)
  vlcHw: text("vlc_hw").default("yes"),
  lastVolumeVlc: text("last_volume_vlc").default("100"),
  playerVlcBuffer: text("player_vlc_buffer").default("5000"),
  videoResizeVlc: text("video_resize_vlc").default("0"),
  videoSubtitlesVlc: text("video_subtitles_vlc").default("yes"),
  
  // EXO Player Settings (ort_settings)
  exoHw: text("exo_hw").default("yes"),
  lastVolumeExo: text("last_volume_exo").default("100"),
  playerExoBuffer: text("player_exo_buffer").default("50000"),
  videoResizeExo: text("video_resize_exo").default("0"),
  videoSubtitlesExo: text("video_subtitles_exo").default("no"),
  
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === Announcements Table (global announcements) ===
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  status: text("status").default("INACTIVE"), // ACTIVE / INACTIVE
  expire: text("expire").notNull(),
  displayFor: integer("display_for").default(1), // minutes
  disappearAfter: integer("disappear_after").default(1), // minutes
  createdAt: timestamp("created_at").defaultNow(),
});

// === Messages Table (per-user messages) ===
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  message: text("message").notNull(),
  status: text("status").default("ACTIVE"),
  expire: text("expire").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === Global Message (message to everyone) ===
export const globalMessage = pgTable("global_message", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  status: text("status").default("INACTIVE"),
  expire: text("expire").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === VPN Servers ===
export const vpnServers = pgTable("vpn_servers", {
  id: serial("id").primaryKey(),
  country: text("country").notNull(),
  state: text("state").notNull(),
  ovpnUrl: text("ovpn_url").notNull(),
  status: text("status").default("ACTIVE"),
  authType: text("auth_type").default("Username and Password required"),
  authEmbedded: text("auth_embedded").default("NO"),
  username: text("username").default(""),
  password: text("password").default(""),
  vpnCountry: text("vpn_country").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

// === Connected Users (replaces user_logs.db) ===
export const connectedUsers = pgTable("connected_users", {
  id: serial("id").primaryKey(),
  
  userId: text("user_id"),
  ipAddress: text("ip_address"),
  online: text("online").default("no"), // yes/no
  lastOnline: timestamp("last_online"),
  
  appId: text("app_id"),
  version: text("version"),
  device: text("device"),
  packageName: text("package_name"),
  appName: text("app_name"),
  customerId: text("customer_id"),
  deviceId: text("device_id"),
  
  firstRegistered: timestamp("first_registered").defaultNow(),
  lastConnection: timestamp("last_connection").defaultNow(),
  ping: text("ping"),
});

// === Access Logs ===
export const accessLogs = pgTable("access_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  action: text("action"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// === Schemas ===
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true, updatedAt: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertGlobalMessageSchema = createInsertSchema(globalMessage).omit({ id: true, updatedAt: true });
export const insertVpnServerSchema = createInsertSchema(vpnServers).omit({ id: true, createdAt: true });
export const insertConnectedUserSchema = createInsertSchema(connectedUsers).omit({ id: true });

// === Types ===
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type GlobalMessage = typeof globalMessage.$inferSelect;
export type InsertGlobalMessage = z.infer<typeof insertGlobalMessageSchema>;

export type VpnServer = typeof vpnServers.$inferSelect;
export type InsertVpnServer = z.infer<typeof insertVpnServerSchema>;

export type ConnectedUser = typeof connectedUsers.$inferSelect;
export type InsertConnectedUser = z.infer<typeof insertConnectedUserSchema>;

export type AccessLog = typeof accessLogs.$inferSelect;

// Default interface toggles
export const defaultInterfaceToggles: Record<string, string> = {
  // Live TV
  live_portal1: "On", live_portal2: "Off", live_portal3: "Off", live_portal4: "Off", live_portal5: "Off",
  // TV Guide (EPG)
  epg_portal1: "On", epg_portal2: "Off", epg_portal3: "Off", epg_portal4: "Off", epg_portal5: "Off",
  // VOD
  vod_portal1: "On", vod_portal2: "Off", vod_portal3: "Off", vod_portal4: "Off", vod_portal5: "Off",
  // Series
  series_portal1: "On", series_portal2: "Off", series_portal3: "Off", series_portal4: "Off", series_portal5: "Off",
  // Catchup
  catchup_portal1: "Off", catchup_portal2: "Off", catchup_portal3: "Off", catchup_portal4: "Off", catchup_portal5: "Off",
  // Radio
  radio_portal1: "Off", radio_portal2: "Off", radio_portal3: "Off", radio_portal4: "Off", radio_portal5: "Off",
  // Multi-Screens
  multiscreen_portal1: "Off", multiscreen_portal2: "Off", multiscreen_portal3: "Off", multiscreen_portal4: "Off", multiscreen_portal5: "Off",
  // Favorite
  favorite_portal1: "Off", favorite_portal2: "Off", favorite_portal3: "Off", favorite_portal4: "Off", favorite_portal5: "Off",
  // Account
  account_portal1: "Off", account_portal2: "Off", account_portal3: "Off", account_portal4: "Off", account_portal5: "Off",
};

// Theme options
export const themeOptions = [
  { value: "d", label: "Standard" },
  { value: "1", label: "Theme 1" },
  { value: "2", label: "Theme 2" },
  { value: "3", label: "Theme 3" },
  { value: "4", label: "Theme 4" },
  { value: "5", label: "Theme 5" },
  { value: "6", label: "Theme 6" },
  { value: "new_layout", label: "New Layout" },
];

// Login type options
export const loginTypeOptions = [
  { value: "login", label: "XC Login" },
  { value: "mac", label: "MAC Address" },
  { value: "activation", label: "Activation Code" },
];

// Stream format options
export const streamFormatOptions = [
  { value: "ts", label: "MPEGTS (.ts)" },
  { value: "m3u8", label: "HLS (.m3u8)" },
];

// Player options
export const playerOptions = [
  { value: "EXO", label: "EXO Player" },
  { value: "VLC", label: "VLC Player" },
];

// Language options
export const languageOptions = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "bn", label: "Bengali" },
  { value: "zh", label: "Chinese" },
  { value: "fr", label: "French" },
  { value: "hi", label: "Hindi" },
  { value: "it", label: "Italian" },
  { value: "ml", label: "Malayalam" },
  { value: "pt", label: "Portugese" },
  { value: "es", label: "Spanish" },
  { value: "ru", label: "Russian" },
  { value: "sv", label: "Swedish" },
];

// VPN Auth Type options
export const vpnAuthTypeOptions = [
  { value: "noup", label: "Username and Password are not required" },
  { value: "up", label: "Username and Password required" },
  { value: "kp", label: "Key file password Required" },
];

// VPN Status options
export const vpnStatusOptions = [
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "INACTIVE", label: "INACTIVE" },
];

// VPN Auth Embedded options
export const vpnAuthEmbeddedOptions = [
  { value: "NO", label: "NO" },
  { value: "YES", label: "YES" },
];

// Country options for VPN (ISO codes)
export const countryOptions = [
  { value: "AF", label: "Afghanistan" },
  { value: "AL", label: "Albania" },
  { value: "DZ", label: "Algeria" },
  { value: "AD", label: "Andorra" },
  { value: "AR", label: "Argentina" },
  { value: "AU", label: "Australia" },
  { value: "AT", label: "Austria" },
  { value: "BE", label: "Belgium" },
  { value: "BR", label: "Brazil" },
  { value: "BG", label: "Bulgaria" },
  { value: "CA", label: "Canada" },
  { value: "CL", label: "Chile" },
  { value: "CN", label: "China" },
  { value: "CO", label: "Colombia" },
  { value: "HR", label: "Croatia" },
  { value: "CY", label: "Cyprus" },
  { value: "CZ", label: "Czech Republic" },
  { value: "DK", label: "Denmark" },
  { value: "EE", label: "Estonia" },
  { value: "FI", label: "Finland" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "GR", label: "Greece" },
  { value: "HK", label: "Hong Kong" },
  { value: "HU", label: "Hungary" },
  { value: "IS", label: "Iceland" },
  { value: "IN", label: "India" },
  { value: "ID", label: "Indonesia" },
  { value: "IE", label: "Ireland" },
  { value: "IL", label: "Israel" },
  { value: "IT", label: "Italy" },
  { value: "JP", label: "Japan" },
  { value: "LV", label: "Latvia" },
  { value: "LT", label: "Lithuania" },
  { value: "LU", label: "Luxembourg" },
  { value: "MY", label: "Malaysia" },
  { value: "MT", label: "Malta" },
  { value: "MX", label: "Mexico" },
  { value: "NL", label: "Netherlands" },
  { value: "NZ", label: "New Zealand" },
  { value: "NO", label: "Norway" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
  { value: "RO", label: "Romania" },
  { value: "RU", label: "Russia" },
  { value: "RS", label: "Serbia" },
  { value: "SG", label: "Singapore" },
  { value: "SK", label: "Slovakia" },
  { value: "SI", label: "Slovenia" },
  { value: "ZA", label: "South Africa" },
  { value: "KR", label: "South Korea" },
  { value: "ES", label: "Spain" },
  { value: "SE", label: "Sweden" },
  { value: "CH", label: "Switzerland" },
  { value: "TW", label: "Taiwan" },
  { value: "TH", label: "Thailand" },
  { value: "TR", label: "Turkey" },
  { value: "UA", label: "Ukraine" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
  { value: "VN", label: "Vietnam" },
];
