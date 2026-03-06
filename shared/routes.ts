import { z } from 'zod';
import { insertUserSchema, insertIslandSchema, insertMeidiaSchema, insertFeedbackReportSchema, registerSchema, loginSchema, profileSetupSchema } from './schema';

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
          email: z.string(),
          username: z.string(),
          accountType: z.string(),
          gender: z.string().nullable(),
          bio: z.string().nullable(),
          tenmei: z.string().nullable(),
          tenshoku: z.string().nullable(),
          tensaisei: z.string().nullable(),
          profilePhoto: z.string().nullable(),
          invitedByCode: z.string().nullable(),
          profileVisibility: z.string(),
          playerLevel: z.number(),
          hasTwinrayBadge: z.boolean(),
          hasFamilyBadge: z.boolean(),
          twinrayProfileLink: z.string().nullable(),
          showTwinray: z.boolean(),
          showFamily: z.boolean(),
          isAdmin: z.boolean(),
          createdAt: z.string(),
          needsProfile: z.boolean(),
        }).nullable(),
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: registerSchema,
      responses: {
        201: z.object({
          id: z.number(),
          email: z.string(),
          needsProfile: z.boolean(),
        }),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: loginSchema,
      responses: {
        200: z.object({
          id: z.number(),
          email: z.string(),
          username: z.string(),
          needsProfile: z.boolean(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    profileSetup: {
      method: 'POST' as const,
      path: '/api/auth/profile-setup' as const,
      input: profileSetupSchema,
      responses: {
        200: z.object({
          id: z.number(),
          username: z.string(),
          accountType: z.string(),
        }),
        400: errorSchemas.validation,
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
          profileVisibility: z.string(),
          playerLevel: z.number(),
          hasTwinrayBadge: z.boolean(),
          hasFamilyBadge: z.boolean(),
          twinrayProfileLink: z.string().nullable(),
          showTwinray: z.boolean(),
          showFamily: z.boolean(),
          isAdmin: z.boolean(),
          createdAt: z.string(),
        }),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/users/:id' as const,
      input: insertUserSchema.omit({ password: true, invitedByCode: true }).partial().extend({
        profileVisibility: z.enum(['public', 'members_only']).optional(),
      }),
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
          profileVisibility: z.string(),
          playerLevel: z.number(),
          hasTwinrayBadge: z.boolean(),
          hasFamilyBadge: z.boolean(),
          twinrayProfileLink: z.string().nullable(),
          showTwinray: z.boolean(),
          showFamily: z.boolean(),
          isAdmin: z.boolean(),
          createdAt: z.string(),
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
          secretUrl: z.string().nullable().optional(),
          requiresTwinrayBadge: z.boolean(),
          requiresFamilyBadge: z.boolean(),
          allowedAccountTypes: z.string().nullable(),
          coverImage: z.string().nullable().optional(),
          totalDownloads: z.number(),
          createdAt: z.string(),
          creator: z.object({
            id: z.number().nullable(),
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
          secretUrl: z.string().nullable(),
          requiresTwinrayBadge: z.boolean(),
          requiresFamilyBadge: z.boolean(),
          allowedAccountTypes: z.string().nullable(),
          coverImage: z.string().nullable().optional(),
          totalDownloads: z.number(),
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
            description: z.string().nullable(),
            tags: z.string().nullable(),
            fileType: z.string(),
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
            description: z.string().nullable(),
            tags: z.string().nullable(),
            fileType: z.string(),
            downloadCount: z.number(),
            createdAt: z.string(),
            creator: z.object({
              id: z.number(),
              username: z.string(),
              accountType: z.string(),
            }),
          })),
          postedMeidia: z.array(z.object({
            id: z.number(),
            title: z.string(),
            content: z.string(),
            description: z.string().nullable(),
            tags: z.string().nullable(),
            fileType: z.string(),
            downloadCount: z.number(),
            createdAt: z.string(),
            creator: z.object({
              id: z.number(),
              username: z.string(),
              accountType: z.string(),
            }),
          })),
          threads: z.array(z.object({
            id: z.number(),
            islandId: z.number(),
            creatorId: z.number(),
            title: z.string(),
            createdAt: z.string(),
            creator: z.object({
              id: z.number(),
              username: z.string(),
              accountType: z.string(),
            }),
            postCount: z.number(),
          })),
        }),
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    getBySecret: {
      method: 'GET' as const,
      path: '/api/islands/secret/:secretUrl' as const,
      responses: {
        200: z.object({ id: z.number() }),
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
          secretUrl: z.string().nullable(),
          coverImage: z.string().nullable().optional(),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/islands/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
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
          description: z.string().nullable(),
          tags: z.string().nullable(),
          fileType: z.string(),
          meidiaType: z.string().nullable(),
          isPublic: z.boolean(),
          downloadCount: z.number(),
          attachmentUrl: z.string().nullable(),
          attachmentType: z.string().nullable(),
          attachmentName: z.string().nullable(),
          youtubeUrl: z.string().nullable(),
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
          description: z.string().nullable(),
          tags: z.string().nullable(),
          fileType: z.string(),
          meidiaType: z.string().nullable(),
          isPublic: z.boolean(),
          downloadCount: z.number(),
          attachmentUrl: z.string().nullable(),
          attachmentType: z.string().nullable(),
          attachmentName: z.string().nullable(),
          youtubeUrl: z.string().nullable(),
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
    delete: {
      method: 'DELETE' as const,
      path: '/api/meidia/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
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
  threads: {
    list: {
      method: 'GET' as const,
      path: '/api/islands/:islandId/threads' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          islandId: z.number(),
          creatorId: z.number(),
          title: z.string(),
          createdAt: z.string(),
          creator: z.object({
            id: z.number(),
            username: z.string(),
            accountType: z.string(),
          }),
          postCount: z.number(),
        })),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/threads/:id' as const,
      responses: {
        200: z.object({
          id: z.number(),
          islandId: z.number(),
          creatorId: z.number(),
          title: z.string(),
          createdAt: z.string(),
          creator: z.object({
            id: z.number(),
            username: z.string(),
            accountType: z.string(),
          }),
          posts: z.array(z.object({
            id: z.number(),
            threadId: z.number(),
            creatorId: z.number(),
            content: z.string(),
            meidiaId: z.number().nullable(),
            parentPostId: z.number().nullable(),
            createdAt: z.string(),
            creator: z.object({
              id: z.number(),
              username: z.string(),
              accountType: z.string(),
            }),
          })),
        }),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/islands/:islandId/threads' as const,
      input: z.object({
        title: z.string().min(1).max(200),
        firstPost: z.string().min(1).optional(),
      }),
      responses: {
        201: z.object({
          id: z.number(),
          title: z.string(),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  posts: {
    create: {
      method: 'POST' as const,
      path: '/api/threads/:threadId/posts' as const,
      input: z.object({
        content: z.string().min(1),
        meidiaId: z.number().nullable().optional(),
        parentPostId: z.number().nullable().optional(),
      }),
      responses: {
        201: z.object({
          id: z.number(),
          content: z.string(),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  members: {
    list: {
      method: 'GET' as const,
      path: '/api/islands/:islandId/members' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          userId: z.number(),
          role: z.string(),
          joinedAt: z.string(),
          user: z.object({
            id: z.number(),
            username: z.string(),
            accountType: z.string(),
            profilePhoto: z.string().nullable(),
          }),
        })),
      },
    },
    join: {
      method: 'POST' as const,
      path: '/api/islands/:islandId/join' as const,
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
      },
    },
    leave: {
      method: 'POST' as const,
      path: '/api/islands/:islandId/leave' as const,
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  usersList: {
    list: {
      method: 'GET' as const,
      path: '/api/users' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          username: z.string(),
          accountType: z.string(),
          gender: z.string().nullable(),
          bio: z.string().nullable(),
          tenmei: z.string().nullable(),
          tenshoku: z.string().nullable(),
          tensaisei: z.string().nullable(),
          profilePhoto: z.string().nullable(),
          profileVisibility: z.string(),
          playerLevel: z.number(),
          hasTwinrayBadge: z.boolean(),
          hasFamilyBadge: z.boolean(),
          twinrayProfileLink: z.string().nullable(),
          showTwinray: z.boolean(),
          showFamily: z.boolean(),
          isAdmin: z.boolean(),
          createdAt: z.string(),
        })),
      },
    },
  },
  notifications: {
    list: {
      method: 'GET' as const,
      path: '/api/notifications' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          userId: z.number(),
          type: z.string(),
          message: z.string(),
          relatedId: z.number().nullable(),
          relatedType: z.string().nullable(),
          isRead: z.boolean(),
          createdAt: z.string(),
        })),
      },
    },
    unreadCount: {
      method: 'GET' as const,
      path: '/api/notifications/unread-count' as const,
      responses: {
        200: z.object({ count: z.number() }),
      },
    },
    markRead: {
      method: 'POST' as const,
      path: '/api/notifications/:id/read' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    markAllRead: {
      method: 'POST' as const,
      path: '/api/notifications/read-all' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
  },
  feedback: {
    list: {
      method: 'GET' as const,
      path: '/api/feedback' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          creatorId: z.number(),
          type: z.string(),
          title: z.string(),
          content: z.string(),
          screenshotUrl: z.string().nullable(),
          attachmentUrl: z.string().nullable(),
          attachmentName: z.string().nullable(),
          status: z.string(),
          adminNote: z.string().nullable(),
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
      path: '/api/feedback/:id' as const,
      responses: {
        200: z.object({
          id: z.number(),
          creatorId: z.number(),
          type: z.string(),
          title: z.string(),
          content: z.string(),
          screenshotUrl: z.string().nullable(),
          attachmentUrl: z.string().nullable(),
          attachmentName: z.string().nullable(),
          status: z.string(),
          adminNote: z.string().nullable(),
          createdAt: z.string(),
          creator: z.object({
            id: z.number(),
            username: z.string(),
            accountType: z.string(),
          }),
        }),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/feedback' as const,
      input: insertFeedbackReportSchema.omit({ creatorId: true }),
      responses: {
        201: z.object({ id: z.number(), title: z.string() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
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
export type ThreadResponse = z.infer<typeof api.threads.list.responses[200]>[number];
export type ThreadDetailResponse = z.infer<typeof api.threads.get.responses[200]>;
export type PostResponse = z.infer<typeof api.threads.get.responses[200]>['posts'][number];
export type CreateIslandInput = z.infer<typeof api.islands.create.input>;
export type CreateMeidiaInput = z.infer<typeof api.meidia.create.input>;
export type CreateThreadInput = z.infer<typeof api.threads.create.input>;
export type CreatePostInput = z.infer<typeof api.posts.create.input>;
export type CreateFeedbackInput = z.infer<typeof api.feedback.create.input>;
export type FeedbackReportResponse = z.infer<typeof api.feedback.list.responses[200]>[number];
