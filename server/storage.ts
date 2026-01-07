import { sqliteStorage } from "./sqlite-storage";
import type {
  SqliteSettings,
  SqliteAnnouncement,
  SqliteMessage,
  SqliteGlobalMessage,
  SqliteVpnServer,
  SqliteConnectedUser,
  SqliteAccessLog,
  SqliteAdminUser,
  SqliteLoginAttempt,
} from "./sqlite-storage";

export interface IStorage {
  getSettings(): SqliteSettings | null;
  updateSettings(data: Partial<SqliteSettings>): SqliteSettings;
  initializeSettings(): SqliteSettings;
  
  getAnnouncement(): SqliteAnnouncement | undefined;
  getAnnouncements(): SqliteAnnouncement[];
  createAnnouncement(data: any): SqliteAnnouncement;
  updateAnnouncement(data: any): SqliteAnnouncement;
  deleteAnnouncement(id: number): void;
  
  getMessages(): SqliteMessage[];
  getMessage(id: number): SqliteMessage | undefined;
  createMessage(data: any): SqliteMessage;
  updateMessage(id: number, data: any): SqliteMessage | undefined;
  deleteMessage(id: number): void;
  getMessageByUserId(userId: string): SqliteMessage | undefined;
  
  getGlobalMessage(): SqliteGlobalMessage | undefined;
  updateGlobalMessage(data: any): SqliteGlobalMessage;
  
  getVpnServers(): SqliteVpnServer[];
  getVpnServer(id: number): SqliteVpnServer | undefined;
  createVpnServer(data: any): SqliteVpnServer;
  updateVpnServer(id: number, data: any): SqliteVpnServer | undefined;
  deleteVpnServer(id: number): void;
  
  getConnectedUsers(): SqliteConnectedUser[];
  deleteConnectedUser(id: number): void;
  getOnlineUsersCount(): number;
  getTotalUsersCount(): number;
  upsertConnectedUser(data: any): void;
  
  getAccessLogs(): SqliteAccessLog[];
  getAccessLogIpByUsername(username: string): string | null;
  createAccessLog(data: any): void;
  
  getAdminUser(): SqliteAdminUser | null;
  getAdminUserByUsername(username: string): SqliteAdminUser | null;
  updateAdminPassword(username: string, passwordHash: string): void;
  createLoginAttempt(data: { attemptedUsername: string; ipAddress: string; userAgent: string }): void;
  getLoginAttempts(limit?: number, offset?: number): SqliteLoginAttempt[];
  getLoginAttemptsCount(): number;
  clearLoginAttempts(): void;
  
  // Cloud Backup
  getCloudBackup(userId: string): { user: string; pass: string; resetcode: string | null; backup: string | null } | null;
  createCloudBackup(data: { user: string; pass: string; resetcode: string; backup: string }): void;
  updateCloudBackup(userId: string, backup: string): void;
}

class SqliteStorageImpl implements IStorage {
  getSettings(): SqliteSettings | null {
    return sqliteStorage.getSettings();
  }

  updateSettings(data: Partial<SqliteSettings>): SqliteSettings {
    return sqliteStorage.updateSettings(data);
  }

  initializeSettings(): SqliteSettings {
    const existing = this.getSettings();
    if (existing) return existing;
    return sqliteStorage.updateSettings({});
  }

  getAnnouncement(): SqliteAnnouncement | undefined {
    const announcements = sqliteStorage.getAnnouncements();
    return announcements[0];
  }

  getAnnouncements(): SqliteAnnouncement[] {
    return sqliteStorage.getAnnouncements();
  }

  createAnnouncement(data: any): SqliteAnnouncement {
    return sqliteStorage.createAnnouncement(data);
  }

  updateAnnouncement(data: any): SqliteAnnouncement {
    const existing = this.getAnnouncement();
    if (existing) {
      return sqliteStorage.updateAnnouncement(existing.id, data);
    }
    return sqliteStorage.createAnnouncement(data);
  }

  deleteAnnouncement(id: number): void {
    sqliteStorage.deleteAnnouncement(id);
  }

  getMessages(): SqliteMessage[] {
    return sqliteStorage.getMessages();
  }

  getMessage(id: number): SqliteMessage | undefined {
    return sqliteStorage.getMessageById(id) || undefined;
  }

  createMessage(data: any): SqliteMessage {
    return sqliteStorage.createMessage(data);
  }

  updateMessage(id: number, data: any): SqliteMessage | undefined {
    return sqliteStorage.updateMessage(id, data) || undefined;
  }

  deleteMessage(id: number): void {
    sqliteStorage.deleteMessage(id);
  }

  getMessageByUserId(userId: string): SqliteMessage | undefined {
    const messages = sqliteStorage.getMessages();
    return messages.find(m => m.username === userId);
  }

  getGlobalMessage(): SqliteGlobalMessage | undefined {
    return sqliteStorage.getGlobalMessage() || undefined;
  }

  updateGlobalMessage(data: any): SqliteGlobalMessage {
    return sqliteStorage.updateGlobalMessage(data);
  }

  getVpnServers(): SqliteVpnServer[] {
    return sqliteStorage.getVpnServers();
  }

  getVpnServer(id: number): SqliteVpnServer | undefined {
    return sqliteStorage.getVpnServerById(id) || undefined;
  }

  createVpnServer(data: any): SqliteVpnServer {
    return sqliteStorage.createVpnServer(data);
  }

  updateVpnServer(id: number, data: any): SqliteVpnServer | undefined {
    return sqliteStorage.updateVpnServer(id, data) || undefined;
  }

  deleteVpnServer(id: number): void {
    sqliteStorage.deleteVpnServer(id);
  }

  getConnectedUsers(): SqliteConnectedUser[] {
    return sqliteStorage.getConnectedUsers();
  }

  deleteConnectedUser(id: number): void {
    sqliteStorage.deleteConnectedUser(id);
  }

  getOnlineUsersCount(): number {
    return sqliteStorage.getConnectedUsers().filter(u => u.status === 'ACTIVE').length;
  }

  getTotalUsersCount(): number {
    return sqliteStorage.getConnectedUsers().length;
  }

  upsertConnectedUser(data: any): SqliteConnectedUser {
    return sqliteStorage.upsertConnectedUser(data);
  }

  getAccessLogs(): SqliteAccessLog[] {
    return sqliteStorage.getAccessLogs();
  }

  getAccessLogIpByUsername(username: string): string | null {
    return sqliteStorage.getAccessLogIpByUsername(username);
  }

  createAccessLog(data: any): void {
    sqliteStorage.createAccessLog(data);
  }

  getAdminUser(): SqliteAdminUser | null {
    return sqliteStorage.getAdminUser();
  }

  getAdminUserByUsername(username: string): SqliteAdminUser | null {
    return sqliteStorage.getAdminUserByUsername(username);
  }

  updateAdminPassword(username: string, passwordHash: string): void {
    sqliteStorage.updateAdminPassword(username, passwordHash);
  }

  createLoginAttempt(data: { attemptedUsername: string; ipAddress: string; userAgent: string }): void {
    sqliteStorage.createLoginAttempt(data);
  }

  getLoginAttempts(limit: number = 100, offset: number = 0): SqliteLoginAttempt[] {
    return sqliteStorage.getLoginAttempts(limit, offset);
  }

  getLoginAttemptsCount(): number {
    return sqliteStorage.getLoginAttemptsCount();
  }

  clearLoginAttempts(): void {
    sqliteStorage.clearLoginAttempts();
  }

  // Cloud Backup methods
  getCloudBackup(userId: string): { user: string; pass: string; resetcode: string | null; backup: string | null } | null {
    return sqliteStorage.getCloudBackup(userId);
  }

  createCloudBackup(data: { user: string; pass: string; resetcode: string; backup: string }): void {
    sqliteStorage.createCloudBackup(data);
  }

  updateCloudBackup(userId: string, backup: string): void {
    sqliteStorage.updateCloudBackup(userId, backup);
  }
}

export const storage = new SqliteStorageImpl();
