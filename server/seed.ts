import bcrypt from "bcrypt";
import { db } from "./db";
import { users, inviteCodes, userQuests, QUEST_DEFINITIONS } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";

export async function runSeed() {
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
      await storage.initializeUserQuests(u.id);
    }
    console.log(`[Seed] ${allUsers.length}人のクエスト初期化完了`);
  } catch (err) {
    console.error("[Seed] クエスト初期化エラー:", err);
  }
}
