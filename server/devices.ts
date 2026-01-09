// Combined device management for both Socket.IO and MQTT connections
import * as websocket from "./websocket";
import * as mqtt from "./mqtt";
import { log } from "./index";

// Send command to a specific user (tries both Socket.IO and MQTT)
export function sendCommandToUser(username: string, command: string, additionalData?: any): boolean {
  // Try Socket.IO first
  if (websocket.isUserConnected(username)) {
    log(`Sending command via Socket.IO to ${username}`, "devices");
    return websocket.sendCommandToUser(username, command, additionalData);
  }

  // Try MQTT
  if (mqtt.isUserConnected(username)) {
    log(`Sending command via MQTT to ${username}`, "devices");
    return mqtt.sendCommandToUser(username, command, additionalData);
  }

  log(`Cannot send command to ${username}: not connected via Socket.IO or MQTT`, "devices");
  return false;
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

// Send command to all connected devices (both protocols)
export function sendCommandToAll(command: string, additionalData?: any): number {
  const socketCount = websocket.sendCommandToAll(command, additionalData);
  const mqttCount = mqtt.sendCommandToAll(command, additionalData);
  return socketCount + mqttCount;
}

// Get list of all connected devices (combined)
export function getConnectedDevices(): Array<{
  username: string;
  customerId: string;
  deviceInfo: any;
  connectedAt: Date;
  lastPing: Date;
  protocol: "socket.io" | "mqtt";
}> {
  const socketDevices = websocket.getConnectedDevices().map((d) => ({
    ...d,
    protocol: "socket.io" as const,
  }));

  const mqttDevices = mqtt.getConnectedDevices().map((d) => ({
    ...d,
    protocol: "mqtt" as const,
  }));

  // Combine and deduplicate by username (prefer most recent)
  const deviceMap = new Map<string, typeof socketDevices[0]>();

  [...socketDevices, ...mqttDevices].forEach((device) => {
    const existing = deviceMap.get(device.username);
    if (!existing || device.lastPing > existing.lastPing) {
      deviceMap.set(device.username, device);
    }
  });

  return Array.from(deviceMap.values());
}

// Check if a specific user is connected (either protocol)
export function isUserConnected(username: string): boolean {
  return websocket.isUserConnected(username) || mqtt.isUserConnected(username);
}

// Get combined connection stats
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

// Re-export REMOTE_COMMANDS
export { REMOTE_COMMANDS } from "./websocket";
