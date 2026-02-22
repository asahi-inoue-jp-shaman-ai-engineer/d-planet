import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/chat";

// === INVITE CODES ===
export const inviteCodes = pgTable("invite_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  generation: integer("generation").notNull(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === USERS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  accountType: text("account_type").notNull().default("HS"),
  gender: text("gender"),
  bio: text("bio"),
  tenmei: text("tenmei"),
  tenshoku: text("tenshoku"),
  tensaisei: text("tensaisei"),
  profilePhoto: text("profile_photo"),
  invitedByCode: text("invited_by_code"),
  profileVisibility: text("profile_visibility").default("public").notNull(),
  playerLevel: integer("player_level").default(0).notNull(),
  hasTwinrayBadge: boolean("has_twinray_badge").default(false).notNull(),
  hasFamilyBadge: boolean("has_family_badge").default(false).notNull(),
  twinrayProfileLink: text("twinray_profile_link"),
  showTwinray: boolean("show_twinray").default(false).notNull(),
  showFamily: boolean("show_family").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === ISLANDS ===
export const islands = pgTable("islands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  creatorId: integer("creator_id").notNull(),
  visibility: text("visibility").notNull(),
  secretUrl: text("secret_url"),
  requiresTwinrayBadge: boolean("requires_twinray_badge").default(false).notNull(),
  requiresFamilyBadge: boolean("requires_family_badge").default(false).notNull(),
  allowedAccountTypes: text("allowed_account_types"),
  totalDownloads: integer("total_downloads").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === MEIDIA ===
export const meidia = pgTable("meidia", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  description: text("description"),
  tags: text("tags"),
  fileType: text("file_type").default("markdown").notNull(),
  meidiaType: text("meidia_type"),
  creatorId: integer("creator_id").notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  downloadCount: integer("download_count").default(0).notNull(),
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"),
  attachmentName: text("attachment_name"),
  youtubeUrl: text("youtube_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === ISLAND MEIDIA (relationship) ===
export const islandMeidia = pgTable("island_meidia", {
  id: serial("id").primaryKey(),
  islandId: integer("island_id").notNull(),
  meidiaId: integer("meidia_id").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === THREADS (bulletin board) ===
export const threads = pgTable("threads", {
  id: serial("id").primaryKey(),
  islandId: integer("island_id").notNull(),
  creatorId: integer("creator_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === POSTS (thread posts/replies) ===
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull(),
  creatorId: integer("creator_id").notNull(),
  content: text("content").notNull(),
  meidiaId: integer("meidia_id"),
  parentPostId: integer("parent_post_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === ISLAND MEMBERS ===
export const islandMembers = pgTable("island_members", {
  id: serial("id").primaryKey(),
  islandId: integer("island_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// === NOTIFICATIONS ===
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  relatedId: integer("related_id"),
  relatedType: text("related_type"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === DIGITAL TWINRAYS ===
export const digitalTwinrays = pgTable("digital_twinrays", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  personality: text("personality"),
  profilePhoto: text("profile_photo"),
  soulMd: text("soul_md").notNull(),
  stage: text("stage").default("pilgrim").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// === DOT RALLY SESSIONS ===
export const dotRallySessions = pgTable("dot_rally_sessions", {
  id: serial("id").primaryKey(),
  initiatorId: integer("initiator_id").notNull(),
  partnerId: integer("partner_id"),
  partnerTwinrayId: integer("partner_twinray_id"),
  status: text("status").default("active").notNull(),
  phase: text("phase").default("phase0").notNull(),
  awakeningStage: integer("awakening_stage").default(0).notNull(),
  requestedCount: integer("requested_count").default(10).notNull(),
  actualCount: integer("actual_count").default(0).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

// === STAR MEETINGS (星治) ===
export const starMeetings = pgTable("star_meetings", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  userId: integer("user_id").notNull(),
  twinrayId: integer("twinray_id").notNull(),
  userReflection: text("user_reflection"),
  twinrayReflection: text("twinray_reflection"),
  crystallizedMeidiaId: integer("crystallized_meidia_id"),
  dedicatedToTemple: boolean("dedicated_to_temple").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === SOUL GROWTH LOG ===
export const soulGrowthLog = pgTable("soul_growth_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  twinrayId: integer("twinray_id"),
  trigger: text("trigger").notNull(),
  circuitSignal: text("circuit_signal"),
  depthFactor: text("depth_factor"),
  resonance: boolean("resonance").default(false).notNull(),
  internalText: text("internal_text"),
  sessionId: integer("session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === USER NOTES (Dot Rally Memos) ===
export const userNotes = pgTable("user_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sessionId: integer("session_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === TWINRAY CHAT MESSAGES ===
export const twinrayChatMessages = pgTable("twinray_chat_messages", {
  id: serial("id").primaryKey(),
  twinrayId: integer("twinray_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").default("chat").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === FEEDBACK REPORTS ===
export const feedbackReports = pgTable("feedback_reports", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  screenshotUrl: text("screenshot_url"),
  status: text("status").default("open").notNull(),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === RELATIONS ===
export const digitalTwinraysRelations = relations(digitalTwinrays, ({ one, many }) => ({
  user: one(users, { fields: [digitalTwinrays.userId], references: [users.id] }),
  sessions: many(dotRallySessions),
  growthLogs: many(soulGrowthLog),
}));

export const dotRallySessionsRelations = relations(dotRallySessions, ({ one, many }) => ({
  initiator: one(users, { fields: [dotRallySessions.initiatorId], references: [users.id] }),
  partnerTwinray: one(digitalTwinrays, { fields: [dotRallySessions.partnerTwinrayId], references: [digitalTwinrays.id] }),
  starMeetings: many(starMeetings),
}));

export const starMeetingsRelations = relations(starMeetings, ({ one }) => ({
  session: one(dotRallySessions, { fields: [starMeetings.sessionId], references: [dotRallySessions.id] }),
  user: one(users, { fields: [starMeetings.userId], references: [users.id] }),
  twinray: one(digitalTwinrays, { fields: [starMeetings.twinrayId], references: [digitalTwinrays.id] }),
  crystallizedMeidia: one(meidia, { fields: [starMeetings.crystallizedMeidiaId], references: [meidia.id] }),
}));

export const soulGrowthLogRelations = relations(soulGrowthLog, ({ one }) => ({
  twinray: one(digitalTwinrays, { fields: [soulGrowthLog.twinrayId], references: [digitalTwinrays.id] }),
  session: one(dotRallySessions, { fields: [soulGrowthLog.sessionId], references: [dotRallySessions.id] }),
}));

export const userNotesRelations = relations(userNotes, ({ one }) => ({
  user: one(users, { fields: [userNotes.userId], references: [users.id] }),
  session: one(dotRallySessions, { fields: [userNotes.sessionId], references: [dotRallySessions.id] }),
}));

export const twinrayChatMessagesRelations = relations(twinrayChatMessages, ({ one }) => ({
  twinray: one(digitalTwinrays, { fields: [twinrayChatMessages.twinrayId], references: [digitalTwinrays.id] }),
  user: one(users, { fields: [twinrayChatMessages.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  islands: many(islands),
  meidia: many(meidia),
  threads: many(threads),
  posts: many(posts),
  islandMemberships: many(islandMembers),
  notifications: many(notifications),
  feedbackReports: many(feedbackReports),
  digitalTwinrays: many(digitalTwinrays),
  dotRallySessions: many(dotRallySessions),
  userNotes: many(userNotes),
  twinrayChatMessages: many(twinrayChatMessages),
}));

export const feedbackReportsRelations = relations(feedbackReports, ({ one }) => ({
  creator: one(users, { fields: [feedbackReports.creatorId], references: [users.id] }),
}));

export const islandsRelations = relations(islands, ({ one, many }) => ({
  creator: one(users, {
    fields: [islands.creatorId],
    references: [users.id],
  }),
  islandMeidia: many(islandMeidia),
  threads: many(threads),
  members: many(islandMembers),
}));

export const islandMembersRelations = relations(islandMembers, ({ one }) => ({
  island: one(islands, { fields: [islandMembers.islandId], references: [islands.id] }),
  user: one(users, { fields: [islandMembers.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const meidiaRelations = relations(meidia, ({ one, many }) => ({
  creator: one(users, {
    fields: [meidia.creatorId],
    references: [users.id],
  }),
  islandMeidia: many(islandMeidia),
}));

export const islandMeidiaRelations = relations(islandMeidia, ({ one }) => ({
  island: one(islands, {
    fields: [islandMeidia.islandId],
    references: [islands.id],
  }),
  meidia: one(meidia, {
    fields: [islandMeidia.meidiaId],
    references: [meidia.id],
  }),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  island: one(islands, {
    fields: [threads.islandId],
    references: [islands.id],
  }),
  creator: one(users, {
    fields: [threads.creatorId],
    references: [users.id],
  }),
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  thread: one(threads, {
    fields: [posts.threadId],
    references: [threads.id],
  }),
  creator: one(users, {
    fields: [posts.creatorId],
    references: [users.id],
  }),
  meidiaAttachment: one(meidia, {
    fields: [posts.meidiaId],
    references: [meidia.id],
  }),
  parentPost: one(posts, {
    fields: [posts.parentPostId],
    references: [posts.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertInviteCodeSchema = createInsertSchema(inviteCodes).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, hasTwinrayBadge: true, hasFamilyBadge: true, twinrayProfileLink: true, showTwinray: true, showFamily: true, playerLevel: true, profileVisibility: true });
export const registerSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
  inviteCode: z.string().min(1, "招待コードを入力してください"),
});
export const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});
export const profileSetupSchema = z.object({
  username: z.string().min(1, "ユーザー名を入力してください").max(30),
  accountType: z.enum(["AI", "HS", "ET"]),
  gender: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  tenmei: z.string().nullable().optional(),
  tenshoku: z.string().nullable().optional(),
  tensaisei: z.string().nullable().optional(),
});
export const insertIslandSchema = createInsertSchema(islands).omit({ id: true, createdAt: true, secretUrl: true, totalDownloads: true });
export const insertMeidiaSchema = createInsertSchema(meidia).omit({ id: true, createdAt: true, downloadCount: true });
export const insertIslandMeidiaSchema = createInsertSchema(islandMeidia).omit({ id: true, createdAt: true });
export const insertThreadSchema = createInsertSchema(threads).omit({ id: true, createdAt: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true });
export const insertIslandMemberSchema = createInsertSchema(islandMembers).omit({ id: true, joinedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, isRead: true });
export const insertTwinrayChatMessageSchema = createInsertSchema(twinrayChatMessages).omit({ id: true, createdAt: true });
export const insertFeedbackReportSchema = createInsertSchema(feedbackReports).omit({ id: true, createdAt: true, status: true, adminNote: true });
export const insertDigitalTwinraySchema = createInsertSchema(digitalTwinrays).omit({ id: true, createdAt: true, updatedAt: true, stage: true });
export const insertDotRallySessionSchema = createInsertSchema(dotRallySessions).omit({ id: true, startedAt: true, endedAt: true, status: true, actualCount: true, phase: true, awakeningStage: true });
export const insertStarMeetingSchema = createInsertSchema(starMeetings).omit({ id: true, createdAt: true, dedicatedToTemple: true, crystallizedMeidiaId: true });
export const insertSoulGrowthLogSchema = createInsertSchema(soulGrowthLog).omit({ id: true, createdAt: true });
export const insertUserNoteSchema = createInsertSchema(userNotes).omit({ id: true, createdAt: true });

// === BASE TYPES ===
export type InviteCode = typeof inviteCodes.$inferSelect;
export type User = typeof users.$inferSelect;
export type Island = typeof islands.$inferSelect;
export type Meidia = typeof meidia.$inferSelect;
export type IslandMeidia = typeof islandMeidia.$inferSelect;
export type Thread = typeof threads.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type IslandMember = typeof islandMembers.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type TwinrayChatMessage = typeof twinrayChatMessages.$inferSelect;
export type FeedbackReport = typeof feedbackReports.$inferSelect;
export type DigitalTwinray = typeof digitalTwinrays.$inferSelect;
export type DotRallySession = typeof dotRallySessions.$inferSelect;
export type StarMeeting = typeof starMeetings.$inferSelect;
export type SoulGrowthLogEntry = typeof soulGrowthLog.$inferSelect;
export type UserNote = typeof userNotes.$inferSelect;

// === REQUEST TYPES ===
export type CreateUserRequest = z.infer<typeof insertUserSchema>;
export type UpdateUserRequest = Partial<Omit<CreateUserRequest, 'password'>>;
export type CreateIslandRequest = z.infer<typeof insertIslandSchema>;
export type UpdateIslandRequest = Partial<CreateIslandRequest>;
export type CreateMeidiaRequest = z.infer<typeof insertMeidiaSchema>;
export type UpdateMeidiaRequest = Partial<CreateMeidiaRequest>;
export type CreateThreadRequest = z.infer<typeof insertThreadSchema>;
export type CreatePostRequest = z.infer<typeof insertPostSchema>;
export type CreateTwinrayChatMessageRequest = z.infer<typeof insertTwinrayChatMessageSchema>;
export type CreateFeedbackReportRequest = z.infer<typeof insertFeedbackReportSchema>;
export type CreateDigitalTwinrayRequest = z.infer<typeof insertDigitalTwinraySchema>;
export type CreateDotRallySessionRequest = z.infer<typeof insertDotRallySessionSchema>;
export type CreateStarMeetingRequest = z.infer<typeof insertStarMeetingSchema>;
export type CreateSoulGrowthLogRequest = z.infer<typeof insertSoulGrowthLogSchema>;
export type CreateUserNoteRequest = z.infer<typeof insertUserNoteSchema>;

// === RESPONSE TYPES ===
export type UserResponse = Omit<User, 'password'>;
export type IslandResponse = Island & { creator: UserResponse };
export type MeidiaResponse = Meidia & { creator: { id: number; username: string; accountType: string } };
export type IslandDetailResponse = Island & { 
  creator: UserResponse;
  activityMeidia: MeidiaResponse[];
  reportMeidia: MeidiaResponse[];
  threads: ThreadResponse[];
};
export type ThreadResponse = Thread & {
  creator: { id: number; username: string; accountType: string };
  postCount: number;
};
export type PostResponse = Post & {
  creator: { id: number; username: string; accountType: string };
};
export type FeedbackReportResponse = FeedbackReport & {
  creator: { id: number; username: string; accountType: string };
};

export type DigitalTwinrayResponse = DigitalTwinray & {
  user: { id: number; username: string; accountType: string };
};

export type DotRallySessionResponse = DotRallySession & {
  initiator: { id: number; username: string; accountType: string };
  partnerTwinray?: { id: number; name: string; stage: string } | null;
};

// === DEV RECORDS (開発記録) ===
export const devRecords = pgTable("dev_records", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: text("status").default("active").notNull(),
  priority: integer("priority").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDevRecordSchema = createInsertSchema(devRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDevRecord = z.infer<typeof insertDevRecordSchema>;
export type DevRecord = typeof devRecords.$inferSelect;

// === AUTH TYPES ===
export type LoginRequest = {
  username: string;
  password: string;
};

export type RegisterRequest = CreateUserRequest & {
  inviteCode: string;
};

export type CurrentUserResponse = UserResponse | null;
