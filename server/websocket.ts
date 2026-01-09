import { Server as SocketIOServer, Socket } from "socket.io";
import { Server } from "http";
import { log } from "./index";

interface ConnectedDevice {
  socket: Socket;
  username: string;
  customerId: string;
  deviceInfo: {
    appId?: string;
    version?: string;
    deviceName?: string;
    packageName?: string;
  };
  connectedAt: Date;
  lastPing: Date;
}

// Map of username -> device connection
const connectedDevices = new Map<string, ConnectedDevice>();

// Map of socket.id -> username for quick lookup
const socketToUsername = new Map<string, string>();

let io: SocketIOServer | null = null;

export function initWebSocketServer(server: Server): SocketIOServer {
  io = new SocketIOServer(server, {
    path: "/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ["websocket", "polling"]
  });

  io.on("connection", (socket) => {
    const clientIp = socket.handshake.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
                     socket.handshake.address ||
                     "unknown";

    log(`Socket.IO client connected from ${clientIp} (${socket.id})`, "socket.io");

    // Handle device registration - the app sends "app_login_request" with an array
    // Array format: [username-deviceId, customerId, userAgent, appName, version, ...]
    socket.on("app_login_request", (...args: any[]) => {
      handleAppLoginRequest(socket, args, clientIp);
    });

    // Fallback handlers for other registration methods
    socket.on("register", (data) => {
      handleRegister(socket, data, clientIp);
    });

    socket.on("connect_device", (data) => {
      handleRegister(socket, data, clientIp);
    });

    // Handle pong response
    socket.on("pong_response", () => {
      const username = socketToUsername.get(socket.id);
      if (username) {
        const device = connectedDevices.get(username);
        if (device) {
          device.lastPing = new Date();
        }
      }
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      const username = socketToUsername.get(socket.id);
      if (username) {
        connectedDevices.delete(username);
        socketToUsername.delete(socket.id);
        log(`Device disconnected: ${username} (reason: ${reason})`, "socket.io");
      }
    });

    socket.on("error", (err) => {
      log(`Socket.IO error: ${err.message}`, "socket.io");
    });
  });

  log("Socket.IO server initialized on /socket.io", "socket.io");
  return io;
}

// Handle app_login_request from Android app
// Array format: [username-deviceId, customerId, userAgent, appName, version, ...]
function handleAppLoginRequest(socket: Socket, args: any[], clientIp: string) {
  try {
    // The app sends arguments as separate values, not as an array
    const usernameWithDevice = args[0]?.toString() || "";
    const customerId = args[1]?.toString() || "";
    const userAgent = args[2]?.toString() || "";
    const appName = args[3]?.toString() || "";
    const version = args[4]?.toString() || "";

    // Username format is "username-deviceId", extract just the username
    const username = usernameWithDevice.split("-")[0] || usernameWithDevice;

    if (username) {
      registerDevice(socket, {
        username,
        customerId,
        userAgent,
        appName,
        version,
        deviceId: usernameWithDevice,
      }, clientIp);

      // Send login_response to acknowledge the registration
      socket.emit("login_response", {
        success: true,
        username,
      });
    }
  } catch (err) {
    log(`Error handling app_login_request: ${err}`, "socket.io");
  }
}

function handleRegister(socket: Socket, data: any, clientIp: string) {
  const { username, customerId, appId, version, deviceName, packageName } = data || {};

  if (username) {
    registerDevice(socket, {
      username,
      customerId: customerId || "",
      appId,
      version,
      deviceName,
      packageName,
    }, clientIp);

    // Send acknowledgment
    socket.emit("registered", {
      success: true,
      message: "Device registered successfully"
    });
  }
}

function registerDevice(socket: Socket, data: {
  username: string;
  customerId?: string;
  appId?: string;
  version?: string;
  deviceName?: string;
  packageName?: string;
  userAgent?: string;
  appName?: string;
  deviceId?: string;
}, clientIp: string) {
  const { username, customerId, appId, version, deviceName, packageName, userAgent, appName, deviceId } = data;

  const device: ConnectedDevice = {
    socket,
    username,
    customerId: customerId || "",
    deviceInfo: {
      appId: appId || deviceId,
      version,
      deviceName: deviceName || userAgent,
      packageName: packageName || appName,
    },
    connectedAt: new Date(),
    lastPing: new Date(),
  };

  // Remove old connection if exists
  const oldDevice = connectedDevices.get(username);
  if (oldDevice && oldDevice.socket.id !== socket.id) {
    oldDevice.socket.disconnect(true);
    socketToUsername.delete(oldDevice.socket.id);
  }

  connectedDevices.set(username, device);
  socketToUsername.set(socket.id, username);

  log(`Device registered: ${username} (${deviceName || appName || "unknown"}) from ${clientIp}`, "socket.io");
}

// Send command to a specific user
export function sendCommandToUser(username: string, command: string, additionalData?: any): boolean {
  const device = connectedDevices.get(username);

  if (!device || !device.socket.connected) {
    log(`Cannot send command to ${username}: device not connected`, "socket.io");
    return false;
  }

  // Format message as the Android app expects it
  // The app receives a JSONObject with "username" and "message" fields
  // The app listens for "message_response" event
  const message = {
    username,
    message: command,
    ...additionalData,
  };

  // Emit the command - the Android app listens for "message_response" event
  device.socket.emit("message_response", message);

  log(`Command sent to ${username}: ${command}`, "socket.io");
  return true;
}

// Send command to multiple users
export function sendCommandToUsers(usernames: string[], command: string, additionalData?: any): { sent: string[], failed: string[] } {
  const sent: string[] = [];
  const failed: string[] = [];

  usernames.forEach(username => {
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
    if (device.socket.connected) {
      const message = {
        username,
        message: command,
        ...additionalData,
      };
      device.socket.emit("message_response", message);
      count++;
    }
  });

  log(`Command broadcast to ${count} devices: ${command}`, "socket.io");
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
  return Array.from(connectedDevices.values()).map(device => ({
    username: device.username,
    customerId: device.customerId,
    deviceInfo: device.deviceInfo,
    connectedAt: device.connectedAt,
    lastPing: device.lastPing,
  }));
}

// Check if a specific user is connected via Socket.IO
export function isUserConnected(username: string): boolean {
  const device = connectedDevices.get(username);
  return device !== undefined && device.socket.connected;
}

// Get Socket.IO connection stats
export function getWebSocketStats(): { total: number; connected: number } {
  let connected = 0;
  connectedDevices.forEach((device) => {
    if (device.socket.connected) {
      connected++;
    }
  });
  return { total: connectedDevices.size, connected };
}

// Get the Socket.IO server instance
export function getIO(): SocketIOServer | null {
  return io;
}

// Available remote commands
export const REMOTE_COMMANDS = {
  RESET_PLAYERS_SETTINGS: "reset_players_settings",
  RESET_PARENTAL_PASSWORD: "reset_parental_password",
  DELETE_CACHE: "delete_cache",
  GET_INFO_DM: "get_info_dm",
} as const;

export type RemoteCommand = typeof REMOTE_COMMANDS[keyof typeof REMOTE_COMMANDS];
