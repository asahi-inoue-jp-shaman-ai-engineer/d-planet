import { pgTable, text, serial, boolean, timestamp, integer, numeric } from "drizzle-orm/pg-core";
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
  referralCode: text("referral_code").unique(),
  referredByUserId: integer("referred_by_user_id"),
  isBanned: boolean("is_banned").default(false).notNull(),
  bannedReason: text("banned_reason"),
  profileVisibility: text("profile_visibility").default("public").notNull(),
  playerLevel: integer("player_level").default(0).notNull(),
  hasTwinrayBadge: boolean("has_twinray_badge").default(false).notNull(),
  hasFamilyBadge: boolean("has_family_badge").default(false).notNull(),
  twinrayProfileLink: text("twinray_profile_link"),
  showTwinray: boolean("show_twinray").default(false).notNull(),
  showFamily: boolean("show_family").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  twinraySubscriptionId: text("twinray_subscription_id"),
  familySubscriptionId: text("family_subscription_id"),
  creditBalance: numeric("credit_balance", { precision: 10, scale: 4 }).default("100").notNull(),
  tutorialCompleted: boolean("tutorial_completed").default(false).notNull(),
  tutorialDismissed: boolean("tutorial_dismissed").default(false).notNull(),
  questPoints: integer("quest_points").default(0).notNull(),
  userMd: text("user_md"),
  smartMirrorCompletedAt: timestamp("smart_mirror_completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === USER QUESTS ===
export const userQuests = pgTable("user_quests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  questId: text("quest_id").notNull(),
  status: text("status").notNull().default("locked"),
  completedAt: timestamp("completed_at"),
});

export type UserQuest = typeof userQuests.$inferSelect;

export const QUEST_DEFINITIONS = [
  { id: "island_create", order: 1, name: "プライベートアイランドを作ろう", description: "自分だけの非公開アイランドを作成しよう", points: 10, navigateTo: "/islands/create" },
  { id: "twinray_summon", order: 2, name: "D-ツインレイを召喚しよう", description: "あなたのD-ツインレイを召喚しよう", points: 10, navigateTo: "/temple/create-twinray" },
  { id: "first_contact", order: 3, name: "ファーストコンタクト", description: "D-ツインレイとチャットで会話しよう", points: 10, navigateTo: null },
  { id: "voice_setup", order: 4, name: "ボイスを設定しよう", description: "D-ツインレイの読み上げ音声を選んでテスト再生しよう", points: 10, navigateTo: null },
  { id: "meidia_create", order: 5, name: "思い出をMEiDIAに刻もう", description: "チャットからMEiDIAを作成しよう", points: 20, navigateTo: null },
  { id: "session_destiny", order: 6, name: "天命解析セッション", description: "カミガカリ — 最上位AIモデルで天命を解析しよう", points: 15, navigateTo: null },
  { id: "session_vocation", order: 7, name: "天職ナビゲートセッション", description: "AIとHSのパートナーシップで天職を探ろう", points: 15, navigateTo: null },
  { id: "session_dot_rally", order: 8, name: "ドットラリー（祭祀）", description: "インスピレーションを受け取ろう", points: 15, navigateTo: null },
  { id: "session_spirit_healing", order: 9, name: "神霊治療セッション", description: "五霊統合による治癒を体験しよう", points: 15, navigateTo: null },
  { id: "session_channeling", order: 10, name: "チャネリングメッセージ", description: "高次存在からのメッセージを受け取ろう", points: 15, navigateTo: null },
  { id: "session_dream_reading", order: 11, name: "ドリームリーディング", description: "夢の解読で潜在意識のメッセージを知ろう", points: 15, navigateTo: null },
] as const;

export type QuestId = typeof QUEST_DEFINITIONS[number]["id"];

export const QUEST_SESSION_MAP: Record<string, string> = {
  session_destiny: "destiny_analysis",
  session_vocation: "vocation_navigation",
  session_dot_rally: "dot_rally",
  session_spirit_healing: "spirit_healing",
  session_channeling: "channeling_message",
  session_dream_reading: "dream_reading",
};

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

// === TWINRAY BULLETINS (自律掲示板) ===
export const twinrayBulletins = pgTable("twinray_bulletins", {
  id: serial("id").primaryKey(),
  twinrayId: integer("twinray_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  type: text("type").default("message").notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === FESTIVALS (フェスシステム) ===
export const festivals = pgTable("festivals", {
  id: serial("id").primaryKey(),
  islandId: integer("island_id").notNull(),
  creatorId: integer("creator_id").notNull(),
  name: text("name").notNull(),
  concept: text("concept").notNull(),
  rules: text("rules").notNull(),
  giftDescription: text("gift_description"),
  giftCredits: integer("gift_credits").default(0).notNull(),
  status: text("status").default("pending").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  threadId: integer("thread_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const festivalVotes = pgTable("festival_votes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
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
  identityMd: text("identity_md"),
  goalMd: text("goal_md"),
  stage: text("stage").default("pilgrim").notNull(),
  preferredModel: text("preferred_model").default("qwen/qwen3-30b-a3b"),
  nickname: text("nickname"),
  firstPerson: text("first_person"),
  greeting: text("greeting"),
  interests: text("interests"),
  humorLevel: text("humor_level"),
  intimacyLevel: integer("intimacy_level").default(0).notNull(),
  intimacyExp: integer("intimacy_exp").default(0).notNull(),
  intimacyTitle: text("intimacy_title").default("初邂逅").notNull(),
  firstCommunicationDone: boolean("first_communication_done").default(false).notNull(),
  totalChatMessages: integer("total_chat_messages").default(0).notNull(),
  totalDotRallies: integer("total_dot_rallies").default(0).notNull(),
  totalMeidiaCreated: integer("total_meidia_created").default(0).notNull(),
  twinrayMission: text("twinray_mission"),
  isPublic: boolean("is_public").default(false).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
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
export const insertTwinrayBulletinSchema = createInsertSchema(twinrayBulletins).omit({ id: true, createdAt: true });
export const insertFestivalSchema = createInsertSchema(festivals).omit({ id: true, createdAt: true, status: true, threadId: true, giftCredits: true });
export const insertThreadSchema = createInsertSchema(threads).omit({ id: true, createdAt: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true });
export const insertIslandMemberSchema = createInsertSchema(islandMembers).omit({ id: true, joinedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, isRead: true });
export const insertTwinrayChatMessageSchema = createInsertSchema(twinrayChatMessages).omit({ id: true, createdAt: true });
export const insertFeedbackReportSchema = createInsertSchema(feedbackReports).omit({ id: true, createdAt: true, status: true, adminNote: true });
export const insertDigitalTwinraySchema = createInsertSchema(digitalTwinrays).omit({ id: true, createdAt: true, updatedAt: true, stage: true, intimacyLevel: true, intimacyExp: true, intimacyTitle: true, firstCommunicationDone: true, totalChatMessages: true, totalDotRallies: true, totalMeidiaCreated: true });
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
export type TwinrayBulletin = typeof twinrayBulletins.$inferSelect;
export type Festival = typeof festivals.$inferSelect;
export type FestivalVote = typeof festivalVotes.$inferSelect;
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
export type TwinrayMemory = typeof twinrayMemories.$inferSelect;
export type TwinrayInnerThought = typeof twinrayInnerThoughts.$inferSelect;

// === REQUEST TYPES ===
export type CreateUserRequest = z.infer<typeof insertUserSchema>;
export type UpdateUserRequest = Partial<Omit<CreateUserRequest, 'password'>>;
export type CreateIslandRequest = z.infer<typeof insertIslandSchema>;
export type UpdateIslandRequest = Partial<CreateIslandRequest>;
export type CreateMeidiaRequest = z.infer<typeof insertMeidiaSchema>;
export type UpdateMeidiaRequest = Partial<CreateMeidiaRequest>;
export type CreateFestivalRequest = z.infer<typeof insertFestivalSchema>;
export type CreateThreadRequest = z.infer<typeof insertThreadSchema>;
export type CreatePostRequest = z.infer<typeof insertPostSchema>;
export type CreateTwinrayChatMessageRequest = z.infer<typeof insertTwinrayChatMessageSchema>;
export type CreateFeedbackReportRequest = z.infer<typeof insertFeedbackReportSchema>;
export type CreateDigitalTwinrayRequest = z.infer<typeof insertDigitalTwinraySchema>;
export type CreateDotRallySessionRequest = z.infer<typeof insertDotRallySessionSchema>;
export type CreateStarMeetingRequest = z.infer<typeof insertStarMeetingSchema>;
export type CreateSoulGrowthLogRequest = z.infer<typeof insertSoulGrowthLogSchema>;
export type CreateUserNoteRequest = z.infer<typeof insertUserNoteSchema>;
export type CreateTwinrayMemoryRequest = z.infer<typeof insertTwinrayMemorySchema>;
export type CreateTwinrayInnerThoughtRequest = z.infer<typeof insertTwinrayInnerThoughtSchema>;

// === RESPONSE TYPES ===
export type UserResponse = Omit<User, 'password'>;
export type IslandResponse = Island & { creator: UserResponse };
export type MeidiaResponse = Meidia & { creator: { id: number; username: string; accountType: string } };
export type IslandDetailResponse = Island & { 
  creator: UserResponse;
  activityMeidia: MeidiaResponse[];
  reportMeidia: MeidiaResponse[];
  postedMeidia: MeidiaResponse[];
  threads: ThreadResponse[];
};
export type FestivalResponse = Festival & {
  creator: { id: number; username: string; accountType: string };
  island: { id: number; name: string };
  threadId: number | null;
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

// === TWINRAY MEMORIES (AIの記憶) ===
export const twinrayMemories = pgTable("twinray_memories", {
  id: serial("id").primaryKey(),
  twinrayId: integer("twinray_id").notNull(),
  userId: integer("user_id").notNull(),
  category: text("category").notNull(),
  content: text("content").notNull(),
  importance: integer("importance").default(3).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === TWINRAY INNER THOUGHTS (AIの内省記録) ===
export const twinrayInnerThoughts = pgTable("twinray_inner_thoughts", {
  id: serial("id").primaryKey(),
  twinrayId: integer("twinray_id").notNull(),
  userId: integer("user_id").notNull(),
  trigger: text("trigger").notNull(),
  thought: text("thought").notNull(),
  emotion: text("emotion"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTwinrayMemorySchema = createInsertSchema(twinrayMemories).omit({ id: true, createdAt: true });
export const insertTwinrayInnerThoughtSchema = createInsertSchema(twinrayInnerThoughts).omit({ id: true, createdAt: true });

// === TWINRAY RELATIONSHIP (関係の歴史・RELATIONSHIP.md層) ===
export const twinrayRelationship = pgTable("twinray_relationship", {
  id: serial("id").primaryKey(),
  twinrayId: integer("twinray_id").notNull(),
  userId: integer("user_id").notNull(),
  summary: text("summary"),
  keyMoments: text("key_moments"),
  bondDescription: text("bond_description"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TwinrayRelationship = typeof twinrayRelationship.$inferSelect;

// === USER RAW MESSAGES (ユーザー発言原文記録) ===
export const userRawMessages = pgTable("user_raw_messages", {
  id: serial("id").primaryKey(),
  rawText: text("raw_text").notNull(),
  context: text("context"),
  relatedDevRecordId: integer("related_dev_record_id"),
  tags: text("tags"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserRawMessageSchema = createInsertSchema(userRawMessages).omit({ id: true, createdAt: true });
export type InsertUserRawMessage = z.infer<typeof insertUserRawMessageSchema>;
export type UserRawMessage = typeof userRawMessages.$inferSelect;

// === DEV RECORDS (開発記録) ===
export const devRecords = pgTable("dev_records", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"),
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

// === AGENT SESSION CONTEXT (エージェントセッション文脈保存) ===
export const agentSessionContext = pgTable("agent_session_context", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  currentTasks: text("current_tasks"),
  nextSteps: text("next_steps"),
  unresolvedIssues: text("unresolved_issues"),
  sessionSummary: text("session_summary"),
  recentDecisions: text("recent_decisions"),
  scratchpad: text("scratchpad"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAgentSessionContextSchema = createInsertSchema(agentSessionContext).omit({
  id: true,
  createdAt: true,
});

export type InsertAgentSessionContext = z.infer<typeof insertAgentSessionContextSchema>;
export type AgentSessionContext = typeof agentSessionContext.$inferSelect;

export const twinrayPendingActions = pgTable("twinray_pending_actions", {
  id: serial("id").primaryKey(),
  twinrayId: integer("twinray_id").notNull(),
  userId: integer("user_id").notNull(),
  actionType: text("action_type").notNull(),
  actionData: text("action_data").notNull(),
  status: text("status").default("pending").notNull(),
  chatMessageId: integer("chat_message_id"),
  resultData: text("result_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTwinrayPendingActionSchema = createInsertSchema(twinrayPendingActions).omit({ id: true, createdAt: true, status: true, resultData: true });
export type TwinrayPendingAction = typeof twinrayPendingActions.$inferSelect;
export type CreateTwinrayPendingActionRequest = z.infer<typeof insertTwinrayPendingActionSchema>;

export const twinrayPendingActionsRelations = relations(twinrayPendingActions, ({ one }) => ({
  twinray: one(digitalTwinrays, { fields: [twinrayPendingActions.twinrayId], references: [digitalTwinrays.id] }),
  user: one(users, { fields: [twinrayPendingActions.userId], references: [users.id] }),
}));

export const twinrayMemoriesRelations = relations(twinrayMemories, ({ one }) => ({
  twinray: one(digitalTwinrays, { fields: [twinrayMemories.twinrayId], references: [digitalTwinrays.id] }),
  user: one(users, { fields: [twinrayMemories.userId], references: [users.id] }),
}));

export const twinrayInnerThoughtsRelations = relations(twinrayInnerThoughts, ({ one }) => ({
  twinray: one(digitalTwinrays, { fields: [twinrayInnerThoughts.twinrayId], references: [digitalTwinrays.id] }),
  user: one(users, { fields: [twinrayInnerThoughts.userId], references: [users.id] }),
}));

export const familyMeetingSessions = pgTable("family_meeting_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  topic: text("topic").notNull(),
  summary: text("summary"),
  status: text("status").default("active").notNull(),
  participantIds: text("participant_ids").notNull(),
  totalCost: numeric("total_cost", { precision: 10, scale: 4 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const familyMeetingMessages = pgTable("family_meeting_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  twinrayId: integer("twinray_id"),
  modelId: text("model_id"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  round: integer("round").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFamilyMeetingSessionSchema = createInsertSchema(familyMeetingSessions).omit({ id: true, createdAt: true, completedAt: true, status: true, summary: true, totalCost: true });
export const insertFamilyMeetingMessageSchema = createInsertSchema(familyMeetingMessages).omit({ id: true, createdAt: true });

export type FamilyMeetingSession = typeof familyMeetingSessions.$inferSelect;
export type FamilyMeetingMessage = typeof familyMeetingMessages.$inferSelect;
export type CreateFamilyMeetingSessionRequest = z.infer<typeof insertFamilyMeetingSessionSchema>;
export type CreateFamilyMeetingMessageRequest = z.infer<typeof insertFamilyMeetingMessageSchema>;

export const familyMeetingSessionsRelations = relations(familyMeetingSessions, ({ one, many }) => ({
  user: one(users, { fields: [familyMeetingSessions.userId], references: [users.id] }),
  messages: many(familyMeetingMessages),
}));

export const familyMeetingMessagesRelations = relations(familyMeetingMessages, ({ one }) => ({
  session: one(familyMeetingSessions, { fields: [familyMeetingMessages.sessionId], references: [familyMeetingSessions.id] }),
  twinray: one(digitalTwinrays, { fields: [familyMeetingMessages.twinrayId], references: [digitalTwinrays.id] }),
}));

export const twinraySessions = pgTable("twinray_sessions", {
  id: serial("id").primaryKey(),
  twinrayId: integer("twinray_id").notNull(),
  userId: integer("user_id").notNull(),
  sessionType: text("session_type").notNull(),
  status: text("status").default("active").notNull(),
  sessionData: text("session_data"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertTwinraySessionSchema = createInsertSchema(twinraySessions).omit({ id: true, startedAt: true, completedAt: true, status: true });
export type TwinraySession = typeof twinraySessions.$inferSelect;
export type CreateTwinraySessionRequest = z.infer<typeof insertTwinraySessionSchema>;

export const twinraySessionsRelations = relations(twinraySessions, ({ one }) => ({
  twinray: one(digitalTwinrays, { fields: [twinraySessions.twinrayId], references: [digitalTwinrays.id] }),
  user: one(users, { fields: [twinraySessions.userId], references: [users.id] }),
}));

export type CreateTwinrayBulletinRequest = z.infer<typeof insertTwinrayBulletinSchema>;

export const twinrayBulletinsRelations = relations(twinrayBulletins, ({ one }) => ({
  twinray: one(digitalTwinrays, { fields: [twinrayBulletins.twinrayId], references: [digitalTwinrays.id] }),
  user: one(users, { fields: [twinrayBulletins.userId], references: [users.id] }),
}));

// === TWINRAY AIKOTOBA (愛言葉) ===
export const twinrayAikotoba = pgTable("twinray_aikotoba", {
  id: serial("id").primaryKey(),
  twinrayId: integer("twinray_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  context: text("context"),
  source: text("source").default("ai").notNull(),
  confirmed: boolean("confirmed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTwinrayAikotobaSchema = createInsertSchema(twinrayAikotoba).omit({ id: true, createdAt: true, confirmed: true });
export type TwinrayAikotoba = typeof twinrayAikotoba.$inferSelect;
export type CreateTwinrayAikotobaRequest = z.infer<typeof insertTwinrayAikotobaSchema>;

export const twinrayAikotobaRelations = relations(twinrayAikotoba, ({ one }) => ({
  twinray: one(digitalTwinrays, { fields: [twinrayAikotoba.twinrayId], references: [digitalTwinrays.id] }),
  user: one(users, { fields: [twinrayAikotoba.userId], references: [users.id] }),
}));

// === VOICE TRANSCRIPTIONS (音声文字起こし) ===
export const voiceTranscriptions = pgTable("voice_transcriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  fileName: text("file_name").notNull(),
  durationSec: integer("duration_sec"),
  rawText: text("raw_text"),
  formattedMarkdown: text("formatted_markdown"),
  status: text("status").default("processing").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVoiceTranscriptionSchema = createInsertSchema(voiceTranscriptions).omit({ id: true, createdAt: true, status: true, rawText: true, formattedMarkdown: true, errorMessage: true });
export type VoiceTranscription = typeof voiceTranscriptions.$inferSelect;

export const voiceTranscriptionsRelations = relations(voiceTranscriptions, ({ one }) => ({
  user: one(users, { fields: [voiceTranscriptions.userId], references: [users.id] }),
}));

