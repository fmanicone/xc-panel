import { z } from 'zod';
import { 
  insertSettingsSchema, 
  insertAnnouncementSchema, 
  insertMessageSchema, 
  insertGlobalMessageSchema,
  insertVpnServerSchema,
  settings, 
  announcements,
  messages, 
  globalMessage,
  vpnServers,
  connectedUsers,
  accessLogs
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  // === Settings ===
  settings: {
    get: {
      method: 'GET' as const,
      path: '/api/admin/settings',
      responses: {
        200: z.custom<typeof settings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/admin/settings',
      input: insertSettingsSchema.partial(),
      responses: {
        200: z.custom<typeof settings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  
  // === Announcements ===
  announcements: {
    get: {
      method: 'GET' as const,
      path: '/api/admin/announcements',
      responses: {
        200: z.custom<typeof announcements.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/admin/announcements',
      input: insertAnnouncementSchema,
      responses: {
        200: z.custom<typeof announcements.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  
  // === Messages (per-user) ===
  messages: {
    list: {
      method: 'GET' as const,
      path: '/api/admin/messages',
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/admin/messages',
      input: insertMessageSchema,
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/admin/messages/:id',
      input: insertMessageSchema.partial(),
      responses: {
        200: z.custom<typeof messages.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/admin/messages/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  
  // === Global Message ===
  globalMessage: {
    get: {
      method: 'GET' as const,
      path: '/api/admin/global-message',
      responses: {
        200: z.custom<typeof globalMessage.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/admin/global-message',
      input: insertGlobalMessageSchema,
      responses: {
        200: z.custom<typeof globalMessage.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  
  // === VPN Servers ===
  vpnServers: {
    list: {
      method: 'GET' as const,
      path: '/api/admin/vpn-servers',
      responses: {
        200: z.array(z.custom<typeof vpnServers.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/admin/vpn-servers',
      input: insertVpnServerSchema,
      responses: {
        201: z.custom<typeof vpnServers.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/admin/vpn-servers/:id',
      input: insertVpnServerSchema.partial(),
      responses: {
        200: z.custom<typeof vpnServers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/admin/vpn-servers/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  
  // === Connected Users ===
  connectedUsers: {
    list: {
      method: 'GET' as const,
      path: '/api/admin/connected-users',
      responses: {
        200: z.array(z.custom<typeof connectedUsers.$inferSelect>()),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/admin/connected-users/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    stats: {
      method: 'GET' as const,
      path: '/api/admin/connected-users/stats',
      responses: {
        200: z.object({
          total: z.number(),
          online: z.number(),
        }),
      },
    },
  },
  
  // === Access Logs ===
  logs: {
    list: {
      method: 'GET' as const,
      path: '/api/admin/logs',
      responses: {
        200: z.array(z.custom<typeof accessLogs.$inferSelect>()),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// Type exports
export type SettingsResponse = typeof settings.$inferSelect;
export type AnnouncementResponse = typeof announcements.$inferSelect;
export type MessageResponse = typeof messages.$inferSelect;
export type GlobalMessageResponse = typeof globalMessage.$inferSelect;
export type VpnServerResponse = typeof vpnServers.$inferSelect;
export type ConnectedUserResponse = typeof connectedUsers.$inferSelect;
export type AccessLogResponse = typeof accessLogs.$inferSelect;
