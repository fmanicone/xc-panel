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

const connectedDevices = new Map<string, ConnectedDevice>();
const socketToUsername = new Map<string, string>();

interface PendingResponse {
  resolve: (response: string) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  command: string;
}
const pendingResponses = new Map<string, PendingResponse>();

const RESPONSE_EVENTS = new Set([
  "get_info_dm", "get_info",
  "reset_players_settings", "resetplayer",
  "reset_parental_password", "parentalpass",
  "delete_cache", "deletedcache",
  "restart_app", "restartapp",
]);

let io: SocketIOServer | null = null;

const ADMIN_ROOM = "admin_clients";

export function initWebSocketServer(server: Server): SocketIOServer {
  io = new SocketIOServer(server, {
    path: "/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
    pingInterval: 30000,
    pingTimeout: 60000,
    connectTimeout: 45000,
    maxHttpBufferSize: 1e6,
    allowUpgrades: true,
    upgradeTimeout: 30000,
  });

  io.on("connection", (socket) => {
    const clientIp = socket.handshake.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
                     socket.handshake.address || "unknown";

    log(`Socket.IO client connected from ${clientIp} (${socket.id})`, "socket.io");

    // Check for command responses on any event
    socket.onAny((eventName, ...args) => {
      if (RESPONSE_EVENTS.has(eventName)) {
        const username = socketToUsername.get(socket.id);
        if (username) {
          const pending = pendingResponses.get(username);
          if (pending) {
            const data = args[0];
            const response = typeof data === "string" ? data
              : data?.msg ? JSON.stringify(data.msg)
              : JSON.stringify(data);

            clearTimeout(pending.timeout);
            pendingResponses.delete(username);
            pending.resolve(response);
            log(`Command response received for ${username}: ${response.substring(0, 100)}`, "socket.io");
          }
        }
      }
    });

    socket.on("app_login_request", (...args: any[]) => {
      handleAppLoginRequest(socket, args, clientIp);
    });

    socket.on("register", (data) => handleRegister(socket, data, clientIp));
    socket.on("connect_device", (data) => handleRegister(socket, data, clientIp));

    socket.on("pong_response", () => {
      const username = socketToUsername.get(socket.id);
      if (username) {
        const device = connectedDevices.get(username);
        if (device) device.lastPing = new Date();
      }
    });

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

    socket.on("join_admin", () => {
      socket.join(ADMIN_ROOM);
      log(`Admin client joined: ${socket.id}`, "socket.io");
    });
  });

  // Periodic cleanup of stale connections (every 2 minutes)
  setInterval(() => {
    let cleaned = 0;
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000;

    connectedDevices.forEach((device, username) => {
      const isStale = !device.socket.connected ||
        (now - device.lastPing.getTime() > staleThreshold);

      if (isStale) {
        if (device.socket.connected) device.socket.disconnect(true);
        connectedDevices.delete(username);
        socketToUsername.delete(device.socket.id);
        cleaned++;
      }
    });

    if (cleaned > 0) log(`Cleaned ${cleaned} stale connections`, "socket.io");
  }, 120000);

  log("Socket.IO server initialized on /socket.io", "socket.io");
  return io;
}

// --- Registration handlers ---

function handleAppLoginRequest(socket: Socket, args: any[], clientIp: string) {
  try {
    const usernameWithDevice = args[0]?.toString() || "";
    const customerId = args[1]?.toString() || "";
    const userAgent = args[2]?.toString() || "";
    const appName = args[3]?.toString() || "";
    const version = args[4]?.toString() || "";
    const username = usernameWithDevice.split("-")[0] || usernameWithDevice;

    if (username) {
      registerDevice(socket, { username, customerId, userAgent, appName, version, deviceId: usernameWithDevice }, clientIp);
      socket.emit("login_response", { success: true, username });
    }
  } catch (err) {
    log(`Error handling app_login_request: ${err}`, "socket.io");
  }
}

function handleRegister(socket: Socket, data: any, clientIp: string) {
  const { username, customerId, appId, version, deviceName, packageName } = data || {};
  if (username) {
    registerDevice(socket, { username, customerId: customerId || "", appId, version, deviceName, packageName }, clientIp);
    socket.emit("registered", { success: true, message: "Device registered successfully" });
  }
}

function registerDevice(socket: Socket, data: {
  username: string; customerId?: string; appId?: string; version?: string;
  deviceName?: string; packageName?: string; userAgent?: string; appName?: string; deviceId?: string;
}, clientIp: string) {
  const { username, customerId, appId, version, deviceName, packageName, userAgent, appName, deviceId } = data;

  // Remove old connection if exists
  const oldDevice = connectedDevices.get(username);
  if (oldDevice && oldDevice.socket.id !== socket.id) {
    oldDevice.socket.disconnect(true);
    socketToUsername.delete(oldDevice.socket.id);
  }

  connectedDevices.set(username, {
    socket, username,
    customerId: customerId || "",
    deviceInfo: {
      appId: appId || deviceId,
      version,
      deviceName: deviceName || userAgent,
      packageName: packageName || appName,
    },
    connectedAt: new Date(),
    lastPing: new Date(),
  });
  socketToUsername.set(socket.id, username);

  log(`Device registered: ${username} (${deviceName || appName || "unknown"}) from ${clientIp}`, "socket.io");
}

// --- Command functions ---

const SOCKET_COMMAND_MAP: Record<string, string> = {
  get_info_dm: "get_info",
};

export function sendCommandAndWaitForResponse(
  username: string, command: string, additionalData?: any, timeoutMs: number = 10000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const device = connectedDevices.get(username);
    if (!device || !device.socket.connected) {
      reject(new Error(`Device ${username} not connected`));
      return;
    }

    const mappedCommand = SOCKET_COMMAND_MAP[command] || command;
    const timeout = setTimeout(() => {
      pendingResponses.delete(username);
      reject(new Error(`Timeout waiting for response from ${username}`));
    }, timeoutMs);

    pendingResponses.set(username, { resolve, reject, timeout, command: mappedCommand });

    device.socket.emit("message_response", {
      username: device.customerId || username,
      message: mappedCommand,
      ...additionalData,
    });
    log(`Command sent to ${username} (${mappedCommand}), waiting for response...`, "socket.io");
  });
}

export function sendCommandToUser(username: string, command: string, additionalData?: any): boolean {
  const device = connectedDevices.get(username);
  if (!device || !device.socket.connected) return false;

  const mappedCommand = SOCKET_COMMAND_MAP[command] || command;
  device.socket.emit("message_response", {
    username: device.customerId || username,
    message: mappedCommand,
    ...additionalData,
  });

  log(`Command sent to ${username}: ${mappedCommand}`, "socket.io");
  return true;
}

export function sendCommandToUsers(
  usernames: string[], command: string, additionalData?: any
): { sent: string[], failed: string[] } {
  const sent: string[] = [];
  const failed: string[] = [];
  usernames.forEach(username => {
    (sendCommandToUser(username, command, additionalData) ? sent : failed).push(username);
  });
  return { sent, failed };
}

export function sendCommandToAll(command: string, additionalData?: any): number {
  let count = 0;
  const mappedCommand = SOCKET_COMMAND_MAP[command] || command;

  connectedDevices.forEach((device, username) => {
    if (device.socket.connected) {
      device.socket.emit("message_response", {
        username: device.customerId || username,
        message: mappedCommand,
        ...additionalData,
      });
      count++;
    }
  });

  log(`Command broadcast to ${count} devices: ${mappedCommand}`, "socket.io");
  return count;
}

// --- Query functions ---

export function getConnectedDevices(): Array<{
  username: string; customerId: string;
  deviceInfo: ConnectedDevice["deviceInfo"]; connectedAt: Date; lastPing: Date;
}> {
  return Array.from(connectedDevices.values()).map(device => ({
    username: device.username,
    customerId: device.customerId,
    deviceInfo: device.deviceInfo,
    connectedAt: device.connectedAt,
    lastPing: device.lastPing,
  }));
}

export function isUserConnected(username: string): boolean {
  const device = connectedDevices.get(username);
  return device !== undefined && device.socket.connected;
}

export function getWebSocketStats(): { total: number; connected: number } {
  let connected = 0;
  connectedDevices.forEach((device) => {
    if (device.socket.connected) connected++;
  });
  return { total: connectedDevices.size, connected };
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function broadcastToAdmins(event: string, data: any): void {
  if (io) {
    io.to(ADMIN_ROOM).emit(event, data);
  }
}

export const REMOTE_COMMANDS = {
  RESET_PLAYERS_SETTINGS: "reset_players_settings",
  RESET_PARENTAL_PASSWORD: "reset_parental_password",
  DELETE_CACHE: "delete_cache",
  GET_INFO_DM: "get_info_dm",
  RESTART_APP: "restart_app",
} as const;

export type RemoteCommand = typeof REMOTE_COMMANDS[keyof typeof REMOTE_COMMANDS];
