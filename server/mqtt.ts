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
}

// Map of username -> device connection
const connectedDevices = new Map<string, ConnectedDevice>();

// Map of clientId -> username for quick lookup
const clientToUsername = new Map<string, string>();

let aedes: Aedes | null = null;
let mqttServer: NetServer | null = null;

// Pending command responses - waiting for device to respond
interface PendingResponse {
  resolve: (response: string) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}
const pendingResponses = new Map<string, PendingResponse>();

// Mapping comandi xc-panel -> topic MQTT (suffisso)
const COMMAND_TO_TOPIC: Record<string, string> = {
  reset_players_settings: "resetplayer",
  reset_parental_password: "parentalpass",
  delete_cache: "deletedcache",
  get_info_dm: "getappinfo",
  restart_app: "restartapp",
  send_message: "msg",
};

// Mapping topic risposta -> topic comando (il device risponde su topic diversi)
const RESPONSE_TOPIC_MAP: Record<string, string> = {
  appinfo: "getappinfo",
};

// MQTT credentials expected by Android app (hardcoded in app)
const MQTT_USERNAME = "androidapp";
const MQTT_PASSWORD = "androidapp";

export function initMqttBroker(): Aedes {
  aedes = new Aedes({
    // Authentication handler
    authenticate: (client, username, password, callback) => {
      const passwordStr = password?.toString() || "";

      // Accept connections with correct credentials or no credentials (for testing)
      const authorized =
        (username === MQTT_USERNAME && passwordStr === MQTT_PASSWORD) ||
        (!username && !password); // Allow anonymous for testing

      callback(null, authorized);
    },
  });

  // Create TCP MQTT server on port 1883
  mqttServer = createServer(aedes.handle);
  const mqttPort = parseInt(process.env.MQTT_PORT || "1883", 10);

  mqttServer.listen(mqttPort, "0.0.0.0", () => {});

  aedes.on("client", (client) => {
    if (!client || !client.id) return;
    const clientId = client.id;
    const parts = clientId.split("/");
    if (parts.length >= 3) {
      const [customerId, username, deviceId] = parts;
      connectedDevices.set(username, {
        clientId, username, customerId, deviceId,
        deviceInfo: {}, connectedAt: new Date(), lastPing: new Date(),
      });
      clientToUsername.set(clientId, username);
    } else if (parts.length >= 2) {
      clientToUsername.set(clientId, clientId);
    }
  });

  aedes.on("clientDisconnect", (client) => {
    if (!client || !client.id) return;
    const username = clientToUsername.get(client.id);
    if (username) {
      connectedDevices.delete(username);
      clientToUsername.delete(client.id);
    }
  });

  // Handle published messages
  aedes.on("publish", (packet, client) => {
    if (!packet) return;

    const topic = packet.topic;
    const payload = packet.payload?.toString() || "";
    const clientId = client?.id || "broker";

    // Handle device status messages: client/status/android
    // Format: {cid}:{uid}---{json} OR {cid}:{uid}---disconnected
    if (topic === "client/status/android") {
      if (payload.includes("---{")) {
        const jsonStart = payload.indexOf("---{") + 3;
        handleDeviceStatus(clientId, payload.substring(jsonStart));
      } else if (!payload.includes("---disconnected")) {
        handleDeviceStatus(clientId, payload);
      }
    }

    // Handle OTTRUN/connectionslogs - also contains device info
    if (topic === "OTTRUN/connectionslogs") {
      handleDeviceStatus(clientId, payload);
    }

    // Check if this is a response to a pending command
    const topicParts = topic.split("/");
    if (topicParts.length === 3) {
      const [, username, responseTopic] = topicParts;
      // Map response topic to command topic if needed (e.g., appinfo -> getappinfo)
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

  return aedes;
}

function handleDeviceStatus(clientId: string, payload: string) {
  try {
    const data = JSON.parse(payload);
    const msg = data.msg || data;
    const username = msg.username || "";
    if (!username) return;

    const existingDevice = connectedDevices.get(username);
    if (existingDevice && existingDevice.clientId !== clientId) {
      clientToUsername.delete(existingDevice.clientId);
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
      connectedAt: existingDevice?.connectedAt || new Date(),
      lastPing: new Date(),
    });
    clientToUsername.set(clientId, username);
  } catch {
    // Ignore parse errors
  }
}

export function sendCommandAndWaitForResponse(
  username: string, command: string, additionalData?: any, timeoutMs: number = 10000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const device = connectedDevices.get(username);
    if (!device || !aedes) {
      reject(new Error(`Device ${username} not connected`));
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
    aedes.publish(
      { topic, payload: Buffer.from(JSON.stringify({ command, username, ...additionalData })), qos: 1, retain: false, cmd: "publish", dup: false },
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

  const topicSuffix = COMMAND_TO_TOPIC[command] || command;
  const topic = `${device.customerId}/${device.username}/${device.deviceId}/${topicSuffix}`;
  aedes.publish(
    { topic, payload: Buffer.from(JSON.stringify({ command, username, ...additionalData })), qos: 1, retain: false, cmd: "publish", dup: false },
    () => {}
  );
  return true;
}

// Send command to multiple users
export function sendCommandToUsers(
  usernames: string[],
  command: string,
  additionalData?: any
): { sent: string[]; failed: string[] } {
  const sent: string[] = [];
  const failed: string[] = [];

  usernames.forEach((username) => {
    if (sendCommandToUser(username, command, additionalData)) {
      sent.push(username);
    } else {
      failed.push(username);
    }
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

// Send a message to a specific user via MQTT
export function sendMessageToUser(username: string, message: string): boolean {
  const device = connectedDevices.get(username);
  if (!device || !aedes) return false;

  const topic = `${device.customerId}/${device.username}/${device.deviceId}/msg`;

  aedes.publish(
    {
      topic,
      payload: Buffer.from(message),
      qos: 0,
      retain: false,
      cmd: "publish",
      dup: false,
    },
    () => {}
  );
  return true;
}

// Send a message to multiple users
export function sendMessageToUsers(
  usernames: string[],
  message: string
): { sent: string[]; failed: string[] } {
  const sent: string[] = [];
  const failed: string[] = [];

  usernames.forEach((username) => {
    if (sendMessageToUser(username, message)) {
      sent.push(username);
    } else {
      failed.push(username);
    }
  });

  return { sent, failed };
}

// Broadcast a message to all connected devices
export function sendMessageToAll(message: string): number {
  let count = 0;
  connectedDevices.forEach((_, username) => {
    if (sendMessageToUser(username, message)) count++;
  });
  return count;
}

// Announcement parameters interface
export interface AnnouncementParams {
  message: string;
  status?: "ACTIVE" | "INACTIVE";
  expiration?: string; // format: "yyyy-MM-dd HH:mm:ss"
  displayInterval?: number; // 2, 5, 10, 15, 20, 30, 60 (minutes)
  disappearAfter?: number; // 1, 2, 3, 4, 5, 10 (seconds)
}

// Send an announcement to a specific user via MQTT
export function sendAnnouncementToUser(username: string, params: AnnouncementParams): boolean {
  const device = connectedDevices.get(username);
  if (!device || !aedes) return false;

  // Get appName from device info (keep spaces - app subscribes with spaces)
  const appName = device.deviceInfo.appName || "XCIPTV";

  // Topic format: {customerId}/ann/{appName}
  const topic = `${device.customerId}/ann/${appName}`;

  // Build announcement JSON payload (note: ann_interal is a typo in the original app)
  const payload = JSON.stringify({
    ann_announcement: params.message,
    ann_status: params.status || "ACTIVE",
    ann_expire: params.expiration || formatExpiration(2), // default 2 minutes from now
    ann_interal: String(params.displayInterval || 5), // typo is intentional - matches app
    ann_disappear: String(params.disappearAfter || 1),
  });

  // Debug logging
  console.log("[MQTT] Sending announcement:");
  console.log("[MQTT]   Topic:", topic);
  console.log("[MQTT]   Payload:", payload);

  aedes.publish(
    {
      topic,
      payload: Buffer.from(payload),
      qos: 0,
      retain: false,
      cmd: "publish",
      dup: false,
    },
    (err) => {
      if (err) {
        console.log("[MQTT] Publish error:", err);
      } else {
        console.log("[MQTT] Announcement published successfully to:", topic);
      }
    }
  );
  return true;
}

// Helper function to format expiration date
function formatExpiration(minutesFromNow: number): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutesFromNow);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Get list of connected devices
export function getConnectedDevices(): Array<{
  username: string;
  customerId: string;
  deviceInfo: ConnectedDevice["deviceInfo"];
  connectedAt: Date;
  lastPing: Date;
}> {
  return Array.from(connectedDevices.values()).map((device) => ({
    username: device.username,
    customerId: device.customerId,
    deviceInfo: device.deviceInfo,
    connectedAt: device.connectedAt,
    lastPing: device.lastPing,
  }));
}

// Check if a specific user is connected
export function isUserConnected(username: string): boolean {
  return connectedDevices.has(username);
}

// Get MQTT connection stats (same interface as WebSocket for compatibility)
export function getWebSocketStats(): { total: number; connected: number } {
  return {
    total: connectedDevices.size,
    connected: connectedDevices.size,
  };
}

// Get the Aedes instance
export function getAedes(): Aedes | null {
  return aedes;
}

// Available remote commands (same as before for API compatibility)
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
        if (aedes) {
          aedes.close(() => resolve());
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}
