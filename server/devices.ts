// Combined device management for both Socket.IO and MQTT connections
import * as websocket from "./websocket";
import * as mqtt from "./mqtt";
import { log } from "./index";

export async function sendCommandAndWaitForResponse(
  username: string, command: string, additionalData?: any, timeoutMs: number = 10000
): Promise<string> {
  if (websocket.isUserConnected(username)) {
    log(`Sending command via Socket.IO to ${username} and waiting for response`, "devices");
    return websocket.sendCommandAndWaitForResponse(username, command, additionalData, timeoutMs);
  }

  if (mqtt.isUserReady(username)) {
    log(`Sending command via MQTT to ${username} and waiting for response`, "devices");
    return mqtt.sendCommandAndWaitForResponse(username, command, additionalData, timeoutMs);
  }

  if (mqtt.isUserConnected(username)) {
    throw new Error(`Device ${username} connected via MQTT but not ready (no subscribe)`);
  }

  throw new Error(`Device ${username} not connected`);
}

export function sendCommandToUser(username: string, command: string, additionalData?: any): boolean {
  if (websocket.isUserConnected(username)) {
    log(`Sending command via Socket.IO to ${username}`, "devices");
    return websocket.sendCommandToUser(username, command, additionalData);
  }

  if (mqtt.isUserReady(username)) {
    log(`Sending command via MQTT to ${username}`, "devices");
    return mqtt.sendCommandToUser(username, command, additionalData);
  }

  const reason = mqtt.isUserConnected(username)
    ? "connected via MQTT but not subscribed" : "not connected";
  log(`Cannot send command to ${username}: ${reason}`, "devices");
  return false;
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
  return websocket.sendCommandToAll(command, additionalData) +
    mqtt.sendCommandToAll(command, additionalData);
}

export function getConnectedDevices(): Array<{
  username: string; customerId: string; deviceInfo: any;
  connectedAt: Date; lastPing: Date; protocol: "socket.io" | "mqtt";
}> {
  const socketDevices = websocket.getConnectedDevices().map((d) => ({
    ...d, protocol: "socket.io" as const,
  }));

  const mqttDevices = mqtt.getConnectedDevices().map((d) => ({
    ...d, protocol: "mqtt" as const,
  }));

  // Deduplicate by username, prefer most recent ping
  const deviceMap = new Map<string, (typeof socketDevices)[0] | (typeof mqttDevices)[0]>();
  [...socketDevices, ...mqttDevices].forEach((device) => {
    const existing = deviceMap.get(device.username);
    if (!existing || device.lastPing > existing.lastPing) {
      deviceMap.set(device.username, device);
    }
  });

  return Array.from(deviceMap.values());
}

export function isUserConnected(username: string): boolean {
  return websocket.isUserConnected(username) || mqtt.isUserConnected(username);
}

export function getWebSocketStats(): { total: number; connected: number; socketio: number; mqtt: number } {
  const socketStats = websocket.getWebSocketStats();
  const mqttStats = mqtt.getWebSocketStats();
  return {
    total: socketStats.total + mqttStats.total,
    connected: socketStats.connected + mqttStats.connected,
    socketio: socketStats.connected,
    mqtt: mqttStats.connected,
  };
}

export { REMOTE_COMMANDS } from "./websocket";

export function sendMessageToUser(username: string, message: string): boolean {
  if (mqtt.isUserReady(username)) {
    log(`Sending message via MQTT to ${username}`, "devices");
    return mqtt.sendMessageToUser(username, message);
  }

  const reason = mqtt.isUserConnected(username)
    ? "connected via MQTT but not subscribed" : "not connected via MQTT";
  log(`Cannot send message to ${username}: ${reason}`, "devices");
  return false;
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
  return mqtt.sendMessageToAll(message);
}

export type { AnnouncementParams } from "./mqtt";

export function sendAnnouncementToUser(username: string, params: mqtt.AnnouncementParams): boolean {
  if (mqtt.isUserReady(username)) {
    log(`Sending announcement via MQTT to ${username}`, "devices");
    return mqtt.sendAnnouncementToUser(username, params);
  }

  const reason = mqtt.isUserConnected(username)
    ? "connected via MQTT but not subscribed" : "not connected via MQTT";
  log(`Cannot send announcement to ${username}: ${reason}`, "devices");
  return false;
}
