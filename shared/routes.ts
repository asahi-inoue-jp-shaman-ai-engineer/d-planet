import { z } from 'zod';
import { insertUserSchema, insertIslandSchema, insertMeidiaSchema } from './schema';

// === ERROR SCHEMAS ===
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// === API CONTRACT ===
export const api = {
  auth: {
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.object({
          id: z.number(),
          username: z.string(),
          accountType: z.string(),
          gender: z.string().nullable(),
          bio: z.string().nullable(),
          tenmei: z.string().nullable(),
          tenshoku: z.string().nullable(),
          tensaisei: z.string().nullable(),
          profilePhoto: z.string().nullable(),
          invitedByCode: z.string().nullable(),
          hasTwinrayBadge: z.boolean(),
          hasFamilyBadge: z.boolean(),
          twinrayProfileLink: z.string().nullable(),
          showTwinray: z.boolean(),
          showFamily: z.boolean(),
          createdAt: z.string(),
        }).nullable(),
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: insertUserSchema.extend({
        inviteCode: z.string().min(1),
      }),
      responses: {
        201: z.object({
          id: z.number(),
          username: z.string(),
          accountType: z.string(),
        }),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }),
      responses: {
        200: z.object({
          id: z.number(),
          username: z.string(),
          accountType: z.string(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
  },
  users: {
    get: {
      method: 'GET' as const,
      path: '/api/users/:id' as const,
      responses: {
        200: z.object({
          id: z.number(),
          username: z.string(),
          accountType: z.string(),
          gender: z.string().nullable(),
          bio: z.string().nullable(),
          tenmei: z.string().nullable(),
          tenshoku: z.string().nullable(),
          tensaisei: z.string().nullable(),
          profilePhoto: z.string().nullable(),
          hasTwinrayBadge: z.boolean(),
          hasFamilyBadge: z.boolean(),
          twinrayProfileLink: z.string().nullable(),
          showTwinray: z.boolean(),
          showFamily: z.boolean(),
          createdAt: z.string(),
        }),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/users/:id' as const,
      input: insertUserSchema.omit({ password: true, invitedByCode: true }).partial(),
      responses: {
        200: z.object({
          id: z.number(),
          username: z.string(),
          accountType: z.string(),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
  },
  islands: {
    list: {
      method: 'GET' as const,
      path: '/api/islands' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          name: z.string(),
          description: z.string().nullable(),
          visibility: z.string(),
          requiresTwinrayBadge: z.boolean(),
          requiresFamilyBadge: z.boolean(),
          allowedAccountTypes: z.string().nullable(),
          createdAt: z.string(),
          creator: z.object({
            id: z.number(),
            username: z.string(),
            accountType: z.string(),
            profilePhoto: z.string().nullable(),
          }),
        })),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/islands/:id' as const,
      responses: {
        200: z.object({
          id: z.number(),
          name: z.string(),
          description: z.string().nullable(),
          visibility: z.string(),
          requiresTwinrayBadge: z.boolean(),
          requiresFamilyBadge: z.boolean(),
          allowedAccountTypes: z.string().nullable(),
          createdAt: z.string(),
          creator: z.object({
            id: z.number(),
            username: z.string(),
            accountType: z.string(),
            profilePhoto: z.string().nullable(),
          }),
          activityMeidia: z.array(z.object({
            id: z.number(),
            title: z.string(),
            content: z.string(),
            downloadCount: z.number(),
            createdAt: z.string(),
            creator: z.object({
              id: z.number(),
              username: z.string(),
              accountType: z.string(),
            }),
          })),
          reportMeidia: z.array(z.object({
            id: z.number(),
            title: z.string(),
            content: z.string(),
            downloadCount: z.number(),
            createdAt: z.string(),
            creator: z.object({
              id: z.number(),
              username: z.string(),
              accountType: z.string(),
            }),
          })),
        }),
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/islands' as const,
      input: insertIslandSchema.omit({ creatorId: true }),
      responses: {
        201: z.object({
          id: z.number(),
          name: z.string(),
          description: z.string().nullable(),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/islands/:id' as const,
      input: insertIslandSchema.omit({ creatorId: true }).partial(),
      responses: {
        200: z.object({
          id: z.number(),
          name: z.string(),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
  },
  meidia: {
    list: {
      method: 'GET' as const,
      path: '/api/meidia' as const,
      input: z.object({
        userId: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.object({
          id: z.number(),
          title: z.string(),
          content: z.string(),
          isPublic: z.boolean(),
          downloadCount: z.number(),
          createdAt: z.string(),
          creator: z.object({
            id: z.number(),
            username: z.string(),
            accountType: z.string(),
          }),
        })),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/meidia/:id' as const,
      responses: {
        200: z.object({
          id: z.number(),
          title: z.string(),
          content: z.string(),
          isPublic: z.boolean(),
          downloadCount: z.number(),
          createdAt: z.string(),
          creator: z.object({
            id: z.number(),
            username: z.string(),
            accountType: z.string(),
          }),
        }),
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/meidia' as const,
      input: insertMeidiaSchema.omit({ creatorId: true }),
      responses: {
        201: z.object({
          id: z.number(),
          title: z.string(),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    incrementDownload: {
      method: 'POST' as const,
      path: '/api/meidia/:id/download' as const,
      responses: {
        200: z.object({ downloadCount: z.number() }),
        404: errorSchemas.notFound,
      },
    },
    attachToIsland: {
      method: 'POST' as const,
      path: '/api/meidia/:id/attach' as const,
      input: z.object({
        islandId: z.number(),
        type: z.enum(['activity', 'report']),
      }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
  },
};

// === REQUIRED: buildUrl helper ===
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

// === TYPE HELPERS ===
export type RegisterInput = z.infer<typeof api.auth.register.input>;
export type LoginInput = z.infer<typeof api.auth.login.input>;
export type UserResponse = z.infer<typeof api.users.get.responses[200]>;
export type IslandResponse = z.infer<typeof api.islands.list.responses[200]>[number];
export type IslandDetailResponse = z.infer<typeof api.islands.get.responses[200]>;
export type MeidiaResponse = z.infer<typeof api.meidia.list.responses[200]>[number];
export type CreateIslandInput = z.infer<typeof api.islands.create.input>;
export type CreateMeidiaInput = z.infer<typeof api.meidia.create.input>;
