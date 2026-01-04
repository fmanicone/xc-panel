import { api, buildUrl } from "@shared/routes";
import type { 
  Settings, 
  Announcement, 
  Message, 
  GlobalMessage, 
  VpnServer, 
  ConnectedUser 
} from "@shared/schema";

const BASE_URL = "";

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE_URL + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

// Settings
export async function getSettings(): Promise<Settings> {
  return fetchApi(api.settings.get.path);
}

export async function updateSettings(data: Partial<Settings>): Promise<Settings> {
  return fetchApi(api.settings.update.path, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Announcements
export async function getAnnouncement(): Promise<Announcement> {
  return fetchApi(api.announcements.get.path);
}

export async function updateAnnouncement(data: Partial<Announcement>): Promise<Announcement> {
  return fetchApi(api.announcements.update.path, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Messages
export async function getMessages(): Promise<Message[]> {
  return fetchApi(api.messages.list.path);
}

export async function createMessage(data: Partial<Message>): Promise<Message> {
  return fetchApi(api.messages.create.path, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMessage(id: number, data: Partial<Message>): Promise<Message> {
  return fetchApi(buildUrl(api.messages.update.path, { id }), {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMessage(id: number): Promise<void> {
  return fetchApi(buildUrl(api.messages.delete.path, { id }), {
    method: "DELETE",
  });
}

// Global Message
export async function getGlobalMessage(): Promise<GlobalMessage> {
  return fetchApi(api.globalMessage.get.path);
}

export async function updateGlobalMessage(data: Partial<GlobalMessage>): Promise<GlobalMessage> {
  return fetchApi(api.globalMessage.update.path, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// VPN Servers
export async function getVpnServers(): Promise<VpnServer[]> {
  return fetchApi(api.vpnServers.list.path);
}

export async function createVpnServer(data: Partial<VpnServer>): Promise<VpnServer> {
  return fetchApi(api.vpnServers.create.path, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateVpnServer(id: number, data: Partial<VpnServer>): Promise<VpnServer> {
  return fetchApi(api.vpnServers.update.path.replace(':id', String(id)), {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteVpnServer(id: number): Promise<void> {
  return fetchApi(buildUrl(api.vpnServers.delete.path, { id }), {
    method: "DELETE",
  });
}

// Connected Users
export async function getConnectedUsers(): Promise<ConnectedUser[]> {
  return fetchApi(api.connectedUsers.list.path);
}

export async function getConnectedUsersStats(): Promise<{ total: number; online: number }> {
  return fetchApi(api.connectedUsers.stats.path);
}

export async function deleteConnectedUser(id: number): Promise<void> {
  return fetchApi(buildUrl(api.connectedUsers.delete.path, { id }), {
    method: "DELETE",
  });
}

// Access Logs
export async function getAccessLogs(): Promise<any[]> {
  return fetchApi(api.logs.list.path);
}
