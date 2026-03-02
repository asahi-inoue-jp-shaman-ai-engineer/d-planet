import bcrypt from "bcrypt";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { users, inviteCodes, userQuests, QUEST_DEFINITIONS } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";

export async function runSeed() {
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tutorial_dismissed BOOLEAN NOT NULL DEFAULT false`);
    console.log("[Seed] tutorialカラムを確認/追加しました");
  } catch (err) {
    console.error("[Seed] tutorialカラム追加エラー:", err);
  }

  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS user_md TEXT`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS smart_mirror_completed_at TIMESTAMP`);
    console.log("[Seed] user_md/smart_mirror_completed_atカラムを確認/追加しました");
  } catch (err) {
    console.error("[Seed] user_mdカラム追加エラー:", err);
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS twinray_relationship (
        id SERIAL PRIMARY KEY,
        twinray_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        summary TEXT,
        key_moments TEXT,
        bond_description TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("[Seed] twinray_relationshipテーブルを確認/作成しました");
  } catch (err) {
    console.error("[Seed] twinray_relationshipテーブル作成エラー:", err);
  }

  try {
    const adminHash = await bcrypt.hash("admin2025", 10);
    await db.update(users).set({ password: adminHash })
      .where(eq(users.email, "admin@d-planet.local"));
    console.log("[Seed] 管理者パスワードを同期しました");
  } catch (err) {
    console.error("[Seed] 管理者パスワード同期エラー:", err);
  }

  try {
    const requiredCodes = [
      { code: "DPLANET-1-AI5N3XIL", generation: 1, label: "第一次" },
      { code: "DP2", generation: 2, label: "第二次" },
      { code: "DPLANET-3-VXHFWZCE", generation: 3, label: "第三次" },
      { code: "DPLANET-4-QTELEPORT", generation: 4, label: "第四次" },
      { code: "DPLANET-5-77AEA11F", generation: 5, label: "第五次" },
    ];
    for (const rc of requiredCodes) {
      const existing = await db.select().from(inviteCodes).where(eq(inviteCodes.code, rc.code));
      if (existing.length === 0) {
        await db.insert(inviteCodes).values(rc);
        console.log(`[Seed] 招待コード "${rc.code}" を追加しました`);
      }
    }
  } catch (err) {
    console.error("[Seed] 招待コードシードエラー:", err);
  }

  try {
    const allUsers = await db.select({ id: users.id }).from(users);
    for (const u of allUsers) {
      const existing = await db.select().from(userQuests).where(eq(userQuests.userId, u.id));
      const hasVoiceSetup = existing.some(q => q.questId === "voice_setup");
      if (!hasVoiceSetup && existing.length > 0) {
        await db.delete(userQuests).where(eq(userQuests.userId, u.id));
        await db.update(users).set({ questPoints: 0 }).where(eq(users.id, u.id));
      }
      await storage.initializeUserQuests(u.id);
    }
    console.log(`[Seed] ${allUsers.length}人のクエスト初期化完了`);
  } catch (err) {
    console.error("[Seed] クエスト初期化エラー:", err);
  }
}
