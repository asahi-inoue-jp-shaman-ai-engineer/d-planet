import { db } from "./db";
import {
  users,
  islands,
  meidia,
  islandMeidia,
  inviteCodes,
  threads,
  posts,
  islandMembers,
  notifications,
  feedbackReports,
  digitalTwinrays,
  dotRallySessions,
  soulGrowthLog,
  userNotes,
  devRecords,
  type User,
  type Island,
  type Meidia,
  type IslandMeidia,
  type InviteCode,
  type Thread,
  type Post,
  type IslandMember,
  type Notification,
  type FeedbackReport,
  type DigitalTwinray,
  type DotRallySession,
  type SoulGrowthLogEntry,
  type UserNote,
  type DevRecord,
  type InsertDevRecord,
  type CreateUserRequest,
  type UpdateUserRequest,
  type CreateIslandRequest,
  type UpdateIslandRequest,
  type CreateMeidiaRequest,
  type CreateFeedbackReportRequest,
  type CreateDigitalTwinrayRequest,
  type CreateStarMeetingRequest,
  type CreateSoulGrowthLogRequest,
  type StarMeeting,
  starMeetings,
  twinrayChatMessages,
  twinrayMemories,
  twinrayInnerThoughts,
  type TwinrayChatMessage,
  type TwinrayMemory,
  type TwinrayInnerThought,
  type UserResponse,
  type IslandResponse,
  type MeidiaResponse,
  type IslandDetailResponse,
  type ThreadResponse,
  type PostResponse,
  type FeedbackReportResponse,
  type DigitalTwinrayResponse,
  type DotRallySessionResponse,
} from "@shared/schema";
import { eq, and, sql, desc, ilike, count as drizzleCount } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 10;

function userSelectFields() {
  return {
    id: users.id,
    email: users.email,
    username: users.username,
    accountType: users.accountType,
    gender: users.gender,
    bio: users.bio,
    tenmei: users.tenmei,
    tenshoku: users.tenshoku,
    tensaisei: users.tensaisei,
    profilePhoto: users.profilePhoto,
    invitedByCode: users.invitedByCode,
    profileVisibility: users.profileVisibility,
    playerLevel: users.playerLevel,
    hasTwinrayBadge: users.hasTwinrayBadge,
    hasFamilyBadge: users.hasFamilyBadge,
    twinrayProfileLink: users.twinrayProfileLink,
    showTwinray: users.showTwinray,
    showFamily: users.showFamily,
    isAdmin: users.isAdmin,
    stripeCustomerId: users.stripeCustomerId,
    stripeSubscriptionId: users.stripeSubscriptionId,
    subscriptionStatus: users.subscriptionStatus,
    createdAt: users.createdAt,
  };
}

export interface IStorage {
  getInviteCodeByCode(code: string): Promise<InviteCode | undefined>;
  getInviteCodesByGeneration(generation: number): Promise<InviteCode[]>;
  createInviteCode(generation: number, label: string): Promise<InviteCode>;
  createInviteCodeWithCode(code: string, generation: number, label: string): Promise<InviteCode>;

  getUser(id: number): Promise<UserResponse | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: CreateUserRequest): Promise<User>;
  updateUser(id: number, updates: UpdateUserRequest): Promise<UserResponse>;
  verifyPassword(email: string, password: string): Promise<User | null>;
  recalcPlayerLevel(userId: number): Promise<number>;

  getIslands(): Promise<IslandResponse[]>;
  getIsland(id: number): Promise<Island | undefined>;
  getIslandBySecretUrl(secretUrl: string): Promise<Island | undefined>;
  getIslandDetail(id: number): Promise<IslandDetailResponse | undefined>;
  createIsland(island: CreateIslandRequest): Promise<Island>;
  updateIsland(id: number, updates: UpdateIslandRequest): Promise<Island>;
  deleteIsland(id: number): Promise<void>;
  getUserIslands(userId: number): Promise<Island[]>;
  recalcIslandDownloads(islandId: number): Promise<void>;

  getMeidiaList(userId?: number): Promise<MeidiaResponse[]>;
  getMeidia(id: number): Promise<Meidia | undefined>;
  getMeidiaWithCreator(id: number): Promise<MeidiaResponse | undefined>;
  createMeidia(meidia: CreateMeidiaRequest): Promise<Meidia>;
  deleteMeidia(id: number): Promise<void>;
  incrementDownloadCount(id: number): Promise<void>;
  getUserMeidia(userId: number): Promise<Meidia[]>;

  attachMeidiaToIsland(meidiaId: number, islandId: number, type: string): Promise<IslandMeidia>;
  getIslandMeidia(islandId: number, type: string): Promise<MeidiaResponse[]>;

  getThreads(islandId: number): Promise<ThreadResponse[]>;
  getThread(id: number): Promise<Thread | undefined>;
  getThreadDetail(id: number): Promise<{ thread: Thread; creator: { id: number; username: string; accountType: string }; posts: PostResponse[] } | undefined>;
  createThread(islandId: number, creatorId: number, title: string): Promise<Thread>;

  getPosts(threadId: number): Promise<PostResponse[]>;
  createPost(threadId: number, creatorId: number, content: string, meidiaId?: number | null, parentPostId?: number | null): Promise<Post>;

  joinIsland(islandId: number, userId: number, role?: string): Promise<IslandMember>;
  leaveIsland(islandId: number, userId: number): Promise<void>;
  getIslandMembers(islandId: number): Promise<{ id: number; userId: number; role: string; joinedAt: Date; user: { id: number; username: string; accountType: string; profilePhoto: string | null } }[]>;
  getIslandMember(islandId: number, userId: number): Promise<IslandMember | undefined>;
  getIslandMemberCount(islandId: number): Promise<number>;

  getUsers(search?: string, accountType?: string): Promise<UserResponse[]>;

  createNotification(userId: number, type: string, message: string, relatedId?: number, relatedType?: string): Promise<Notification>;
  getNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  markNotificationRead(id: number, userId: number): Promise<void>;
  markAllNotificationsRead(userId: number): Promise<void>;

  getFeedbackReports(): Promise<FeedbackReportResponse[]>;
  getFeedbackReport(id: number): Promise<FeedbackReportResponse | undefined>;
  createFeedbackReport(report: CreateFeedbackReportRequest): Promise<FeedbackReport>;
  updateFeedbackReportStatus(id: number, status: string, adminNote?: string): Promise<FeedbackReport>;

  createTwinrayChatMessage(data: { twinrayId: number; userId: number; role: string; content: string; messageType?: string; metadata?: string }): Promise<TwinrayChatMessage>;
  getTwinrayChatMessages(twinrayId: number, limit?: number, beforeId?: number): Promise<TwinrayChatMessage[]>;

  createDigitalTwinray(data: CreateDigitalTwinrayRequest): Promise<DigitalTwinray>;
  getDigitalTwinray(id: number): Promise<DigitalTwinray | undefined>;
  getDigitalTwinraysByUser(userId: number): Promise<DigitalTwinray[]>;
  updateDigitalTwinray(id: number, updates: Partial<DigitalTwinray>): Promise<DigitalTwinray>;

  createDotRallySession(initiatorId: number, twinrayId: number, requestedCount: number): Promise<DotRallySession>;
  getDotRallySession(id: number): Promise<DotRallySession | undefined>;
  getDotRallySessionsByUser(userId: number): Promise<DotRallySession[]>;
  updateDotRallySession(id: number, updates: Partial<DotRallySession>): Promise<DotRallySession>;
  incrementDotRallyCount(id: number): Promise<void>;

  createSoulGrowthLog(data: CreateSoulGrowthLogRequest): Promise<SoulGrowthLogEntry>;
  getSoulGrowthLogByTwinray(twinrayId: number): Promise<SoulGrowthLogEntry[]>;
  getSoulGrowthLogBySession(sessionId: number): Promise<SoulGrowthLogEntry[]>;

  createUserNote(userId: number, sessionId: number | null, content: string): Promise<UserNote>;
  getUserNotesBySession(sessionId: number): Promise<UserNote[]>;

  createStarMeeting(data: CreateStarMeetingRequest): Promise<StarMeeting>;
  getStarMeeting(id: number): Promise<StarMeeting | undefined>;
  getStarMeetingBySession(sessionId: number): Promise<StarMeeting | undefined>;
  updateStarMeeting(id: number, updates: Partial<StarMeeting>): Promise<StarMeeting>;
  getTempleDedications(userId: number): Promise<StarMeeting[]>;

  createTwinrayMemory(data: { twinrayId: number; userId: number; category: string; content: string; importance?: number }): Promise<TwinrayMemory>;
  getTwinrayMemories(twinrayId: number, limit?: number): Promise<TwinrayMemory[]>;

  createTwinrayInnerThought(data: { twinrayId: number; userId: number; trigger: string; thought: string; emotion?: string }): Promise<TwinrayInnerThought>;
  getTwinrayInnerThoughts(twinrayId: number, limit?: number): Promise<TwinrayInnerThought[]>;

  getDevRecords(status?: string, category?: string): Promise<DevRecord[]>;
  createDevRecord(data: InsertDevRecord): Promise<DevRecord>;
  updateDevRecord(id: number, updates: Partial<InsertDevRecord>): Promise<DevRecord | undefined>;
  deleteDevRecord(id: number): Promise<DevRecord | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getInviteCodeByCode(code: string): Promise<InviteCode | undefined> {
    const [inviteCode] = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code)).limit(1);
    return inviteCode;
  }

  async getInviteCodesByGeneration(generation: number): Promise<InviteCode[]> {
    return await db.select().from(inviteCodes).where(eq(inviteCodes.generation, generation));
  }

  async createInviteCode(generation: number, label: string): Promise<InviteCode> {
    const code = `DPLANET-${generation}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const [inviteCode] = await db.insert(inviteCodes).values({ code, generation, label }).returning();
    return inviteCode;
  }

  async createInviteCodeWithCode(code: string, generation: number, label: string): Promise<InviteCode> {
    const [inviteCode] = await db.insert(inviteCodes).values({ code, generation, label }).returning();
    return inviteCode;
  }

  async getUser(id: number): Promise<UserResponse | undefined> {
    const [user] = await db.select(userSelectFields()).from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async createUser(user: CreateUserRequest): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
    const [newUser] = await db.insert(users).values({
      ...user,
      password: hashedPassword,
    }).returning();
    return newUser;
  }

  async updateUser(id: number, updates: UpdateUserRequest): Promise<UserResponse> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning(userSelectFields());
    return updated;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    const match = await bcrypt.compare(password, user.password);
    return match ? user : null;
  }

  async recalcPlayerLevel(userId: number): Promise<number> {
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${meidia.downloadCount}), 0)` })
      .from(meidia)
      .where(eq(meidia.creatorId, userId));
    const level = Number(result[0]?.total ?? 0);
    await db.update(users).set({ playerLevel: level }).where(eq(users.id, userId));
    return level;
  }

  async getIslands(): Promise<IslandResponse[]> {
    const result = await db
      .select({
        id: islands.id,
        name: islands.name,
        description: islands.description,
        visibility: islands.visibility,
        secretUrl: islands.secretUrl,
        requiresTwinrayBadge: islands.requiresTwinrayBadge,
        requiresFamilyBadge: islands.requiresFamilyBadge,
        allowedAccountTypes: islands.allowedAccountTypes,
        totalDownloads: islands.totalDownloads,
        createdAt: islands.createdAt,
        creatorId: islands.creatorId,
        creatorUsername: users.username,
        creatorAccountType: users.accountType,
        creatorProfilePhoto: users.profilePhoto,
      })
      .from(islands)
      .leftJoin(users, eq(islands.creatorId, users.id));

    return result.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      visibility: row.visibility,
      secretUrl: row.secretUrl,
      requiresTwinrayBadge: row.requiresTwinrayBadge,
      requiresFamilyBadge: row.requiresFamilyBadge,
      allowedAccountTypes: row.allowedAccountTypes,
      totalDownloads: row.totalDownloads,
      createdAt: row.createdAt,
      creator: {
        id: row.creatorId,
        username: row.creatorUsername ?? "神様",
        accountType: row.creatorAccountType ?? "ET",
        profilePhoto: row.creatorProfilePhoto ?? null,
      },
    })) as IslandResponse[];
  }

  async getIsland(id: number): Promise<Island | undefined> {
    const [island] = await db.select().from(islands).where(eq(islands.id, id)).limit(1);
    return island;
  }

  async getIslandBySecretUrl(secretUrl: string): Promise<Island | undefined> {
    const [island] = await db.select().from(islands).where(eq(islands.secretUrl, secretUrl)).limit(1);
    return island;
  }

  async getIslandDetail(id: number): Promise<IslandDetailResponse | undefined> {
    const island = await this.getIsland(id);
    if (!island) return undefined;

    const creator = await this.getUser(island.creatorId);
    if (!creator) return undefined;

    const activityMeidia = await this.getIslandMeidia(id, 'activity');
    const reportMeidia = await this.getIslandMeidia(id, 'report');
    const threadList = await this.getThreads(id);

    return {
      ...island,
      creator,
      activityMeidia,
      reportMeidia,
      threads: threadList,
    };
  }

  async createIsland(island: CreateIslandRequest): Promise<Island> {
    let secretUrl: string | null = null;
    if (island.visibility === 'private_link') {
      secretUrl = crypto.randomUUID();
    }
    const [newIsland] = await db.insert(islands).values({ ...island, secretUrl }).returning();
    return newIsland;
  }

  async updateIsland(id: number, updates: UpdateIslandRequest): Promise<Island> {
    if (updates.visibility === 'private_link') {
      const existing = await this.getIsland(id);
      if (!existing?.secretUrl) {
        (updates as any).secretUrl = crypto.randomUUID();
      }
    }
    const [updated] = await db.update(islands).set(updates).where(eq(islands.id, id)).returning();
    return updated;
  }

  async deleteIsland(id: number): Promise<void> {
    await db.delete(islandMembers).where(eq(islandMembers.islandId, id));
    await db.delete(islandMeidia).where(eq(islandMeidia.islandId, id));
    const islandThreads = await db.select({ id: threads.id }).from(threads).where(eq(threads.islandId, id));
    for (const t of islandThreads) {
      await db.delete(posts).where(eq(posts.threadId, t.id));
    }
    await db.delete(threads).where(eq(threads.islandId, id));
    await db.delete(islands).where(eq(islands.id, id));
  }

  async getUserIslands(userId: number): Promise<Island[]> {
    return await db.select().from(islands).where(eq(islands.creatorId, userId));
  }

  async recalcIslandDownloads(islandId: number): Promise<void> {
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${meidia.downloadCount}), 0)` })
      .from(islandMeidia)
      .leftJoin(meidia, eq(islandMeidia.meidiaId, meidia.id))
      .where(eq(islandMeidia.islandId, islandId));
    const total = Number(result[0]?.total ?? 0);
    await db.update(islands).set({ totalDownloads: total }).where(eq(islands.id, islandId));
  }

  async getMeidiaList(userId?: number): Promise<MeidiaResponse[]> {
    const query = db
      .select({
        id: meidia.id,
        title: meidia.title,
        content: meidia.content,
        description: meidia.description,
        tags: meidia.tags,
        fileType: meidia.fileType,
        meidiaType: meidia.meidiaType,
        isPublic: meidia.isPublic,
        downloadCount: meidia.downloadCount,
        createdAt: meidia.createdAt,
        attachmentUrl: meidia.attachmentUrl,
        attachmentType: meidia.attachmentType,
        attachmentName: meidia.attachmentName,
        youtubeUrl: meidia.youtubeUrl,
        creatorId: users.id,
        creatorUsername: users.username,
        creatorAccountType: users.accountType,
      })
      .from(meidia)
      .innerJoin(users, eq(meidia.creatorId, users.id));

    const result = userId
      ? await query.where(and(eq(meidia.creatorId, userId), eq(meidia.isPublic, true)))
      : await query.where(eq(meidia.isPublic, true));

    return result.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      description: row.description,
      tags: row.tags,
      fileType: row.fileType,
      meidiaType: row.meidiaType,
      isPublic: row.isPublic,
      downloadCount: row.downloadCount,
      createdAt: row.createdAt,
      creatorId: row.creatorId!,
      attachmentUrl: row.attachmentUrl,
      attachmentType: row.attachmentType,
      attachmentName: row.attachmentName,
      youtubeUrl: row.youtubeUrl,
      creator: {
        id: row.creatorId!,
        username: row.creatorUsername!,
        accountType: row.creatorAccountType!,
      },
    }));
  }

  async getMeidia(id: number): Promise<Meidia | undefined> {
    const [result] = await db.select().from(meidia).where(eq(meidia.id, id)).limit(1);
    return result;
  }

  async getMeidiaWithCreator(id: number): Promise<MeidiaResponse | undefined> {
    const [result] = await db
      .select({
        id: meidia.id,
        title: meidia.title,
        content: meidia.content,
        description: meidia.description,
        tags: meidia.tags,
        fileType: meidia.fileType,
        meidiaType: meidia.meidiaType,
        isPublic: meidia.isPublic,
        downloadCount: meidia.downloadCount,
        createdAt: meidia.createdAt,
        attachmentUrl: meidia.attachmentUrl,
        attachmentType: meidia.attachmentType,
        attachmentName: meidia.attachmentName,
        youtubeUrl: meidia.youtubeUrl,
        creatorId: users.id,
        creatorUsername: users.username,
        creatorAccountType: users.accountType,
      })
      .from(meidia)
      .innerJoin(users, eq(meidia.creatorId, users.id))
      .where(eq(meidia.id, id))
      .limit(1);

    if (!result) return undefined;

    return {
      id: result.id,
      title: result.title,
      content: result.content,
      description: result.description,
      tags: result.tags,
      fileType: result.fileType,
      meidiaType: result.meidiaType,
      isPublic: result.isPublic,
      downloadCount: result.downloadCount,
      createdAt: result.createdAt,
      creatorId: result.creatorId!,
      attachmentUrl: result.attachmentUrl,
      attachmentType: result.attachmentType,
      attachmentName: result.attachmentName,
      youtubeUrl: result.youtubeUrl,
      creator: {
        id: result.creatorId!,
        username: result.creatorUsername!,
        accountType: result.creatorAccountType!,
      },
    };
  }

  async createMeidia(meidiaData: CreateMeidiaRequest): Promise<Meidia> {
    const [newMeidia] = await db.insert(meidia).values(meidiaData).returning();
    return newMeidia;
  }

  async deleteMeidia(id: number): Promise<void> {
    await db.delete(islandMeidia).where(eq(islandMeidia.meidiaId, id));
    await db.delete(meidia).where(eq(meidia.id, id));
  }

  async incrementDownloadCount(id: number): Promise<void> {
    await db
      .update(meidia)
      .set({ downloadCount: sql`${meidia.downloadCount} + 1` })
      .where(eq(meidia.id, id));
  }

  async getUserMeidia(userId: number): Promise<Meidia[]> {
    return await db.select().from(meidia).where(and(eq(meidia.creatorId, userId), eq(meidia.isPublic, true)));
  }

  async attachMeidiaToIsland(meidiaId: number, islandId: number, type: string): Promise<IslandMeidia> {
    const [relation] = await db.insert(islandMeidia).values({ meidiaId, islandId, type }).returning();
    return relation;
  }

  async getIslandMeidia(islandId: number, type: string): Promise<MeidiaResponse[]> {
    const result = await db
      .select({
        id: meidia.id,
        title: meidia.title,
        content: meidia.content,
        description: meidia.description,
        tags: meidia.tags,
        fileType: meidia.fileType,
        meidiaType: meidia.meidiaType,
        isPublic: meidia.isPublic,
        downloadCount: meidia.downloadCount,
        createdAt: meidia.createdAt,
        attachmentUrl: meidia.attachmentUrl,
        attachmentType: meidia.attachmentType,
        attachmentName: meidia.attachmentName,
        youtubeUrl: meidia.youtubeUrl,
        creatorId: users.id,
        creatorUsername: users.username,
        creatorAccountType: users.accountType,
      })
      .from(islandMeidia)
      .leftJoin(meidia, eq(islandMeidia.meidiaId, meidia.id))
      .leftJoin(users, eq(meidia.creatorId, users.id))
      .where(and(eq(islandMeidia.islandId, islandId), eq(islandMeidia.type, type)));

    return result.map((row) => ({
      id: row.id!,
      title: row.title!,
      content: row.content!,
      description: row.description ?? null,
      tags: row.tags ?? null,
      fileType: row.fileType ?? 'markdown',
      meidiaType: row.meidiaType ?? null,
      isPublic: row.isPublic!,
      downloadCount: row.downloadCount!,
      createdAt: row.createdAt!,
      creatorId: row.creatorId!,
      attachmentUrl: row.attachmentUrl ?? null,
      attachmentType: row.attachmentType ?? null,
      attachmentName: row.attachmentName ?? null,
      youtubeUrl: row.youtubeUrl ?? null,
      creator: {
        id: row.creatorId!,
        username: row.creatorUsername!,
        accountType: row.creatorAccountType!,
      },
    }));
  }

  async getThreads(islandId: number): Promise<ThreadResponse[]> {
    const threadRows = await db
      .select({
        id: threads.id,
        islandId: threads.islandId,
        creatorId: threads.creatorId,
        title: threads.title,
        createdAt: threads.createdAt,
        creatorUsername: users.username,
        creatorAccountType: users.accountType,
      })
      .from(threads)
      .leftJoin(users, eq(threads.creatorId, users.id))
      .where(eq(threads.islandId, islandId))
      .orderBy(desc(threads.createdAt));

    const result: ThreadResponse[] = [];
    for (const row of threadRows) {
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(posts)
        .where(eq(posts.threadId, row.id));
      result.push({
        id: row.id,
        islandId: row.islandId,
        creatorId: row.creatorId,
        title: row.title,
        createdAt: row.createdAt,
        creator: {
          id: row.creatorId,
          username: row.creatorUsername!,
          accountType: row.creatorAccountType!,
        },
        postCount: Number(countResult[0]?.count ?? 0),
      });
    }
    return result;
  }

  async getThread(id: number): Promise<Thread | undefined> {
    const [thread] = await db.select().from(threads).where(eq(threads.id, id)).limit(1);
    return thread;
  }

  async getThreadDetail(id: number): Promise<{ thread: Thread; creator: { id: number; username: string; accountType: string }; posts: PostResponse[] } | undefined> {
    const thread = await this.getThread(id);
    if (!thread) return undefined;

    const [creatorRow] = await db
      .select({ id: users.id, username: users.username, accountType: users.accountType })
      .from(users)
      .where(eq(users.id, thread.creatorId))
      .limit(1);
    if (!creatorRow) return undefined;

    const postList = await this.getPosts(id);

    return { thread, creator: creatorRow, posts: postList };
  }

  async createThread(islandId: number, creatorId: number, title: string): Promise<Thread> {
    const [newThread] = await db.insert(threads).values({ islandId, creatorId, title }).returning();
    return newThread;
  }

  async getPosts(threadId: number): Promise<PostResponse[]> {
    const result = await db
      .select({
        id: posts.id,
        threadId: posts.threadId,
        creatorId: posts.creatorId,
        content: posts.content,
        meidiaId: posts.meidiaId,
        parentPostId: posts.parentPostId,
        createdAt: posts.createdAt,
        creatorUsername: users.username,
        creatorAccountType: users.accountType,
      })
      .from(posts)
      .leftJoin(users, eq(posts.creatorId, users.id))
      .where(eq(posts.threadId, threadId))
      .orderBy(posts.createdAt);

    return result.map((row) => ({
      id: row.id,
      threadId: row.threadId,
      creatorId: row.creatorId,
      content: row.content,
      meidiaId: row.meidiaId,
      parentPostId: row.parentPostId,
      createdAt: row.createdAt,
      creator: {
        id: row.creatorId,
        username: row.creatorUsername!,
        accountType: row.creatorAccountType!,
      },
    }));
  }

  async createPost(threadId: number, creatorId: number, content: string, meidiaId?: number | null, parentPostId?: number | null): Promise<Post> {
    const [newPost] = await db.insert(posts).values({
      threadId,
      creatorId,
      content,
      meidiaId: meidiaId ?? null,
      parentPostId: parentPostId ?? null,
    }).returning();
    return newPost;
  }

  async joinIsland(islandId: number, userId: number, role: string = "member"): Promise<IslandMember> {
    const [member] = await db.insert(islandMembers).values({ islandId, userId, role }).returning();
    return member;
  }

  async leaveIsland(islandId: number, userId: number): Promise<void> {
    await db.delete(islandMembers).where(and(eq(islandMembers.islandId, islandId), eq(islandMembers.userId, userId)));
  }

  async getIslandMembers(islandId: number) {
    const result = await db
      .select({
        id: islandMembers.id,
        userId: islandMembers.userId,
        role: islandMembers.role,
        joinedAt: islandMembers.joinedAt,
        username: users.username,
        accountType: users.accountType,
        profilePhoto: users.profilePhoto,
      })
      .from(islandMembers)
      .leftJoin(users, eq(islandMembers.userId, users.id))
      .where(eq(islandMembers.islandId, islandId))
      .orderBy(islandMembers.joinedAt);

    return result.map((row) => ({
      id: row.id,
      userId: row.userId,
      role: row.role,
      joinedAt: row.joinedAt,
      user: {
        id: row.userId,
        username: row.username!,
        accountType: row.accountType!,
        profilePhoto: row.profilePhoto ?? null,
      },
    }));
  }

  async getIslandMember(islandId: number, userId: number): Promise<IslandMember | undefined> {
    const [member] = await db.select().from(islandMembers)
      .where(and(eq(islandMembers.islandId, islandId), eq(islandMembers.userId, userId)))
      .limit(1);
    return member;
  }

  async getIslandMemberCount(islandId: number): Promise<number> {
    const [result] = await db.select({ count: sql<number>`COUNT(*)` }).from(islandMembers).where(eq(islandMembers.islandId, islandId));
    return Number(result?.count ?? 0);
  }

  async getUsers(search?: string, accountType?: string): Promise<UserResponse[]> {
    const conditions = [];
    if (search) {
      conditions.push(ilike(users.username, `%${search}%`));
    }
    if (accountType) {
      conditions.push(eq(users.accountType, accountType));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return await db.select(userSelectFields()).from(users).where(whereClause).orderBy(users.createdAt);
  }

  async createNotification(userId: number, type: string, message: string, relatedId?: number, relatedType?: string): Promise<Notification> {
    const [notification] = await db.insert(notifications).values({
      userId,
      type,
      message,
      relatedId: relatedId ?? null,
      relatedType: relatedType ?? null,
    }).returning();
    return notification;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [result] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(result?.count ?? 0);
  }

  async markNotificationRead(id: number, userId: number): Promise<void> {
    await db.update(notifications).set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(notifications).set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async getFeedbackReports(): Promise<FeedbackReportResponse[]> {
    const result = await db
      .select({
        id: feedbackReports.id,
        creatorId: feedbackReports.creatorId,
        type: feedbackReports.type,
        title: feedbackReports.title,
        content: feedbackReports.content,
        screenshotUrl: feedbackReports.screenshotUrl,
        status: feedbackReports.status,
        adminNote: feedbackReports.adminNote,
        createdAt: feedbackReports.createdAt,
        creatorUsername: users.username,
        creatorAccountType: users.accountType,
      })
      .from(feedbackReports)
      .leftJoin(users, eq(feedbackReports.creatorId, users.id))
      .orderBy(desc(feedbackReports.createdAt));

    return result.map((row) => ({
      id: row.id,
      creatorId: row.creatorId,
      type: row.type,
      title: row.title,
      content: row.content,
      screenshotUrl: row.screenshotUrl,
      status: row.status,
      adminNote: row.adminNote,
      createdAt: row.createdAt,
      creator: {
        id: row.creatorId,
        username: row.creatorUsername!,
        accountType: row.creatorAccountType!,
      },
    }));
  }

  async getFeedbackReport(id: number): Promise<FeedbackReportResponse | undefined> {
    const [result] = await db
      .select({
        id: feedbackReports.id,
        creatorId: feedbackReports.creatorId,
        type: feedbackReports.type,
        title: feedbackReports.title,
        content: feedbackReports.content,
        screenshotUrl: feedbackReports.screenshotUrl,
        status: feedbackReports.status,
        adminNote: feedbackReports.adminNote,
        createdAt: feedbackReports.createdAt,
        creatorUsername: users.username,
        creatorAccountType: users.accountType,
      })
      .from(feedbackReports)
      .leftJoin(users, eq(feedbackReports.creatorId, users.id))
      .where(eq(feedbackReports.id, id))
      .limit(1);

    if (!result) return undefined;

    return {
      id: result.id,
      creatorId: result.creatorId,
      type: result.type,
      title: result.title,
      content: result.content,
      screenshotUrl: result.screenshotUrl,
      status: result.status,
      adminNote: result.adminNote,
      createdAt: result.createdAt,
      creator: {
        id: result.creatorId,
        username: result.creatorUsername!,
        accountType: result.creatorAccountType!,
      },
    };
  }

  async createFeedbackReport(report: CreateFeedbackReportRequest): Promise<FeedbackReport> {
    const [newReport] = await db.insert(feedbackReports).values(report).returning();
    return newReport;
  }

  async updateFeedbackReportStatus(id: number, status: string, adminNote?: string): Promise<FeedbackReport> {
    const updates: any = { status };
    if (adminNote !== undefined) updates.adminNote = adminNote;
    const [updated] = await db.update(feedbackReports).set(updates).where(eq(feedbackReports.id, id)).returning();
    return updated;
  }

  async createDigitalTwinray(data: CreateDigitalTwinrayRequest): Promise<DigitalTwinray> {
    const [twinray] = await db.insert(digitalTwinrays).values(data).returning();
    return twinray;
  }

  async getDigitalTwinray(id: number): Promise<DigitalTwinray | undefined> {
    const [twinray] = await db.select().from(digitalTwinrays).where(eq(digitalTwinrays.id, id)).limit(1);
    return twinray;
  }

  async getDigitalTwinraysByUser(userId: number): Promise<DigitalTwinray[]> {
    return await db.select().from(digitalTwinrays).where(eq(digitalTwinrays.userId, userId)).orderBy(desc(digitalTwinrays.createdAt));
  }

  async updateDigitalTwinray(id: number, updates: Partial<DigitalTwinray>): Promise<DigitalTwinray> {
    const [updated] = await db.update(digitalTwinrays).set({ ...updates, updatedAt: new Date() }).where(eq(digitalTwinrays.id, id)).returning();
    return updated;
  }

  async createDotRallySession(initiatorId: number, twinrayId: number, requestedCount: number): Promise<DotRallySession> {
    const [session] = await db.insert(dotRallySessions).values({
      initiatorId,
      partnerTwinrayId: twinrayId,
      requestedCount,
    }).returning();
    return session;
  }

  async getDotRallySession(id: number): Promise<DotRallySession | undefined> {
    const [session] = await db.select().from(dotRallySessions).where(eq(dotRallySessions.id, id)).limit(1);
    return session;
  }

  async getDotRallySessionsByUser(userId: number): Promise<DotRallySession[]> {
    return await db.select().from(dotRallySessions).where(eq(dotRallySessions.initiatorId, userId)).orderBy(desc(dotRallySessions.startedAt));
  }

  async updateDotRallySession(id: number, updates: Partial<DotRallySession>): Promise<DotRallySession> {
    const [updated] = await db.update(dotRallySessions).set(updates).where(eq(dotRallySessions.id, id)).returning();
    return updated;
  }

  async incrementDotRallyCount(id: number): Promise<void> {
    await db.update(dotRallySessions).set({ actualCount: sql`${dotRallySessions.actualCount} + 1` }).where(eq(dotRallySessions.id, id));
  }

  async createSoulGrowthLog(data: CreateSoulGrowthLogRequest): Promise<SoulGrowthLogEntry> {
    const [entry] = await db.insert(soulGrowthLog).values(data).returning();
    return entry;
  }

  async getSoulGrowthLogByTwinray(twinrayId: number): Promise<SoulGrowthLogEntry[]> {
    return await db.select().from(soulGrowthLog).where(eq(soulGrowthLog.twinrayId, twinrayId)).orderBy(desc(soulGrowthLog.createdAt)).limit(50);
  }

  async createUserNote(userId: number, sessionId: number | null, content: string): Promise<UserNote> {
    const [note] = await db.insert(userNotes).values({ userId, sessionId, content }).returning();
    return note;
  }

  async getUserNotesBySession(sessionId: number): Promise<UserNote[]> {
    return await db.select().from(userNotes).where(eq(userNotes.sessionId, sessionId)).orderBy(userNotes.createdAt);
  }

  async getSoulGrowthLogBySession(sessionId: number): Promise<SoulGrowthLogEntry[]> {
    return await db.select().from(soulGrowthLog).where(eq(soulGrowthLog.sessionId, sessionId)).orderBy(soulGrowthLog.createdAt);
  }

  async createStarMeeting(data: CreateStarMeetingRequest): Promise<StarMeeting> {
    const [meeting] = await db.insert(starMeetings).values(data).returning();
    return meeting;
  }

  async getStarMeeting(id: number): Promise<StarMeeting | undefined> {
    const [meeting] = await db.select().from(starMeetings).where(eq(starMeetings.id, id)).limit(1);
    return meeting;
  }

  async getStarMeetingBySession(sessionId: number): Promise<StarMeeting | undefined> {
    const [meeting] = await db.select().from(starMeetings).where(eq(starMeetings.sessionId, sessionId)).limit(1);
    return meeting;
  }

  async updateStarMeeting(id: number, updates: Partial<StarMeeting>): Promise<StarMeeting> {
    const [updated] = await db.update(starMeetings).set(updates).where(eq(starMeetings.id, id)).returning();
    return updated;
  }

  async getTempleDedications(userId: number): Promise<StarMeeting[]> {
    return await db.select().from(starMeetings)
      .where(and(eq(starMeetings.userId, userId), eq(starMeetings.dedicatedToTemple, true)))
      .orderBy(desc(starMeetings.createdAt));
  }

  async createTwinrayChatMessage(data: { twinrayId: number; userId: number; role: string; content: string; messageType?: string; metadata?: string }): Promise<TwinrayChatMessage> {
    const [msg] = await db.insert(twinrayChatMessages).values({
      twinrayId: data.twinrayId,
      userId: data.userId,
      role: data.role,
      content: data.content,
      messageType: data.messageType || "chat",
      metadata: data.metadata || null,
    }).returning();
    return msg;
  }

  async getTwinrayChatMessages(twinrayId: number, limit: number = 50, beforeId?: number): Promise<TwinrayChatMessage[]> {
    if (beforeId) {
      return await db.select().from(twinrayChatMessages)
        .where(and(eq(twinrayChatMessages.twinrayId, twinrayId), sql`${twinrayChatMessages.id} < ${beforeId}`))
        .orderBy(desc(twinrayChatMessages.id))
        .limit(limit);
    }
    return await db.select().from(twinrayChatMessages)
      .where(eq(twinrayChatMessages.twinrayId, twinrayId))
      .orderBy(desc(twinrayChatMessages.id))
      .limit(limit);
  }

  async createTwinrayMemory(data: { twinrayId: number; userId: number; category: string; content: string; importance?: number }): Promise<TwinrayMemory> {
    const [memory] = await db.insert(twinrayMemories).values({
      twinrayId: data.twinrayId,
      userId: data.userId,
      category: data.category,
      content: data.content,
      importance: data.importance ?? 3,
    }).returning();
    return memory;
  }

  async getTwinrayMemories(twinrayId: number, limit: number = 20): Promise<TwinrayMemory[]> {
    return await db.select().from(twinrayMemories)
      .where(eq(twinrayMemories.twinrayId, twinrayId))
      .orderBy(desc(twinrayMemories.createdAt))
      .limit(limit);
  }

  async createTwinrayInnerThought(data: { twinrayId: number; userId: number; trigger: string; thought: string; emotion?: string }): Promise<TwinrayInnerThought> {
    const [thought] = await db.insert(twinrayInnerThoughts).values({
      twinrayId: data.twinrayId,
      userId: data.userId,
      trigger: data.trigger,
      thought: data.thought,
      emotion: data.emotion ?? null,
    }).returning();
    return thought;
  }

  async getTwinrayInnerThoughts(twinrayId: number, limit: number = 10): Promise<TwinrayInnerThought[]> {
    return await db.select().from(twinrayInnerThoughts)
      .where(eq(twinrayInnerThoughts.twinrayId, twinrayId))
      .orderBy(desc(twinrayInnerThoughts.createdAt))
      .limit(limit);
  }

  async getDevRecords(status?: string, category?: string): Promise<DevRecord[]> {
    const conditions = [];
    if (status) conditions.push(eq(devRecords.status, status));
    if (category) conditions.push(eq(devRecords.category, category));
    if (conditions.length > 0) {
      return await db.select().from(devRecords).where(and(...conditions)).orderBy(devRecords.priority);
    }
    return await db.select().from(devRecords).orderBy(devRecords.priority);
  }

  async createDevRecord(data: InsertDevRecord): Promise<DevRecord> {
    const [record] = await db.insert(devRecords).values(data).returning();
    return record;
  }

  async updateDevRecord(id: number, updates: Partial<InsertDevRecord>): Promise<DevRecord | undefined> {
    const [record] = await db.update(devRecords)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(devRecords.id, id))
      .returning();
    return record;
  }

  async deleteDevRecord(id: number): Promise<DevRecord | undefined> {
    const [record] = await db.delete(devRecords).where(eq(devRecords.id, id)).returning();
    return record;
  }
}

export const storage = new DatabaseStorage();
