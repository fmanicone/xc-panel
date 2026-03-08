import Aedes from "aedes";
import { createServer, Server as NetServer } from "net";

interface ConnectedDevice {
  clientId: string;
  username: string;
  customerId: string;
  deviceId: string;
  deviceInfo: {
    appName?: string;
    version?: string;
    model?: string;
    packageName?: string;
    ip?: string;
    agent?: string;
  };
  connectedAt: Date;
  lastPing: Date;
  hasSubscribed: boolean;
}

const connectedDevices = new Map<string, ConnectedDevice>();
const clientToUsername = new Map<string, string>();

let aedes: Aedes | null = null;
let mqttServer: NetServer | null = null;

interface PendingResponse {
  resolve: (response: string) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}
const pendingResponses = new Map<string, PendingResponse>();

const COMMAND_TO_TOPIC: Record<string, string> = {
  reset_players_settings: "resetplayer",
  reset_parental_password: "parentalpass",
  delete_cache: "deletedcache",
  get_info_dm: "getappinfo",
  restart_app: "restartapp",
  send_message: "msg",
};

const RESPONSE_TOPIC_MAP: Record<string, string> = {
  appinfo: "getappinfo",
};

const MQTT_USERNAME = "androidapp";
const MQTT_PASSWORD = "androidapp";

// Helper: check if a client is still in Aedes, clean up if not
function verifyClient(username: string, device: ConnectedDevice): boolean {
  if (!aedes) return false;
  const clients = (aedes as any).clients;
  if (!clients || !clients[device.clientId]) {
    connectedDevices.delete(username);
    clientToUsername.delete(device.clientId);
    return false;
  }
  return true;
}

function removeDevice(clientId: string) {
  const username = clientToUsername.get(clientId);
  if (username) {
    connectedDevices.delete(username);
    clientToUsername.delete(clientId);
  }
}

export function initMqttBroker(): Aedes {
  aedes = new Aedes({
    heartbeatInterval: 60000,
    connectTimeout: 30000,
    authenticate: (client, username, password, callback) => {
      const passwordStr = password?.toString() || "";
      const authorized =
        (username === MQTT_USERNAME && passwordStr === MQTT_PASSWORD) ||
        (!username && !password);
      callback(null, authorized);
    },
  });

  // TCP server with keepalive to detect dead connections
  mqttServer = createServer((socket) => {
    socket.setKeepAlive(true, 30000);
    socket.setTimeout(120000);
    socket.on("timeout", () => socket.destroy());
    aedes!.handle(socket);
  });

  const mqttPort = parseInt(process.env.MQTT_PORT || "1883", 10);
  mqttServer.listen(mqttPort, "0.0.0.0", () => {
    console.log(`[MQTT] Broker listening on port ${mqttPort}`);
  });

  mqttServer.on("error", (err) => {
    console.error(`[MQTT] TCP server error: ${err.message}`);
  });

  // Error handlers
  aedes.on("clientError", (client, err) => {
    console.log(`[MQTT] Client error ${client?.id || "unknown"}: ${err.message}`);
  });

  aedes.on("connectionError", (client, err) => {
    console.log(`[MQTT] Connection error ${client?.id || "unknown"}: ${err.message}`);
  });

  aedes.on("keepaliveTimeout", (client) => {
    console.log(`[MQTT] Keepalive timeout: ${client?.id || "unknown"}`);
    if (client?.id) removeDevice(client.id);
  });

  // Track PINGREQ to update lastPing
  aedes.on("ping", (_packet, client) => {
    if (!client?.id) return;
    const username = clientToUsername.get(client.id);
    if (username) {
      const device = connectedDevices.get(username);
      if (device) device.lastPing = new Date();
    }
  });

  // Track subscriptions to mark devices as ready for commands
  aedes.on("subscribe", (subscriptions, client) => {
    if (!client?.id) return;
    const username = clientToUsername.get(client.id);
    if (username) {
      const device = connectedDevices.get(username);
      if (device && !device.hasSubscribed) {
        device.hasSubscribed = true;
        console.log(`[MQTT] Device ${username} ready for commands`);
      }
    }
  });

  // Client connect
  aedes.on("client", (client) => {
    if (!client?.id) return;
    const parts = client.id.split("/");
    if (parts.length >= 3) {
      const [customerId, username, deviceId] = parts;
      connectedDevices.set(username, {
        clientId: client.id, username, customerId, deviceId,
        deviceInfo: {}, connectedAt: new Date(), lastPing: new Date(),
        hasSubscribed: false,
      });
      clientToUsername.set(client.id, username);
      console.log(`[MQTT] Device connected: ${username} (customer: ${customerId})`);
    } else if (parts.length >= 2) {
      clientToUsername.set(client.id, client.id);
    }
  });

  // Client disconnect
  aedes.on("clientDisconnect", (client) => {
    if (!client?.id) return;
    const username = clientToUsername.get(client.id);
    console.log(`[MQTT] Device disconnected: ${username || client.id}`);
    removeDevice(client.id);
  });

  // Handle published messages
  aedes.on("publish", (packet, client) => {
    if (!packet) return;
    const topic = packet.topic;
    const payload = packet.payload?.toString() || "";
    const clientId = client?.id || "broker";

    // Device status messages
    if (topic === "client/status/android") {
      if (payload.includes("---{")) {
        handleDeviceStatus(clientId, payload.substring(payload.indexOf("---{") + 3));
      } else if (!payload.includes("---disconnected")) {
        handleDeviceStatus(clientId, payload);
      }
    }

    if (topic === "OTTRUN/connectionslogs") {
      handleDeviceStatus(clientId, payload);
    }

    // Command responses
    const topicParts = topic.split("/");
    if (topicParts.length === 3) {
      const [, username, responseTopic] = topicParts;
      const commandTopic = RESPONSE_TOPIC_MAP[responseTopic] || responseTopic;
      const pendingKey = `${username}:${commandTopic}`;
      const pending = pendingResponses.get(pendingKey);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingResponses.delete(pendingKey);
        pending.resolve(payload);
      }
    }
  });

  // Periodic cleanup of stale connections (every 2 minutes)
  setInterval(() => {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000;
    let cleaned = 0;

    connectedDevices.forEach((device, username) => {
      if (now - device.lastPing.getTime() > staleThreshold) {
        console.log(`[MQTT] Cleaning stale device: ${username}`);
        const clients = (aedes as any).clients;
        if (clients?.[device.clientId]) clients[device.clientId].close();
        connectedDevices.delete(username);
        clientToUsername.delete(device.clientId);
        cleaned++;
      }
    });

    if (cleaned > 0) console.log(`[MQTT] Cleaned ${cleaned} stale connections`);
  }, 120000);

  return aedes;
}

function handleDeviceStatus(clientId: string, payload: string) {
  try {
    const data = JSON.parse(payload);
    const msg = data.msg || data;
    const username = msg.username || "";
    if (!username) return;

    const existing = connectedDevices.get(username);
    if (existing && existing.clientId !== clientId) {
      clientToUsername.delete(existing.clientId);
    }

    connectedDevices.set(username, {
      clientId, username,
      customerId: msg.cid || "",
      deviceId: msg.uid || "",
      deviceInfo: {
        appName: msg.appname || msg.package,
        version: msg.ver,
        model: msg.model,
        packageName: msg.package,
        ip: msg.ip,
        agent: msg.agent || msg.player_agent,
      },
      connectedAt: existing?.connectedAt || new Date(),
      lastPing: new Date(),
      hasSubscribed: existing?.hasSubscribed || false,
    });
    clientToUsername.set(clientId, username);
  } catch {
    // Ignore parse errors
  }
}

// --- Command functions ---

export function sendCommandAndWaitForResponse(
  username: string, command: string, additionalData?: any, timeoutMs: number = 10000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const device = connectedDevices.get(username);
    if (!device || !aedes) {
      reject(new Error(`Device ${username} not connected`));
      return;
    }

    if (!verifyClient(username, device)) {
      reject(new Error(`Device ${username} not connected (stale)`));
      return;
    }

    const topicSuffix = COMMAND_TO_TOPIC[command] || command;
    const pendingKey = `${username}:${topicSuffix}`;
    const timeout = setTimeout(() => {
      pendingResponses.delete(pendingKey);
      reject(new Error(`Timeout waiting for response from ${username}`));
    }, timeoutMs);

    pendingResponses.set(pendingKey, { resolve, reject, timeout });

    const topic = `${device.customerId}/${device.username}/${device.deviceId}/${topicSuffix}`;
    const payload = JSON.stringify({ command, username, ...additionalData });
    aedes.publish(
      { topic, payload: Buffer.from(payload), qos: 1, retain: false, cmd: "publish", dup: false },
      (err) => {
        if (err) {
          clearTimeout(timeout);
          pendingResponses.delete(pendingKey);
          reject(new Error(`Failed to send command: ${err.message}`));
        }
      }
    );
  });
}

export function sendCommandToUser(username: string, command: string, additionalData?: any): boolean {
  const device = connectedDevices.get(username);
  if (!device || !aedes) return false;
  if (!verifyClient(username, device)) return false;

  const topicSuffix = COMMAND_TO_TOPIC[command] || command;
  const topic = `${device.customerId}/${device.username}/${device.deviceId}/${topicSuffix}`;
  aedes.publish(
    { topic, payload: Buffer.from(JSON.stringify({ command, username, ...additionalData })), qos: 1, retain: false, cmd: "publish", dup: false },
    () => {}
  );
  return true;
}

export function sendCommandToUsers(
  usernames: string[], command: string, additionalData?: any
): { sent: string[]; failed: string[] } {
  const sent: string[] = [];
  const failed: string[] = [];
  usernames.forEach((username) => {
    (sendCommandToUser(username, command, additionalData) ? sent : failed).push(username);
  });
  return { sent, failed };
}

export function sendCommandToAll(command: string, additionalData?: any): number {
  let count = 0;
  connectedDevices.forEach((_, username) => {
    if (sendCommandToUser(username, command, additionalData)) count++;
  });
  return count;
}

// --- Message functions ---

export function sendMessageToUser(username: string, message: string): boolean {
  const device = connectedDevices.get(username);
  if (!device || !aedes) return false;

  const topic = `${device.customerId}/${device.username}/${device.deviceId}/msg`;
  aedes.publish(
    { topic, payload: Buffer.from(message), qos: 0, retain: false, cmd: "publish", dup: false },
    () => {}
  );
  return true;
}

export function sendMessageToUsers(
  usernames: string[], message: string
): { sent: string[]; failed: string[] } {
  const sent: string[] = [];
  const failed: string[] = [];
  usernames.forEach((username) => {
    (sendMessageToUser(username, message) ? sent : failed).push(username);
  });
  return { sent, failed };
}

export function sendMessageToAll(message: string): number {
  let count = 0;
  connectedDevices.forEach((_, username) => {
    if (sendMessageToUser(username, message)) count++;
  });
  return count;
}

// --- Announcement functions ---

export interface AnnouncementParams {
  message: string;
  status?: "ACTIVE" | "INACTIVE";
  expiration?: string;
  displayInterval?: number;
  disappearAfter?: number;
}

export function sendAnnouncementToUser(username: string, params: AnnouncementParams): boolean {
  const device = connectedDevices.get(username);
  if (!device || !aedes) return false;

  const appName = device.deviceInfo.appName || "XCIPTV";
  const topic = `${device.customerId}/ann/${appName}`;

  // ann_interal typo is intentional - matches the app
  const payload = JSON.stringify({
    ann_announcement: params.message,
    ann_status: params.status || "ACTIVE",
    ann_expire: params.expiration || formatExpiration(2),
    ann_interal: String(params.displayInterval || 5),
    ann_disappear: String(params.disappearAfter || 1),
  });

  aedes.publish(
    { topic, payload: Buffer.from(payload), qos: 0, retain: false, cmd: "publish", dup: false },
    () => {}
  );
  return true;
}

function formatExpiration(minutesFromNow: number): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutesFromNow);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// --- Query functions ---

export function getConnectedDevices(): Array<{
  username: string;
  customerId: string;
  deviceInfo: ConnectedDevice["deviceInfo"];
  connectedAt: Date;
  lastPing: Date;
}> {
  const clients = aedes ? (aedes as any).clients : null;
  const result: Array<{
    username: string;
    customerId: string;
    deviceInfo: ConnectedDevice["deviceInfo"];
    connectedAt: Date;
    lastPing: Date;
  }> = [];

  connectedDevices.forEach((device, username) => {
    if (clients && !clients[device.clientId]) {
      connectedDevices.delete(username);
      clientToUsername.delete(device.clientId);
      return;
    }
    result.push({
      username: device.username,
      customerId: device.customerId,
      deviceInfo: device.deviceInfo,
      connectedAt: device.connectedAt,
      lastPing: device.lastPing,
    });
  });

  return result;
}

export function isUserConnected(username: string): boolean {
  const device = connectedDevices.get(username);
  if (!device) return false;
  return verifyClient(username, device);
}

export function isUserReady(username: string): boolean {
  const device = connectedDevices.get(username);
  if (!device || !device.hasSubscribed) return false;
  return verifyClient(username, device);
}

export function getWebSocketStats(): { total: number; connected: number } {
  return { total: connectedDevices.size, connected: connectedDevices.size };
}

export function getAedes(): Aedes | null {
  return aedes;
}

export const REMOTE_COMMANDS = {
  RESET_PLAYERS_SETTINGS: "reset_players_settings",
  RESET_PARENTAL_PASSWORD: "reset_parental_password",
  DELETE_CACHE: "delete_cache",
  GET_INFO_DM: "get_info_dm",
  SEND_MESSAGE: "send_message",
} as const;

export type RemoteCommand = (typeof REMOTE_COMMANDS)[keyof typeof REMOTE_COMMANDS];

export function closeMqttBroker(): Promise<void> {
  return new Promise((resolve) => {
    if (mqttServer) {
      mqttServer.close(() => {
        if (aedes) aedes.close(() => resolve());
        else resolve();
      });
    } else {
      resolve();
    }
  });
}
