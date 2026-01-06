import { mainDb, vpnDb, messagesDb, logsDb, backupDb } from './sqlite';

export interface SqliteSettings {
  id: number;
  appName: string;
  customerId: string;
  versionCode: string;
  loginType: string;
  loginAccountsButton: string;
  loginSettingsButton: string;
  signupButton: string;
  signupUrl: string;
  announcementsEnabled: string;
  messagesEnabled: string;
  updateUserInfo: string;
  supportEmail: string;
  supportPhone: string;
  portal1Name: string;
  portal1Url: string;
  portal2Name: string;
  portal2Url: string;
  portal3Name: string;
  portal3Url: string;
  portal4Name: string;
  portal4Url: string;
  portal5Name: string;
  portal5Url: string;
  portalVod: string,
  portalSeries: string,
  apkUrl: string;
  backupUrl: string;
  epgUrl: string;
  ovpnConfigUrl: string;
  userAgent: string;
  streamFormat: string;
  loadLastChannel: string;
  showLoginLogo: string;
  showAppLogo: string;
  showCategoryCount: string;
  showReminders: string;
  showRecord: string;
  showVpn: string;
  showMultiscreen: string;
  showFavorites: string;
  showAccount: string;
  settingsAppIcon: string;
  settingsAccountIcon: string;
  sendUdid: string;
  hideAutoConnVpn: string;
  hideOtherLoginType: string;
  maxEpgFileSize: string;
  showMessage: string;
  showUpdate: string;
  showSubExpiry: string;
  interfaceToggles: Record<string, string>;
  theme: string;
  vodPlayer: string;
  seriesPlayer: string;
  appLanguage: string;
  maintenanceMode: string;
  maintenanceMessage: string;
  apkAutoUpdate: string;
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
  backdropEnabled: string;
  backdropApiKey: string;
  backdropPageCount: string;
  backdropInterval: string;
  backdropInitialDelay: string;
  backdropLanguage: string;
  maintenanceExpire: string;
  
  vastEnabled: string;
  midRollInterval: string;
  postRollStartAt: string;
  vodMidRollInterval: string;
  vodPreRollUrl: string;
  vodMidRollUrl: string;
  vodPostRollUrl: string;
  seriesMidRollInterval: string;
  seriesPreRollUrl: string;
  seriesMidRollUrl: string;
  seriesPostRollUrl: string;
  freestar: string;
  
  defaultPlayer: string;
  playerTv: string;
  playerVod: string;
  playerSeries: string;
  playerCatchup: string;
  
  vlcHw: string;
  lastVolumeVlc: string;
  playerVlcBuffer: string;
  videoResizeVlc: string;
  videoSubtitlesVlc: string;
  
  exoHw: string;
  lastVolumeExo: string;
  playerExoBuffer: string;
  videoResizeExo: string;
  videoSubtitlesExo: string;
}

export interface SqliteAnnouncement {
  id: number;
  announcement: string;
  status: string;
  expiration: string | null;
  displayTime: number;
  disappearTime: number;
  createdAt: Date | null;
}

export interface SqliteMessage {
  id: number;
  username: string;
  message: string;
  status: string;
  expiration: string | null;
  createdAt: Date | null;
}

export interface SqliteGlobalMessage {
  id: number;
  message: string;
  status: string;
  createdAt: Date | null;
}

export interface SqliteVpnServer {
  id: number;
  country: string;
  state: string;
  ovpnUrl: string;
  authType: string;
  username: string;
  password: string;
  status: string;
  authEmbedded: string;
  vpnCountry: string;
  createdAt: Date | null;
}

export interface SqliteConnectedUser {
  id: number;
  username: string;
  deviceId: string;
  deviceKey: string;
  ipAddress: string;
  deviceName: string;
  lastActive: Date | null;
  status: string;
  appId: string;
  version: string;
  packageName: string;
  appName: string;
  customerId: string;
  firstRegistered: Date | null;
  lastConnection: Date | null;
}

export interface SqliteAccessLog {
  id: number;
  customerId: string;
  username: string;
  deviceId: string;
  deviceKey: string;
  ipAddress: string;
  action: string;
  timestamp: Date | null;
}

export interface SqliteAdminUser {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: Date | null;
}

export interface SqliteLoginAttempt {
  id: number;
  attemptedUsername: string;
  ipAddress: string;
  userAgent: string;
  attemptedAt: Date | null;
}

function rowToSettings(row: any): SqliteSettings {
  return {
    id: row.id,
    appName: row.app_name,
    customerId: row.customer_id,
    versionCode: row.version_code,
    loginType: row.login_type,
    loginAccountsButton: row.login_accounts_button,
    loginSettingsButton: row.login_settings_button,
    signupButton: row.signup_button,
    signupUrl: row.signup_url,
    announcementsEnabled: row.announcements_enabled,
    messagesEnabled: row.messages_enabled,
    updateUserInfo: row.update_user_info,
    supportEmail: row.support_email,
    supportPhone: row.support_phone,
    portal1Name: row.portal1_name,
    portal1Url: row.portal1_url,
    portal2Name: row.portal2_name,
    portal2Url: row.portal2_url,
    portal3Name: row.portal3_name,
    portal3Url: row.portal3_url,
    portal4Name: row.portal4_name,
    portal4Url: row.portal4_url,
    portal5Name: row.portal5_name,
    portal5Url: row.portal5_url,
    portalVod: row.portal_vod,
    portalSeries: row.portal_series,
    apkUrl: row.apk_url,
    backupUrl: row.backup_url,
    epgUrl: row.epg_url,
    ovpnConfigUrl: row.ovpn_config_url,
    userAgent: row.user_agent,
    streamFormat: row.stream_format,
    loadLastChannel: row.load_last_channel,
    showLoginLogo: row.show_login_logo,
    showAppLogo: row.show_app_logo,
    showCategoryCount: row.show_category_count,
    showReminders: row.show_reminders,
    showRecord: row.show_record,
    showVpn: row.show_vpn,
    showMultiscreen: row.show_multiscreen || 'Disabled',
    showFavorites: row.show_favorites || 'Enabled',
    showAccount: row.show_account || 'Enabled',
    settingsAppIcon: row.settings_app_icon || 'Enabled',
    settingsAccountIcon: row.settings_account_icon || 'Enabled',
    sendUdid: row.send_udid || 'Disabled',
    hideAutoConnVpn: row.hide_auto_conn_vpn || 'Disabled',
    hideOtherLoginType: row.hide_other_login_type || 'Disabled',
    maxEpgFileSize: row.max_epg_file_size || '50',
    showMessage: row.show_message,
    showUpdate: row.show_update,
    showSubExpiry: row.show_sub_expiry,
    interfaceToggles: row.interface_toggles ? JSON.parse(row.interface_toggles) : {},
    theme: row.theme,
    vodPlayer: row.vod_player,
    seriesPlayer: row.series_player,
    appLanguage: row.app_language,
    maintenanceMode: row.maintenance_mode,
    maintenanceMessage: row.maintenance_message,
    apkAutoUpdate: row.apk_auto_update || 'yes',
    widgetWidth: row.widget_width || '280',
    widgetHeight: row.widget_height || '500',
    widgetColor: row.widget_color || '#005df8',
    widgetType: row.widget_type || 'soccer',
    widgetCompetition: row.widget_competition || '',
    widgetAllCompetitions: row.widget_all_competitions || 'true',
    widgetTeam: row.widget_team || '',
    widgetAllTeams: row.widget_all_teams || 'true',
    widgetSport: row.widget_sport || 'futbol',
    widgetLanguage: row.widget_language || 'en-CA',
    backdropEnabled: row.backdrop_enabled || 'true',
    backdropApiKey: row.backdrop_api_key || '6b8e3eaa1a03ebb45642e9531d8a76d2',
    backdropPageCount: row.backdrop_page_count || '15',
    backdropInterval: row.backdrop_interval || '9000',
    backdropInitialDelay: row.backdrop_initial_delay || '2000',
    backdropLanguage: row.backdrop_language || 'en-US',
    maintenanceExpire: row.maintenance_expire || '',
    
    vastEnabled: row.vast_enabled || 'no',
    midRollInterval: row.mid_roll_interval || '',
    postRollStartAt: row.post_roll_start_at || '',
    vodMidRollInterval: row.vod_mid_roll_interval || '',
    vodPreRollUrl: row.vod_pre_roll_url || '',
    vodMidRollUrl: row.vod_mid_roll_url || '',
    vodPostRollUrl: row.vod_post_roll_url || '',
    seriesMidRollInterval: row.series_mid_roll_interval || '',
    seriesPreRollUrl: row.series_pre_roll_url || '',
    seriesMidRollUrl: row.series_mid_roll_url || '',
    seriesPostRollUrl: row.series_post_roll_url || '',
    freestar: row.freestar || 'no',
    
    defaultPlayer: row.default_player || 'EXO',
    playerTv: row.player_tv || 'EXO',
    playerVod: row.vod_player || 'VLC',
    playerSeries: row.series_player || 'VLC',
    playerCatchup: row.player_catchup || 'VLC',
    
    vlcHw: row.vlc_hw || 'yes',
    lastVolumeVlc: row.last_volume_vlc || '100',
    playerVlcBuffer: row.player_vlc_buffer || '5000',
    videoResizeVlc: row.video_resize_vlc || '0',
    videoSubtitlesVlc: row.video_subtitles_vlc || 'yes',
    
    exoHw: row.exo_hw || 'yes',
    lastVolumeExo: row.last_volume_exo || '100',
    playerExoBuffer: row.player_exo_buffer || '50000',
    videoResizeExo: row.video_resize_exo || '0',
    videoSubtitlesExo: row.video_subtitles_exo || 'no',
  };
}

function rowToVpnServer(row: any): SqliteVpnServer {
  return {
    id: row.id,
    country: row.country,
    state: row.state,
    ovpnUrl: row.ovpn_url,
    authType: row.auth_type,
    username: row.username,
    password: row.password,
    status: row.status,
    authEmbedded: row.auth_embedded,
    vpnCountry: row.vpn_country,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

function rowToMessage(row: any): SqliteMessage {
  return {
    id: row.id,
    username: row.username,
    message: row.message,
    status: row.status,
    expiration: row.expiration,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

function rowToAnnouncement(row: any): SqliteAnnouncement {
  return {
    id: row.id,
    announcement: row.announcement,
    status: row.status,
    expiration: row.expiration,
    displayTime: row.display_time,
    disappearTime: row.disappear_time,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

function rowToConnectedUser(row: any): SqliteConnectedUser {
  return {
    id: row.id,
    username: row.username,
    deviceId: row.device_id || '',
    deviceKey: row.device_key || '',
    ipAddress: row.ip_address || '',
    deviceName: row.device_name || '',
    lastActive: row.last_active ? new Date(row.last_active) : null,
    status: row.status || 'ACTIVE',
    appId: row.app_id || '',
    version: row.version || '',
    packageName: row.package_name || '',
    appName: row.app_name || '',
    customerId: row.customer_id || '',
    firstRegistered: row.first_registered ? new Date(row.first_registered) : null,
    lastConnection: row.last_connection ? new Date(row.last_connection) : null,
  };
}

export const sqliteStorage = {
  getSettings(): SqliteSettings | null {
    const row = mainDb.prepare('SELECT * FROM settings WHERE id = 1').get();
    return row ? rowToSettings(row) : null;
  },

  updateSettings(data: Partial<SqliteSettings>): SqliteSettings {
    const current = this.getSettings();
    if (!current) throw new Error('Settings not found');

    const updates: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      appName: 'app_name',
      customerId: 'customer_id',
      versionCode: 'version_code',
      loginType: 'login_type',
      loginAccountsButton: 'login_accounts_button',
      loginSettingsButton: 'login_settings_button',
      signupButton: 'signup_button',
      signupUrl: 'signup_url',
      announcementsEnabled: 'announcements_enabled',
      messagesEnabled: 'messages_enabled',
      updateUserInfo: 'update_user_info',
      supportEmail: 'support_email',
      supportPhone: 'support_phone',
      portal1Name: 'portal1_name',
      portal1Url: 'portal1_url',
      portal2Name: 'portal2_name',
      portal2Url: 'portal2_url',
      portal3Name: 'portal3_name',
      portal3Url: 'portal3_url',
      portal4Name: 'portal4_name',
      portal4Url: 'portal4_url',
      portal5Name: 'portal5_name',
      portal5Url: 'portal5_url',
      portalVod: 'portal_vod',
      portalSeries: 'portal_series',
      apkUrl: 'apk_url',
      backupUrl: 'backup_url',
      epgUrl: 'epg_url',
      ovpnConfigUrl: 'ovpn_config_url',
      userAgent: 'user_agent',
      streamFormat: 'stream_format',
      loadLastChannel: 'load_last_channel',
      showLoginLogo: 'show_login_logo',
      showAppLogo: 'show_app_logo',
      showCategoryCount: 'show_category_count',
      showReminders: 'show_reminders',
      showRecord: 'show_record',
      showVpn: 'show_vpn',
      showMultiscreen: 'show_multiscreen',
      showFavorites: 'show_favorites',
      showAccount: 'show_account',
      settingsAppIcon: 'settings_app_icon',
      settingsAccountIcon: 'settings_account_icon',
      sendUdid: 'send_udid',
      hideAutoConnVpn: 'hide_auto_conn_vpn',
      hideOtherLoginType: 'hide_other_login_type',
      maxEpgFileSize: 'max_epg_file_size',
      showMessage: 'show_message',
      showUpdate: 'show_update',
      showSubExpiry: 'show_sub_expiry',
      interfaceToggles: 'interface_toggles',
      theme: 'theme',
      vodPlayer: 'vod_player',
      seriesPlayer: 'series_player',
      appLanguage: 'app_language',
      maintenanceMode: 'maintenance_mode',
      maintenanceMessage: 'maintenance_message',
      maintenanceStatus: 'maintenance_mode',
      maintenanceExpire: 'maintenance_expire',
      apkAutoUpdate: 'apk_auto_update',
      widgetWidth: 'widget_width',
      widgetHeight: 'widget_height',
      widgetColor: 'widget_color',
      widgetType: 'widget_type',
      widgetCompetition: 'widget_competition',
      widgetAllCompetitions: 'widget_all_competitions',
      widgetTeam: 'widget_team',
      widgetAllTeams: 'widget_all_teams',
      widgetSport: 'widget_sport',
      widgetLanguage: 'widget_language',
      backdropEnabled: 'backdrop_enabled',
      backdropApiKey: 'backdrop_api_key',
      backdropPageCount: 'backdrop_page_count',
      backdropInterval: 'backdrop_interval',
      backdropInitialDelay: 'backdrop_initial_delay',
      backdropLanguage: 'backdrop_language',
      
      vastEnabled: 'vast_enabled',
      midRollInterval: 'mid_roll_interval',
      postRollStartAt: 'post_roll_start_at',
      vodMidRollInterval: 'vod_mid_roll_interval',
      vodPreRollUrl: 'vod_pre_roll_url',
      vodMidRollUrl: 'vod_mid_roll_url',
      vodPostRollUrl: 'vod_post_roll_url',
      seriesMidRollInterval: 'series_mid_roll_interval',
      seriesPreRollUrl: 'series_pre_roll_url',
      seriesMidRollUrl: 'series_mid_roll_url',
      seriesPostRollUrl: 'series_post_roll_url',
      freestar: 'freestar',
      
      defaultPlayer: 'default_player',
      playerTv: 'player_tv',
      playerVod: 'vod_player',
      playerSeries: 'series_player',
      playerCatchup: 'player_catchup',
      
      vlcHw: 'vlc_hw',
      lastVolumeVlc: 'last_volume_vlc',
      playerVlcBuffer: 'player_vlc_buffer',
      videoResizeVlc: 'video_resize_vlc',
      videoSubtitlesVlc: 'video_subtitles_vlc',
      
      exoHw: 'exo_hw',
      lastVolumeExo: 'last_volume_exo',
      playerExoBuffer: 'player_exo_buffer',
      videoResizeExo: 'video_resize_exo',
      videoSubtitlesExo: 'video_subtitles_exo',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (key in data && data[key as keyof SqliteSettings] !== undefined) {
        updates.push(`${dbField} = ?`);
        const value = data[key as keyof SqliteSettings];
        values.push(key === 'interfaceToggles' ? JSON.stringify(value) : value);
      }
    }

    if (updates.length > 0) {
      mainDb.prepare(`UPDATE settings SET ${updates.join(', ')} WHERE id = 1`).run(...values);
    }

    return this.getSettings()!;
  },

  getAnnouncements(): SqliteAnnouncement[] {
    const rows = mainDb.prepare('SELECT * FROM announcements ORDER BY id DESC').all();
    return rows.map(rowToAnnouncement);
  },

  createAnnouncement(data: any): SqliteAnnouncement {
    const result = mainDb.prepare(`
      INSERT INTO announcements (announcement, status, expiration, display_time, disappear_time)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      data.announcement,
      data.status || 'ACTIVE',
      data.expiration || null,
      data.displayTime || 1,
      data.disappearTime || 1
    );
    return this.getAnnouncementById(result.lastInsertRowid as number)!;
  },

  getAnnouncementById(id: number): SqliteAnnouncement | null {
    const row = mainDb.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
    return row ? rowToAnnouncement(row) : null;
  },

  updateAnnouncement(id: number, data: any): SqliteAnnouncement {
    const updates: string[] = [];
    const values: any[] = [];

    const announcementText = data.announcement || data.message;
    const expirationText = data.expiration || data.expire;
    const displayTimeVal = data.displayTime || data.displayFor;
    const disappearTimeVal = data.disappearTime || data.disappearAfter;

    if (announcementText !== undefined) { updates.push('announcement = ?'); values.push(announcementText); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (expirationText !== undefined) { updates.push('expiration = ?'); values.push(expirationText); }
    if (displayTimeVal !== undefined) { updates.push('display_time = ?'); values.push(displayTimeVal); }
    if (disappearTimeVal !== undefined) { updates.push('disappear_time = ?'); values.push(disappearTimeVal); }

    if (updates.length > 0) {
      values.push(id);
      mainDb.prepare(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getAnnouncementById(id)!;
  },

  deleteAnnouncement(id: number): void {
    mainDb.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  },

  getGlobalMessage(): SqliteGlobalMessage | null {
    const row = mainDb.prepare('SELECT * FROM global_message WHERE id = 1').get() as any;
    if (!row) return null;
    return {
      id: row.id,
      message: row.message,
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  },

  updateGlobalMessage(data: Partial<SqliteGlobalMessage>): SqliteGlobalMessage {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.message !== undefined) { updates.push('message = ?'); values.push(data.message); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }

    if (updates.length > 0) {
      mainDb.prepare(`UPDATE global_message SET ${updates.join(', ')} WHERE id = 1`).run(...values);
    }

    return this.getGlobalMessage()!;
  },

  getVpnServers(): SqliteVpnServer[] {
    const rows = vpnDb.prepare('SELECT * FROM vpn_servers ORDER BY id DESC').all();
    return rows.map(rowToVpnServer);
  },

  createVpnServer(data: any): SqliteVpnServer {
    const result = vpnDb.prepare(`
      INSERT INTO vpn_servers (country, state, ovpn_url, auth_type, username, password, status, auth_embedded, vpn_country)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.country,
      data.state || '',
      data.ovpnUrl || '',
      data.authType || 'Username and Password required',
      data.username || '',
      data.password || '',
      data.status || 'ACTIVE',
      data.authEmbedded || 'NO',
      data.vpnCountry || data.country
    );
    return this.getVpnServerById(result.lastInsertRowid as number)!;
  },

  getVpnServerById(id: number): SqliteVpnServer | null {
    const row = vpnDb.prepare('SELECT * FROM vpn_servers WHERE id = ?').get(id);
    return row ? rowToVpnServer(row) : null;
  },

  updateVpnServer(id: number, data: Partial<SqliteVpnServer>): SqliteVpnServer {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.country !== undefined) { updates.push('country = ?'); values.push(data.country); }
    if (data.state !== undefined) { updates.push('state = ?'); values.push(data.state); }
    if (data.ovpnUrl !== undefined) { updates.push('ovpn_url = ?'); values.push(data.ovpnUrl); }
    if (data.authType !== undefined) { updates.push('auth_type = ?'); values.push(data.authType); }
    if (data.username !== undefined) { updates.push('username = ?'); values.push(data.username); }
    if (data.password !== undefined) { updates.push('password = ?'); values.push(data.password); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.authEmbedded !== undefined) { updates.push('auth_embedded = ?'); values.push(data.authEmbedded); }
    if (data.vpnCountry !== undefined) { updates.push('vpn_country = ?'); values.push(data.vpnCountry); }

    if (updates.length > 0) {
      values.push(id);
      vpnDb.prepare(`UPDATE vpn_servers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getVpnServerById(id)!;
  },

  deleteVpnServer(id: number): void {
    vpnDb.prepare('DELETE FROM vpn_servers WHERE id = ?').run(id);
  },

  getMessages(): SqliteMessage[] {
    const rows = messagesDb.prepare('SELECT * FROM messages ORDER BY id DESC').all();
    return rows.map(rowToMessage);
  },

  createMessage(data: any): SqliteMessage {
    const result = messagesDb.prepare(`
      INSERT INTO messages (username, message, status, expiration)
      VALUES (?, ?, ?, ?)
    `).run(
      data.username || data.userId,
      data.message,
      data.status || 'ACTIVE',
      data.expiration || data.expire || null
    );
    return this.getMessageById(result.lastInsertRowid as number)!;
  },

  getMessageById(id: number): SqliteMessage | null {
    const row = messagesDb.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    return row ? rowToMessage(row) : null;
  },

  updateMessage(id: number, data: Partial<SqliteMessage>): SqliteMessage {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.username !== undefined) { updates.push('username = ?'); values.push(data.username); }
    if (data.message !== undefined) { updates.push('message = ?'); values.push(data.message); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.expiration !== undefined) { updates.push('expiration = ?'); values.push(data.expiration); }

    if (updates.length > 0) {
      values.push(id);
      messagesDb.prepare(`UPDATE messages SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getMessageById(id)!;
  },

  deleteMessage(id: number): void {
    messagesDb.prepare('DELETE FROM messages WHERE id = ?').run(id);
  },

  getConnectedUsers(): SqliteConnectedUser[] {
    const rows = logsDb.prepare('SELECT * FROM connected_users ORDER BY last_active DESC').all();
    return rows.map(rowToConnectedUser);
  },

  upsertConnectedUser(data: any): SqliteConnectedUser {
    const username = data.username || data.userId || '';
    const isOnline = data.online !== 'no';
    const status = isOnline ? 'ACTIVE' : 'OFFLINE';
    const existing = logsDb.prepare('SELECT * FROM connected_users WHERE username = ?').get(username);
    
    if (existing) {
      logsDb.prepare(`
        UPDATE connected_users SET 
          ip_address = ?,
          device_id = ?,
          device_key = ?,
          device_name = ?,
          last_active = CURRENT_TIMESTAMP,
          last_connection = CURRENT_TIMESTAMP,
          status = ?,
          app_id = ?,
          version = ?,
          package_name = ?,
          app_name = ?,
          customer_id = ?
        WHERE username = ?
      `).run(
        data.ipAddress || '',
        data.deviceId || data.did || '',
        data.deviceKey || '',
        data.deviceName || data.device_type || '',
        status,
        data.appId || data.appid || '',
        data.version || '',
        data.packageName || data.p || '',
        data.appName || data.an || '',
        data.customerId || data.customerid || '',
        username
      );
      return this.getConnectedUserByUsername(username)!;
    } else {
      const result = logsDb.prepare(`
        INSERT INTO connected_users (username, device_id, device_key, ip_address, device_name, status, app_id, version, package_name, app_name, customer_id, first_registered, last_connection)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        username,
        data.deviceId || data.did || '',
        data.deviceKey || '',
        data.ipAddress || '',
        data.deviceName || data.device_type || '',
        status,
        data.appId || data.appid || '',
        data.version || '',
        data.packageName || data.p || '',
        data.appName || data.an || '',
        data.customerId || data.customerid || ''
      );
      return this.getConnectedUserById(result.lastInsertRowid as number)!;
    }
  },

  getConnectedUserByUsername(username: string): SqliteConnectedUser | null {
    const row = logsDb.prepare('SELECT * FROM connected_users WHERE username = ?').get(username);
    return row ? rowToConnectedUser(row) : null;
  },

  getConnectedUserById(id: number): SqliteConnectedUser | null {
    const row = logsDb.prepare('SELECT * FROM connected_users WHERE id = ?').get(id);
    return row ? rowToConnectedUser(row) : null;
  },

  deleteConnectedUser(id: number): void {
    logsDb.prepare('DELETE FROM connected_users WHERE id = ?').run(id);
  },

  createAccessLog(data: any): SqliteAccessLog {
    const result = logsDb.prepare(`
      INSERT INTO access_logs (customer_id, username, device_id, device_key, ip_address, action)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.customerId || data.userId || '',
      data.username || data.userId || '',
      data.deviceId || '',
      data.deviceKey || '',
      data.ipAddress || '',
      data.action || ''
    );
    const row = logsDb.prepare('SELECT * FROM access_logs WHERE id = ?').get(result.lastInsertRowid);
    return row as SqliteAccessLog;
  },

  getAccessLogs(): SqliteAccessLog[] {
    const rows = logsDb.prepare('SELECT * FROM access_logs ORDER BY timestamp DESC LIMIT 100').all();
    return rows as SqliteAccessLog[];
  },

  getAdminUser(): SqliteAdminUser | null {
    const row = mainDb.prepare('SELECT * FROM admin_users WHERE id = 1').get() as any;
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  },

  getAdminUserByUsername(username: string): SqliteAdminUser | null {
    const row = mainDb.prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as any;
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  },

  updateAdminPassword(username: string, passwordHash: string): void {
    mainDb.prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?').run(passwordHash, username);
  },

  createLoginAttempt(data: { attemptedUsername: string; ipAddress: string; userAgent: string }): void {
    mainDb.prepare(`
      INSERT INTO login_attempts (attempted_username, ip_address, user_agent)
      VALUES (?, ?, ?)
    `).run(data.attemptedUsername, data.ipAddress, data.userAgent);
  },

  getLoginAttempts(limit: number = 100, offset: number = 0): SqliteLoginAttempt[] {
    const rows = mainDb.prepare('SELECT * FROM login_attempts ORDER BY attempted_at DESC LIMIT ? OFFSET ?').all(limit, offset) as any[];
    return rows.map(row => ({
      id: row.id,
      attemptedUsername: row.attempted_username,
      ipAddress: row.ip_address || '',
      userAgent: row.user_agent || '',
      attemptedAt: row.attempted_at ? new Date(row.attempted_at) : null,
    }));
  },

  getLoginAttemptsCount(): number {
    const row = mainDb.prepare('SELECT COUNT(*) as count FROM login_attempts').get() as any;
    return row?.count || 0;
  },

  clearLoginAttempts(): void {
    mainDb.prepare('DELETE FROM login_attempts').run();
  },

  // Cloud Backup methods
  getCloudBackup(userId: string): { user: string; pass: string; resetcode: string | null; backup: string | null } | null {
    const row = backupDb.prepare('SELECT * FROM BACKUP WHERE user = ?').get(userId) as any;
    if (!row) return null;
    return {
      user: row.user,
      pass: row.pass,
      resetcode: row.resetcode,
      backup: row.backup,
    };
  },

  createCloudBackup(data: { user: string; pass: string; resetcode: string; backup: string }): void {
    backupDb.prepare(`
      INSERT INTO BACKUP (user, pass, resetcode, backup)
      VALUES (?, ?, ?, ?)
    `).run(data.user, data.pass, data.resetcode, data.backup);
  },

  updateCloudBackup(userId: string, backup: string): void {
    backupDb.prepare('UPDATE BACKUP SET backup = ? WHERE user = ?').run(backup, userId);
  },
};
