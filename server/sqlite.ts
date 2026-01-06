import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';

const DB_DIR = './data';

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const mainDb = new Database(path.join(DB_DIR, 'main.db'));
export const vpnDb = new Database(path.join(DB_DIR, 'vpn.db'));
export const messagesDb = new Database(path.join(DB_DIR, 'user_message.db'));
export const sportsDb = new Database(path.join(DB_DIR, 'sports.db'));
export const logsDb = new Database(path.join(DB_DIR, 'user_logs.db'));
export const backupDb = new Database(path.join(DB_DIR, 'CloudBackup.db'));

mainDb.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    app_name TEXT DEFAULT 'MultififaIPTV',
    customer_id TEXT DEFAULT '2001',
    version_code TEXT DEFAULT '2001',
    login_type TEXT DEFAULT 'XCLogin',
    login_accounts_button TEXT DEFAULT 'Enabled',
    login_settings_button TEXT DEFAULT 'Enabled',
    signup_button TEXT DEFAULT 'Disabled',
    signup_url TEXT DEFAULT '',
    announcements_enabled TEXT DEFAULT 'Enabled',
    messages_enabled TEXT DEFAULT 'Enabled',
    update_user_info TEXT DEFAULT 'Enabled',
    developer_name TEXT DEFAULT '',
    developer_contact TEXT DEFAULT '',
    support_email TEXT DEFAULT '',
    support_phone TEXT DEFAULT '',
    portal1_name TEXT DEFAULT 'MultififaIPTV',
    portal1_url TEXT DEFAULT 'http://example.com:8080',
    portal2_name TEXT DEFAULT '',
    portal2_url TEXT DEFAULT '',
    portal3_name TEXT DEFAULT '',
    portal3_url TEXT DEFAULT '',
    portal4_name TEXT DEFAULT '',
    portal4_url TEXT DEFAULT '',
    portal5_name TEXT DEFAULT '',
    portal5_url TEXT DEFAULT '',
    portal_vod TEXT DEFAULT '',
    portal_series TEXT DEFAULT '',
    apk_url TEXT DEFAULT '',
    backup_url TEXT DEFAULT '',
    epg_url TEXT DEFAULT 'No',
    ovpn_config_url TEXT DEFAULT 'No',
    user_agent TEXT DEFAULT 'XCIPTV',
    stream_format TEXT DEFAULT 'MPEGTS (ts)',
    load_last_channel TEXT DEFAULT 'Disabled',
    show_login_logo TEXT DEFAULT 'Enabled',
    show_app_logo TEXT DEFAULT 'Enabled',
    show_category_count TEXT DEFAULT 'Enabled',
    show_reminders TEXT DEFAULT 'Disabled',
    show_record TEXT DEFAULT 'Disabled',
    show_vpn TEXT DEFAULT 'Enabled',
    show_message TEXT DEFAULT 'Enabled',
    show_update TEXT DEFAULT 'Enabled',
    show_sub_expiry TEXT DEFAULT 'Disabled',
    interface_toggles TEXT DEFAULT '{}',
    theme TEXT DEFAULT 'Theme 2',
    live_player TEXT DEFAULT 'EXO Player',
    epg_player TEXT DEFAULT 'EXO Player',
    vod_player TEXT DEFAULT 'EXO Player',
    series_player TEXT DEFAULT 'EXO Player',
    app_language TEXT DEFAULT 'Italian',
    picker_language TEXT DEFAULT 'Italian',
    maintenance_mode TEXT DEFAULT 'OFF',
    maintenance_message TEXT DEFAULT '',
    apk_auto_update TEXT DEFAULT 'yes',
    widget_width TEXT DEFAULT '280',
    widget_height TEXT DEFAULT '500',
    widget_color TEXT DEFAULT '#005df8',
    widget_type TEXT DEFAULT 'soccer',
    widget_competition TEXT DEFAULT '',
    widget_all_competitions TEXT DEFAULT 'true',
    widget_team TEXT DEFAULT '',
    widget_all_teams TEXT DEFAULT 'true',
    widget_sport TEXT DEFAULT 'futbol'
  );
`);

const widgetColumns = [
  { name: 'portal_vod', def: "TEXT DEFAULT 'no'" },
  { name: 'portal_series', def: "TEXT DEFAULT 'no'" },
  { name: 'show_multiscreen', def: "TEXT DEFAULT 'Disabled'" },
  { name: 'show_favorites', def: "TEXT DEFAULT 'Enabled'" },
  { name: 'show_account', def: "TEXT DEFAULT 'Enabled'" },
  { name: 'settings_app_icon', def: "TEXT DEFAULT 'Enabled'" },
  { name: 'settings_account_icon', def: "TEXT DEFAULT 'Enabled'" },
  { name: 'send_udid', def: "TEXT DEFAULT 'Disabled'" },
  { name: 'hide_auto_conn_vpn', def: "TEXT DEFAULT 'Disabled'" },
  { name: 'hide_other_login_type', def: "TEXT DEFAULT 'Disabled'" },
  { name: 'max_epg_file_size', def: "TEXT DEFAULT '50'" },
  { name: 'widget_width', def: "TEXT DEFAULT '280'" },
  { name: 'widget_height', def: "TEXT DEFAULT '500'" },
  { name: 'widget_color', def: "TEXT DEFAULT '#005df8'" },
  { name: 'widget_type', def: "TEXT DEFAULT 'soccer'" },
  { name: 'widget_competition', def: "TEXT DEFAULT ''" },
  { name: 'widget_all_competitions', def: "TEXT DEFAULT 'true'" },
  { name: 'widget_team', def: "TEXT DEFAULT ''" },
  { name: 'widget_all_teams', def: "TEXT DEFAULT 'true'" },
  { name: 'widget_sport', def: "TEXT DEFAULT 'futbol'" },
  { name: 'widget_language', def: "TEXT DEFAULT 'en-CA'" },
  { name: 'backdrop_enabled', def: "TEXT DEFAULT 'true'" },
  { name: 'backdrop_api_key', def: "TEXT DEFAULT '6b8e3eaa1a03ebb45642e9531d8a76d2'" },
  { name: 'backdrop_page_count', def: "TEXT DEFAULT '15'" },
  { name: 'backdrop_interval', def: "TEXT DEFAULT '9000'" },
  { name: 'backdrop_initial_delay', def: "TEXT DEFAULT '2000'" },
  { name: 'backdrop_language', def: "TEXT DEFAULT 'en-US'" },
  { name: 'maintenance_expire', def: "TEXT DEFAULT ''" },
  { name: 'vast_enabled', def: "TEXT DEFAULT 'no'" },
  { name: 'mid_roll_interval', def: "TEXT DEFAULT ''" },
  { name: 'post_roll_start_at', def: "TEXT DEFAULT ''" },
  { name: 'vod_mid_roll_interval', def: "TEXT DEFAULT ''" },
  { name: 'vod_pre_roll_url', def: "TEXT DEFAULT ''" },
  { name: 'vod_mid_roll_url', def: "TEXT DEFAULT ''" },
  { name: 'vod_post_roll_url', def: "TEXT DEFAULT ''" },
  { name: 'series_mid_roll_interval', def: "TEXT DEFAULT ''" },
  { name: 'series_pre_roll_url', def: "TEXT DEFAULT ''" },
  { name: 'series_mid_roll_url', def: "TEXT DEFAULT ''" },
  { name: 'series_post_roll_url', def: "TEXT DEFAULT ''" },
  { name: 'freestar', def: "TEXT DEFAULT 'no'" },
  { name: 'default_player', def: "TEXT DEFAULT 'EXO'" },
  { name: 'player_tv', def: "TEXT DEFAULT 'EXO'" },
  { name: 'player_catchup', def: "TEXT DEFAULT 'VLC'" },
  { name: 'stream_type', def: "TEXT DEFAULT 'MPEGTS (ts)'" },
  { name: 'vlc_hw', def: "TEXT DEFAULT 'yes'" },
  { name: 'last_volume_vlc', def: "TEXT DEFAULT '100'" },
  { name: 'player_vlc_buffer', def: "TEXT DEFAULT '5000'" },
  { name: 'video_resize_vlc', def: "TEXT DEFAULT '0'" },
  { name: 'video_subtitles_vlc', def: "TEXT DEFAULT 'yes'" },
  { name: 'exo_hw', def: "TEXT DEFAULT 'yes'" },
  { name: 'last_volume_exo', def: "TEXT DEFAULT '100'" },
  { name: 'player_exo_buffer', def: "TEXT DEFAULT '50000'" },
  { name: 'video_resize_exo', def: "TEXT DEFAULT '0'" },
  { name: 'video_subtitles_exo', def: "TEXT DEFAULT 'no'" },
  { name: 'apk_auto_update', def: "TEXT DEFAULT 'yes'" },
];

for (const col of widgetColumns) {
  try {
    mainDb.exec(`ALTER TABLE settings ADD COLUMN ${col.name} ${col.def}`);
  } catch (e) {
  }
}

mainDb.exec(`
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    announcement TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    expiration TEXT,
    display_time INTEGER DEFAULT 1,
    disappear_time INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS global_message (
    id INTEGER PRIMARY KEY DEFAULT 1,
    message TEXT DEFAULT '',
    status TEXT DEFAULT 'INACTIVE',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

vpnDb.exec(`
  CREATE TABLE IF NOT EXISTS vpn_servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country TEXT NOT NULL,
    state TEXT,
    ovpn_url TEXT,
    auth_type TEXT DEFAULT 'Username and Password required',
    username TEXT DEFAULT '',
    password TEXT DEFAULT '',
    status TEXT DEFAULT 'ACTIVE',
    auth_embedded TEXT DEFAULT 'NO',
    vpn_country TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

messagesDb.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    expiration TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

sportsDb.exec(`
  CREATE TABLE IF NOT EXISTS sports_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    channel TEXT,
    start_time TEXT,
    end_time TEXT,
    category TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

logsDb.exec(`
  CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT,
    username TEXT,
    device_id TEXT,
    device_key TEXT,
    ip_address TEXT,
    action TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS connected_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    device_id TEXT,
    device_key TEXT,
    ip_address TEXT,
    device_name TEXT,
    last_active TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'ACTIVE',
    app_id TEXT,
    version TEXT,
    package_name TEXT,
    app_name TEXT,
    customer_id TEXT,
    first_registered TEXT DEFAULT CURRENT_TIMESTAMP,
    last_connection TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const connectedUsersColumns = [
  { name: 'app_id', def: "TEXT" },
  { name: 'version', def: "TEXT" },
  { name: 'package_name', def: "TEXT" },
  { name: 'app_name', def: "TEXT" },
  { name: 'customer_id', def: "TEXT" },
  { name: 'first_registered', def: "TEXT DEFAULT CURRENT_TIMESTAMP" },
  { name: 'last_connection', def: "TEXT DEFAULT CURRENT_TIMESTAMP" },
];

for (const col of connectedUsersColumns) {
  try {
    logsDb.exec(`ALTER TABLE connected_users ADD COLUMN ${col.name} ${col.def}`);
  } catch (e) {
  }
}

mainDb.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempted_username TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    attempted_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const existingSettings = mainDb.prepare('SELECT * FROM settings WHERE id = 1').get();
if (!existingSettings) {
  mainDb.prepare('INSERT INTO settings (id) VALUES (1)').run();
}

const existingGlobalMsg = mainDb.prepare('SELECT * FROM global_message WHERE id = 1').get();
if (!existingGlobalMsg) {
  mainDb.prepare('INSERT INTO global_message (id) VALUES (1)').run();
}

const existingAdmin = mainDb.prepare('SELECT * FROM admin_users WHERE id = 1').get();
if (!existingAdmin) {
  const defaultPassword = 'admin123';
  const hash = bcrypt.hashSync(defaultPassword, 10);
  mainDb.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('admin', hash);
  console.log('Default admin user created: admin / admin123');
}

backupDb.exec(`
  CREATE TABLE IF NOT EXISTS BACKUP (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    pass TEXT NOT NULL,
    resetcode TEXT,
    backup TEXT
  );
`);

console.log('SQLite databases initialized');
