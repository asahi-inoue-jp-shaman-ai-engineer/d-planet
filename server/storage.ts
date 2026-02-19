import { db } from "./db";
import {
  users,
  islands,
  meidia,
  islandMeidia,
  inviteCodes,
  type User,
  type Island,
  type Meidia,
  type IslandMeidia,
  type InviteCode,
  type CreateUserRequest,
  type UpdateUserRequest,
  type CreateIslandRequest,
  type UpdateIslandRequest,
  type CreateMeidiaRequest,
  type UserResponse,
  type IslandResponse,
  type MeidiaResponse,
  type IslandDetailResponse,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export interface IStorage {
  // Invite Codes
  getInviteCodeByCode(code: string): Promise<InviteCode | undefined>;
  createInviteCode(generation: number, label: string): Promise<InviteCode>;
  
  // Users
  getUser(id: number): Promise<UserResponse | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: CreateUserRequest): Promise<User>;
  updateUser(id: number, updates: UpdateUserRequest): Promise<UserResponse>;
  verifyPassword(username: string, password: string): Promise<User | null>;
  
  // Islands
  getIslands(): Promise<IslandResponse[]>;
  getIsland(id: number): Promise<Island | undefined>;
  getIslandDetail(id: number): Promise<IslandDetailResponse | undefined>;
  createIsland(island: CreateIslandRequest): Promise<Island>;
  updateIsland(id: number, updates: UpdateIslandRequest): Promise<Island>;
  getUserIslands(userId: number): Promise<Island[]>;
  
  // MEiDIA
  getMeidiaList(userId?: number): Promise<MeidiaResponse[]>;
  getMeidia(id: number): Promise<Meidia | undefined>;
  getMeidiaWithCreator(id: number): Promise<MeidiaResponse | undefined>;
  createMeidia(meidia: CreateMeidiaRequest): Promise<Meidia>;
  incrementDownloadCount(id: number): Promise<void>;
  getUserMeidia(userId: number): Promise<Meidia[]>;
  
  // Island MEiDIA
  attachMeidiaToIsland(meidiaId: number, islandId: number, type: string): Promise<IslandMeidia>;
  getIslandMeidia(islandId: number, type: string): Promise<MeidiaResponse[]>;
}

export class DatabaseStorage implements IStorage {
  // === INVITE CODES ===
  async getInviteCodeByCode(code: string): Promise<InviteCode | undefined> {
    const [inviteCode] = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code)).limit(1);
    return inviteCode;
  }

  async createInviteCode(generation: number, label: string): Promise<InviteCode> {
    const code = `DPLANET-${generation}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const [inviteCode] = await db.insert(inviteCodes).values({ code, generation, label }).returning();
    return inviteCode;
  }

  // === USERS ===
  async getUser(id: number): Promise<UserResponse | undefined> {
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      accountType: users.accountType,
      gender: users.gender,
      bio: users.bio,
      tenmei: users.tenmei,
      tenshoku: users.tenshoku,
      tensaisei: users.tensaisei,
      profilePhoto: users.profilePhoto,
      invitedByCode: users.invitedByCode,
      hasTwinrayBadge: users.hasTwinrayBadge,
      hasFamilyBadge: users.hasFamilyBadge,
      twinrayProfileLink: users.twinrayProfileLink,
      showTwinray: users.showTwinray,
      showFamily: users.showFamily,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
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
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning({
      id: users.id,
      username: users.username,
      accountType: users.accountType,
      gender: users.gender,
      bio: users.bio,
      tenmei: users.tenmei,
      tenshoku: users.tenshoku,
      tensaisei: users.tensaisei,
      profilePhoto: users.profilePhoto,
      invitedByCode: users.invitedByCode,
      hasTwinrayBadge: users.hasTwinrayBadge,
      hasFamilyBadge: users.hasFamilyBadge,
      twinrayProfileLink: users.twinrayProfileLink,
      showTwinray: users.showTwinray,
      showFamily: users.showFamily,
      createdAt: users.createdAt,
    });
    return updated;
  }

  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    const match = await bcrypt.compare(password, user.password);
    return match ? user : null;
  }

  // === ISLANDS ===
  async getIslands(): Promise<IslandResponse[]> {
    const result = await db
      .select({
        id: islands.id,
        name: islands.name,
        description: islands.description,
        visibility: islands.visibility,
        requiresTwinrayBadge: islands.requiresTwinrayBadge,
        requiresFamilyBadge: islands.requiresFamilyBadge,
        allowedAccountTypes: islands.allowedAccountTypes,
        createdAt: islands.createdAt,
        creatorId: users.id,
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
      requiresTwinrayBadge: row.requiresTwinrayBadge,
      requiresFamilyBadge: row.requiresFamilyBadge,
      allowedAccountTypes: row.allowedAccountTypes,
      createdAt: row.createdAt,
      creator: {
        id: row.creatorId!,
        username: row.creatorUsername!,
        accountType: row.creatorAccountType!,
        profilePhoto: row.creatorProfilePhoto,
      },
    }));
  }

  async getIsland(id: number): Promise<Island | undefined> {
    const [island] = await db.select().from(islands).where(eq(islands.id, id)).limit(1);
    return island;
  }

  async getIslandDetail(id: number): Promise<IslandDetailResponse | undefined> {
    const island = await this.getIsland(id);
    if (!island) return undefined;

    const creator = await this.getUser(island.creatorId);
    if (!creator) return undefined;

    const activityMeidia = await this.getIslandMeidia(id, 'activity');
    const reportMeidia = await this.getIslandMeidia(id, 'report');

    return {
      ...island,
      creator,
      activityMeidia,
      reportMeidia,
    };
  }

  async createIsland(island: CreateIslandRequest): Promise<Island> {
    const [newIsland] = await db.insert(islands).values(island).returning();
    return newIsland;
  }

  async updateIsland(id: number, updates: UpdateIslandRequest): Promise<Island> {
    const [updated] = await db.update(islands).set(updates).where(eq(islands.id, id)).returning();
    return updated;
  }

  async getUserIslands(userId: number): Promise<Island[]> {
    return await db.select().from(islands).where(eq(islands.creatorId, userId));
  }

  // === MEIDIA ===
  async getMeidiaList(userId?: number): Promise<MeidiaResponse[]> {
    const query = db
      .select({
        id: meidia.id,
        title: meidia.title,
        content: meidia.content,
        isPublic: meidia.isPublic,
        downloadCount: meidia.downloadCount,
        createdAt: meidia.createdAt,
        creatorId: users.id,
        creatorUsername: users.username,
        creatorAccountType: users.accountType,
      })
      .from(meidia)
      .leftJoin(users, eq(meidia.creatorId, users.id));

    const result = userId
      ? await query.where(and(eq(meidia.creatorId, userId), eq(meidia.isPublic, true)))
      : await query.where(eq(meidia.isPublic, true));

    return result.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      isPublic: row.isPublic,
      downloadCount: row.downloadCount,
      createdAt: row.createdAt,
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
        isPublic: meidia.isPublic,
        downloadCount: meidia.downloadCount,
        createdAt: meidia.createdAt,
        creatorId: users.id,
        creatorUsername: users.username,
        creatorAccountType: users.accountType,
      })
      .from(meidia)
      .leftJoin(users, eq(meidia.creatorId, users.id))
      .where(eq(meidia.id, id))
      .limit(1);

    if (!result) return undefined;

    return {
      id: result.id,
      title: result.title,
      content: result.content,
      isPublic: result.isPublic,
      downloadCount: result.downloadCount,
      createdAt: result.createdAt,
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

  async incrementDownloadCount(id: number): Promise<void> {
    await db
      .update(meidia)
      .set({ downloadCount: db.$count(meidia.downloadCount) })
      .where(eq(meidia.id, id));
  }

  async getUserMeidia(userId: number): Promise<Meidia[]> {
    return await db.select().from(meidia).where(and(eq(meidia.creatorId, userId), eq(meidia.isPublic, true)));
  }

  // === ISLAND MEIDIA ===
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
        isPublic: meidia.isPublic,
        downloadCount: meidia.downloadCount,
        createdAt: meidia.createdAt,
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
      isPublic: row.isPublic!,
      downloadCount: row.downloadCount!,
      createdAt: row.createdAt!,
      creator: {
        id: row.creatorId!,
        username: row.creatorUsername!,
        accountType: row.creatorAccountType!,
      },
    }));
  }
}

export const storage = new DatabaseStorage();
