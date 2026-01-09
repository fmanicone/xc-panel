import Aedes from "aedes";
import { createServer, Server as NetServer } from "net";
import { Server } from "http";
import { log } from "./index";

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
};

// MQTT credentials expected by Android app (hardcoded in app)
const MQTT_USERNAME = "androidapp";
const MQTT_PASSWORD = "androidapp";

export function initMqttBroker(httpServer?: Server): Aedes {
  aedes = new Aedes({
    // Authentication handler
    authenticate: (client, username, password, callback) => {
      const passwordStr = password?.toString() || "";

      // Accept connections with correct credentials or no credentials (for testing)
      const authorized =
        (username === MQTT_USERNAME && passwordStr === MQTT_PASSWORD) ||
        (!username && !password); // Allow anonymous for testing

      if (authorized) {
        log(`MQTT auth success for client ${client.id} (user: ${username || "anonymous"})`, "mqtt");
        callback(null, true);
      } else {
        log(`MQTT auth failed for client ${client.id} (user: ${username})`, "mqtt");
        callback(null, false);
      }
    },
  });

  // Create TCP MQTT server on port 1883
  mqttServer = createServer(aedes.handle);
  const mqttPort = parseInt(process.env.MQTT_PORT || "1883", 10);

  mqttServer.listen(mqttPort, "0.0.0.0", () => {
    log(`MQTT broker listening on port ${mqttPort}`, "mqtt");
  });

  // Handle client connection
  aedes.on("client", (client) => {
    if (!client || !client.id) return;

    const clientId = client.id;
    log(`MQTT client connected: ${clientId}`, "mqtt");

    // Client ID format from Android app: {customerid}/{username}/{deviceid}
    // Example: 2002/rifinovec/ed9cf67a-9e5f-3f09-87c4-65439b34a9a7
    const parts = clientId.split("/");
    if (parts.length >= 3) {
      const customerId = parts[0];
      const username = parts[1];
      const deviceId = parts[2];

      // Register device provisionally
      const device: ConnectedDevice = {
        clientId,
        username,
        customerId,
        deviceId,
        deviceInfo: {},
        connectedAt: new Date(),
        lastPing: new Date(),
      };

      connectedDevices.set(username, device);
      clientToUsername.set(clientId, username);
      log(`Device registered from client ID: ${username} (${deviceId})`, "mqtt");
    } else if (parts.length >= 2) {
      // Fallback for old format: {customerid}/{deviceid}
      const customerId = parts[0];
      const deviceId = parts[1];
      clientToUsername.set(clientId, clientId);
    }
  });

  // Handle client disconnect
  aedes.on("clientDisconnect", (client) => {
    if (!client || !client.id) return;

    const clientId = client.id;
    const username = clientToUsername.get(clientId);

    if (username) {
      connectedDevices.delete(username);
      clientToUsername.delete(clientId);
      log(`MQTT client disconnected: ${clientId} (username: ${username})`, "mqtt");
    } else {
      log(`MQTT client disconnected: ${clientId}`, "mqtt");
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
      if (payload.includes("---disconnected")) {
        const parts = payload.replace("---disconnected", "").split(":");
        if (parts.length >= 2) {
          log(`Will message received: device ${parts[1]} disconnected`, "mqtt");
        }
      } else if (payload.includes("---{")) {
        // Format: 2002:deviceid---{"appname":...}
        const jsonStart = payload.indexOf("---{") + 3;
        const jsonPayload = payload.substring(jsonStart);
        handleDeviceStatus(clientId, jsonPayload);
      } else {
        // Try parsing as pure JSON
        handleDeviceStatus(clientId, payload);
      }
    }

    // Handle OTTRUN/connectionslogs - also contains device info
    if (topic === "OTTRUN/connectionslogs") {
      handleDeviceStatus(clientId, payload);
    }

    // Don't log system messages ($SYS topics) or empty payloads
    if (!topic.startsWith("$") && payload) {
      log(`MQTT publish on ${topic} from ${clientId}: ${payload.substring(0, 200)}`, "mqtt");
    }

    // Check if this is a response to a pending command
    // Response topic format: {cid}/{username}/{commandTopic}
    const topicParts = topic.split("/");
    if (topicParts.length === 3) {
      const [cid, username, commandTopic] = topicParts;
      const pendingKey = `${username}:${commandTopic}`;
      const pending = pendingResponses.get(pendingKey);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingResponses.delete(pendingKey);
        pending.resolve(payload);
        log(`Command response received for ${pendingKey}: ${payload.substring(0, 100)}`, "mqtt");
      }
    }
  });

  // Handle subscriptions
  aedes.on("subscribe", (subscriptions, client) => {
    if (!client) return;
    const topics = subscriptions.map((s) => s.topic).join(", ");
    log(`MQTT client ${client.id} subscribed to: ${topics}`, "mqtt");
  });

  // Handle errors
  aedes.on("clientError", (client, err) => {
    log(`MQTT client error (${client?.id}): ${err.message}`, "mqtt");
  });

  log("MQTT broker initialized", "mqtt");
  return aedes;
}

// Handle device status message from Android app
// Topic: client/status/android
// Payload: { "msg": { "appname", "username", "ver", "uid", "cid", "ip", "agent", "package", "os_ver", "model", "time" } }
function handleDeviceStatus(clientId: string, payload: string) {
  try {
    const data = JSON.parse(payload);
    const msg = data.msg || data;

    const username = msg.username || "";
    const customerId = msg.cid || "";
    const deviceId = msg.uid || "";

    if (!username) {
      log(`Device status missing username from ${clientId}`, "mqtt");
      return;
    }

    // Remove old connection if exists with different clientId
    const existingDevice = connectedDevices.get(username);
    if (existingDevice && existingDevice.clientId !== clientId) {
      clientToUsername.delete(existingDevice.clientId);
    }

    const device: ConnectedDevice = {
      clientId,
      username,
      customerId,
      deviceId,
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
    };

    connectedDevices.set(username, device);
    clientToUsername.set(clientId, username);

    log(`Device registered via status: ${username} (${device.deviceInfo.model || "unknown"})`, "mqtt");
  } catch (err) {
    log(`Error parsing device status: ${err}`, "mqtt");
  }
}

// Send command and wait for device response
export function sendCommandAndWaitForResponse(
  username: string,
  command: string,
  additionalData?: any,
  timeoutMs: number = 10000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const device = connectedDevices.get(username);

    if (!device || !aedes) {
      reject(new Error(`Device ${username} not connected`));
      return;
    }

    // Get the topic suffix for this command
    const topicSuffix = COMMAND_TO_TOPIC[command] || command;
    const pendingKey = `${username}:${topicSuffix}`;

    // Set timeout
    const timeout = setTimeout(() => {
      pendingResponses.delete(pendingKey);
      reject(new Error(`Timeout waiting for response from ${username}`));
    }, timeoutMs);

    // Register pending response
    pendingResponses.set(pendingKey, { resolve, reject, timeout });

    // Send the command
    const topic = `${device.customerId}/${device.username}/${device.deviceId}/${topicSuffix}`;
    const payload = JSON.stringify({
      command,
      username,
      ...additionalData,
    });

    aedes.publish(
      {
        topic,
        payload: Buffer.from(payload),
        qos: 1,
        retain: false,
        cmd: "publish",
        dup: false,
      },
      (err) => {
        if (err) {
          clearTimeout(timeout);
          pendingResponses.delete(pendingKey);
          reject(new Error(`Failed to send command: ${err.message}`));
        }
      }
    );

    log(`Command sent to ${username}, waiting for response...`, "mqtt");
  });
}

// Send command to a specific user
export function sendCommandToUser(username: string, command: string, additionalData?: any): boolean {
  const device = connectedDevices.get(username);

  if (!device || !aedes) {
    log(`Cannot send command to ${username}: device not connected`, "mqtt");
    return false;
  }

  // Get the topic suffix for this command
  const topicSuffix = COMMAND_TO_TOPIC[command] || command;

  // Topic format: {customerid}/{username}/{did}/{command}
  // App subscribes to: 2002/casafilippo/64463f7d-2682-3edc-a30e-1dd12732abf9/#
  const topic = `${device.customerId}/${device.username}/${device.deviceId}/${topicSuffix}`;

  // Publish command
  const payload = JSON.stringify({
    command,
    username,
    ...additionalData,
  });

  aedes.publish(
    {
      topic,
      payload: Buffer.from(payload),
      qos: 1,
      retain: false,
      cmd: "publish",
      dup: false,
    },
    (err) => {
      if (err) {
        log(`Error publishing to ${topic}: ${err}`, "mqtt");
      }
    }
  );

  log(`Command sent to ${username} on topic ${topic}: ${command}`, "mqtt");
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

// Send command to all connected devices
export function sendCommandToAll(command: string, additionalData?: any): number {
  let count = 0;

  connectedDevices.forEach((device, username) => {
    if (sendCommandToUser(username, command, additionalData)) {
      count++;
    }
  });

  log(`Command broadcast to ${count} devices: ${command}`, "mqtt");
  return count;
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
} as const;

export type RemoteCommand = (typeof REMOTE_COMMANDS)[keyof typeof REMOTE_COMMANDS];

// Cleanup function
export function closeMqttBroker(): Promise<void> {
  return new Promise((resolve) => {
    if (mqttServer) {
      mqttServer.close(() => {
        if (aedes) {
          aedes.close(() => {
            log("MQTT broker closed", "mqtt");
            resolve();
          });
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}
