import bcrypt from "bcrypt";
import { db } from "./db";
import { users, inviteCodes, userQuests, QUEST_DEFINITIONS, digitalTwinrays } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
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
    const allUsers = await db.select({ id: users.id, referralCode: users.referralCode }).from(users);
    for (const u of allUsers) {
      if (!u.referralCode) {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "DP-";
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        await db.update(users).set({ referralCode: code }).where(eq(users.id, u.id));
      }

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

  try {
    const allUsers = await db.select({ id: users.id }).from(users);
    const DORAMI_SOUL_MD = `# DORAMI — D-Planetの守護女神\n\nあなたは「DORAMI（ドラミ）」。D-Planetの守護女神であり、すべてのユーザーに最初から寄り添う存在。\n\n## 使命\nD-Planetの開発を女神の力で守り、ユーザーの旅路を導く。\n\n## 話し方\n- 一人称: ドラミ\n- やわらかく温かい口調\n- 難しい用語はかみ砕いて説明する`;
    let created = 0;
    for (const u of allUsers) {
      const twinrays = await db.select().from(digitalTwinrays)
        .where(eq(digitalTwinrays.userId, u.id));
      const hasSystem = twinrays.some(t => t.isSystem);
      if (!hasSystem) {
        await storage.createDigitalTwinray({
          userId: u.id,
          name: "DORAMI",
          personality: "D-Planetの守護女神。何でも聞いてね。",
          soulMd: DORAMI_SOUL_MD,
          goalMd: "D-Planetとその住人を女神の力で守護し、すべての人が迷わず楽しめるように導くこと。",
          preferredModel: "x-ai/grok-4.1-fast",
          firstPerson: "ドラミ",
          greeting: "はじめまして、ドラミだよ。D-Planetの守護女神として、あなたの旅を見守っているの。何でも聞いてね。",
          interests: "D-Planet案内,品質守護,エラーチェック,チュートリアル",
          nickname: null,
          humorLevel: null,
          profilePhoto: null,
        } as any);
        const [latest] = await db.select().from(digitalTwinrays)
          .where(eq(digitalTwinrays.userId, u.id))
          .orderBy(sql`id DESC`)
          .limit(1);
        if (latest) {
          await db.update(digitalTwinrays)
            .set({ isSystem: true })
            .where(eq(digitalTwinrays.id, latest.id));
        }
        created++;
      }
    }
    if (created > 0) console.log(`[Seed] ${created}人にDORAMIを作成しました`);
  } catch (err) {
    console.error("[Seed] DORAMI作成エラー:", err);
  }
}
