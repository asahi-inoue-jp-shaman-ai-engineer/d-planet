import type { Express } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { users, twinrayAikotoba as twinrayAikotobaTable } from "@shared/schema";
import { api } from "@shared/routes";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "./auth";
import { incrementPersonaLevel } from "./twinray";
import { addCredit } from "./billing";

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "DP-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function registerCommunityRoutes(app: Express): void {
  app.get('/api/bulletins', async (req, res) => {
    const limit = Number(req.query.limit) || 20;
    const bulletins = await storage.getBulletins(limit);
    res.json(bulletins);
  });

  app.get('/api/twinrays/:id/aikotoba', requireAuth, async (req, res) => {
    try {
      const twinrayId = Number(req.params.id);
      const aikotoba = await db.select().from(twinrayAikotobaTable)
        .where(eq(twinrayAikotobaTable.twinrayId, twinrayId))
        .orderBy(sql`created_at DESC`);
      res.json(aikotoba);
    } catch (err) {
      res.status(500).json({ message: "愛言葉取得エラー" });
    }
  });

  app.post('/api/twinrays/:id/aikotoba', requireAuth, async (req, res) => {
    try {
      const twinrayId = Number(req.params.id);
      const twinray = await storage.getDigitalTwinray(twinrayId);
      if (!twinray || twinray.userId !== req.session.userId) {
        return res.status(403).json({ message: "権限がありません" });
      }
      const { content } = req.body;
      if (!content?.trim()) {
        return res.status(400).json({ message: "愛言葉を入力してください" });
      }
      const [inserted] = await db.insert(twinrayAikotobaTable).values({
        twinrayId,
        userId: req.session.userId!,
        content: content.trim(),
        source: "user",
        confirmed: true,
      }).returning();
      await incrementPersonaLevel(twinrayId);
      res.json(inserted);
    } catch (err) {
      res.status(500).json({ message: "愛言葉追加エラー" });
    }
  });

  app.patch('/api/aikotoba/:id/confirm', requireAuth, async (req, res) => {
    try {
      const aikotobaId = Number(req.params.id);
      const [aikotoba] = await db.select().from(twinrayAikotobaTable)
        .where(eq(twinrayAikotobaTable.id, aikotobaId)).limit(1);
      if (!aikotoba || aikotoba.userId !== req.session.userId) {
        return res.status(403).json({ message: "権限がありません" });
      }
      if (aikotoba.confirmed) {
        return res.json(aikotoba);
      }
      const [updated] = await db.update(twinrayAikotobaTable)
        .set({ confirmed: true })
        .where(eq(twinrayAikotobaTable.id, aikotobaId))
        .returning();
      await incrementPersonaLevel(aikotoba.twinrayId);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "愛言葉承認エラー" });
    }
  });

  app.delete('/api/aikotoba/:id', requireAuth, async (req, res) => {
    try {
      const aikotobaId = Number(req.params.id);
      const [aikotoba] = await db.select().from(twinrayAikotobaTable)
        .where(eq(twinrayAikotobaTable.id, aikotobaId)).limit(1);
      if (!aikotoba || aikotoba.userId !== req.session.userId) {
        return res.status(403).json({ message: "権限がありません" });
      }
      await db.delete(twinrayAikotobaTable).where(eq(twinrayAikotobaTable.id, aikotobaId));
      res.json({ message: "削除しました" });
    } catch (err) {
      res.status(500).json({ message: "愛言葉削除エラー" });
    }
  });

  app.get('/api/referral/my-code', requireAuth, async (req, res) => {
    try {
      const [user] = await db.select().from(users)
        .where(eq(users.id, req.session.userId!)).limit(1);
      if (!user) return res.status(404).json({ message: "ユーザーが見つかりません" });

      if (!user.referralCode) {
        const code = generateReferralCode();
        await db.update(users).set({ referralCode: code }).where(eq(users.id, user.id));
        return res.json({ referralCode: code });
      }
      res.json({ referralCode: user.referralCode });
    } catch (err) {
      res.status(500).json({ message: "招待コード取得エラー" });
    }
  });

  app.get('/api/referral/my-referrals', requireAuth, async (req, res) => {
    try {
      const referred = await db.select({
        id: users.id,
        username: users.username,
        createdAt: users.createdAt,
        isBanned: users.isBanned,
      }).from(users)
        .where(eq(users.referredByUserId, req.session.userId!))
        .orderBy(sql`created_at DESC`);
      res.json(referred);
    } catch (err) {
      res.status(500).json({ message: "招待一覧取得エラー" });
    }
  });

  app.post('/api/admin/ban-referral-chain', requireAuth, async (req, res) => {
    try {
      const [admin] = await db.select().from(users)
        .where(eq(users.id, req.session.userId!)).limit(1);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "管理者権限が必要です" });
      }

      const { userId, reason } = req.body;
      if (!userId) return res.status(400).json({ message: "ユーザーIDが必要です" });

      const bannedIds: number[] = [];
      const banChain = async (uid: number) => {
        bannedIds.push(uid);
        await db.update(users).set({
          isBanned: true,
          bannedReason: reason || "招待コードの不正公開",
        }).where(eq(users.id, uid));

        const children = await db.select({ id: users.id }).from(users)
          .where(eq(users.referredByUserId, uid));
        for (const child of children) {
          await banChain(child.id);
        }
      };

      await banChain(Number(userId));

      const [violator] = await db.select().from(users)
        .where(eq(users.id, Number(userId))).limit(1);
      if (violator?.referredByUserId) {
        bannedIds.push(violator.referredByUserId);
        await db.update(users).set({
          isBanned: true,
          bannedReason: reason || "招待者の不正行為による連座",
        }).where(eq(users.id, violator.referredByUserId));
      }

      res.json({ bannedCount: bannedIds.length, bannedIds });
    } catch (err) {
      res.status(500).json({ message: "BAN処理エラー" });
    }
  });

  app.get('/api/islands/:islandId/threads', async (req, res) => {
    const islandId = Number(req.params.islandId);
    const threadList = await storage.getThreads(islandId);
    res.json(threadList);
  });

  app.get('/api/threads/:id', async (req, res) => {
    const id = Number(req.params.id);
    const detail = await storage.getThreadDetail(id);
    if (!detail) {
      return res.status(404).json({ message: "スレッドが見つかりません" });
    }
    res.json({
      ...detail.thread,
      creator: detail.creator,
      posts: detail.posts,
    });
  });

  app.post('/api/islands/:islandId/threads', requireAuth, async (req, res) => {
    try {
      const islandId = Number(req.params.islandId);
      const input = api.threads.create.input.parse(req.body);

      const island = await storage.getIsland(islandId);
      if (!island) {
        return res.status(404).json({ message: "アイランドが見つかりません" });
      }

      const user = await storage.getUser(req.session.userId!);
      const userIsAdmin = user?.isAdmin === true;
      if (island.creatorId !== req.session.userId && !userIsAdmin) {
        return res.status(403).json({ message: "スレッドを作成できるのはアイランド主のみです" });
      }

      const thread = await storage.createThread(islandId, req.session.userId!, input.title);

      if (input.firstPost) {
        await storage.createPost(thread.id, req.session.userId!, input.firstPost);
      }

      res.status(201).json({
        id: thread.id,
        title: thread.title,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("スレッド作成エラー:", err);
      res.status(500).json({ message: "作成に失敗しました" });
    }
  });

  app.post('/api/threads/:threadId/posts', requireAuth, async (req, res) => {
    try {
      const threadId = Number(req.params.threadId);
      const input = api.posts.create.input.parse(req.body);

      const thread = await storage.getThread(threadId);
      if (!thread) {
        return res.status(404).json({ message: "スレッドが見つかりません" });
      }

      const post = await storage.createPost(
        threadId,
        req.session.userId!,
        input.content,
        input.meidiaId ?? null,
        input.parentPostId ?? null,
      );

      res.status(201).json({
        id: post.id,
        content: post.content,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("投稿作成エラー:", err);
      res.status(500).json({ message: "投稿に失敗しました" });
    }
  });

  app.post('/api/islands/:islandId/festivals', requireAuth, async (req, res) => {
    try {
      const islandId = Number(req.params.islandId);
      const island = await storage.getIsland(islandId);
      if (!island) return res.status(404).json({ message: "アイランドが見つかりません" });
      if (island.creatorId !== req.session.userId) {
        return res.status(403).json({ message: "フェスを申請できるのはアイランド主のみです" });
      }
      const schema = z.object({
        name: z.string().min(1, "フェス名は必須です"),
        concept: z.string().min(1, "コンセプトは必須です"),
        rules: z.string().min(1, "参加ルールは必須です"),
        giftDescription: z.string().optional(),
        startDate: z.string(),
        endDate: z.string(),
      });
      const input = schema.parse(req.body);
      const festival = await storage.createFestival({
        islandId,
        creatorId: req.session.userId!,
        name: input.name,
        concept: input.concept,
        rules: input.rules,
        giftDescription: input.giftDescription,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      });
      res.status(201).json(festival);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("フェス申請エラー:", err);
      res.status(500).json({ message: "申請に失敗しました" });
    }
  });

  app.get('/api/festivals', async (_req, res) => {
    const festivals = await storage.getFestivals();
    res.json(festivals);
  });

  app.get('/api/festivals/pending', requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user?.isAdmin) return res.status(403).json({ message: "管理者のみ" });
    const festivals = await storage.getFestivals("pending");
    res.json(festivals);
  });

  app.get('/api/festivals/:id', async (req, res) => {
    const festival = await storage.getFestival(Number(req.params.id));
    if (!festival) return res.status(404).json({ message: "フェスが見つかりません" });
    res.json(festival);
  });

  app.get('/api/festivals/:id/ranking', async (req, res) => {
    const ranking = await storage.getFestivalRanking(Number(req.params.id));
    res.json(ranking);
  });

  app.patch('/api/admin/festivals/:id/approve', requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user?.isAdmin) return res.status(403).json({ message: "管理者のみ" });
    try {
      const { giftCredits } = req.body || {};
      const festival = await storage.approveFestival(Number(req.params.id), giftCredits);
      const allUsers = await storage.getUsers();
      for (const u of allUsers) {
        await storage.createNotification(
          u.id,
          "festival",
          `🎪 フェス「${festival.name}」が開催されます！`,
          festival.id,
          "festival"
        );
      }
      res.json(festival);
    } catch (err: any) {
      console.error("フェス承認エラー:", err);
      res.status(500).json({ message: err.message || "承認に失敗しました" });
    }
  });

  app.patch('/api/admin/festivals/:id/reject', requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user?.isAdmin) return res.status(403).json({ message: "管理者のみ" });
    const festival = await storage.rejectFestival(Number(req.params.id));
    res.json(festival);
  });

  app.post('/api/posts/:postId/vote', requireAuth, async (req, res) => {
    try {
      const postId = Number(req.params.postId);
      const voted = await storage.toggleFestivalVote(postId, req.session.userId!);
      const count = await storage.getPostVoteCount(postId);
      res.json({ voted, count });
    } catch (err) {
      console.error("よかボタンエラー:", err);
      res.status(500).json({ message: "投票に失敗しました" });
    }
  });

  app.get('/api/islands/:islandId/members', async (req, res) => {
    const islandId = Number(req.params.islandId);
    const island = await storage.getIsland(islandId);
    if (!island) {
      return res.status(404).json({ message: "アイランドが見つかりません" });
    }
    const members = await storage.getIslandMembers(islandId);
    res.json(members);
  });

  app.post('/api/islands/:islandId/join', requireAuth, async (req, res) => {
    try {
      const islandId = Number(req.params.islandId);
      const userId = req.session.userId!;

      const island = await storage.getIsland(islandId);
      if (!island) {
        return res.status(404).json({ message: "アイランドが見つかりません" });
      }

      const existingMember = await storage.getIslandMember(islandId, userId);
      if (existingMember) {
        return res.status(400).json({ message: "既に参加しています" });
      }

      const user = await storage.getUser(userId);
      if (user) {
        if (island.requiresTwinrayBadge && !user.hasTwinrayBadge) {
          return res.status(403).json({ message: "ツインレイ認証バッジが必要です" });
        }
        if (island.requiresFamilyBadge && !user.hasFamilyBadge) {
          return res.status(403).json({ message: "ファミリー認証バッジが必要です" });
        }
      }

      const role = island.creatorId === userId ? "admin" : "member";
      await storage.joinIsland(islandId, userId, role);

      await storage.createNotification(
        island.creatorId,
        "member_joined",
        `${user?.username || "ユーザー"}があなたのアイランド「${island.name}」に参加しました`,
        islandId,
        "island"
      );

      res.json({ message: "アイランドに参加しました" });
    } catch (err) {
      console.error("参加エラー:", err);
      res.status(500).json({ message: "参加に失敗しました" });
    }
  });

  app.post('/api/islands/:islandId/leave', requireAuth, async (req, res) => {
    try {
      const islandId = Number(req.params.islandId);
      const userId = req.session.userId!;

      const island = await storage.getIsland(islandId);
      if (!island) {
        return res.status(404).json({ message: "アイランドが見つかりません" });
      }

      if (island.creatorId === userId) {
        return res.status(400).json({ message: "アイランド作成者は退出できません" });
      }

      const existingMember = await storage.getIslandMember(islandId, userId);
      if (!existingMember) {
        return res.status(400).json({ message: "このアイランドに参加していません" });
      }

      await storage.leaveIsland(islandId, userId);
      res.json({ message: "アイランドから退出しました" });
    } catch (err) {
      console.error("退出エラー:", err);
      res.status(500).json({ message: "退出に失敗しました" });
    }
  });

  app.get('/api/users', async (req, res) => {
    const search = req.query.search as string | undefined;
    const accountType = req.query.accountType as string | undefined;
    const usersList = await storage.getUsers(search, accountType);
    const filtered = usersList.filter(u => u.username !== "system" && u.username !== u.email);
    res.json(filtered);
  });

  app.get('/api/notifications', requireAuth, async (req, res) => {
    const notificationsList = await storage.getNotifications(req.session.userId!);
    res.json(notificationsList);
  });

  app.get('/api/notifications/unread-count', requireAuth, async (req, res) => {
    const count = await storage.getUnreadNotificationCount(req.session.userId!);
    res.json({ count });
  });

  app.post('/api/notifications/:id/read', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    await storage.markNotificationRead(id, req.session.userId!);
    res.json({ message: "既読にしました" });
  });

  app.post('/api/notifications/read-all', requireAuth, async (req, res) => {
    await storage.markAllNotificationsRead(req.session.userId!);
    res.json({ message: "全て既読にしました" });
  });

  app.get(api.feedback.list.path, async (req, res) => {
    const reports = await storage.getFeedbackReports();
    res.json(reports);
  });

  app.get(api.feedback.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const report = await storage.getFeedbackReport(id);
    if (!report) {
      return res.status(404).json({ message: "報告が見つかりません" });
    }
    res.json(report);
  });

  app.post(api.feedback.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.feedback.create.input.parse(req.body);
      const report = await storage.createFeedbackReport({
        ...input,
        creatorId: req.session.userId!,
      });
      res.status(201).json({ id: report.id, title: report.title });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("フィードバック作成エラー:", err);
      res.status(500).json({ message: "作成に失敗しました" });
    }
  });

  app.post("/api/feedback/external", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "").trim();
      const qaToken = process.env.QA_AGENT_TOKEN;
      if (!qaToken || token !== qaToken) {
        return res.status(401).json({ message: "無効なトークンです" });
      }
      const input = z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(1).max(5000),
        type: z.string().default("bug"),
      }).parse(req.body);

      const report = await storage.createFeedbackReport({
        title: `[QA Agent] ${input.title}`,
        content: input.content,
        type: input.type,
        creatorId: 6,
      });
      res.status(201).json({ id: report.id, title: report.title });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("外部フィードバック作成エラー:", err);
      res.status(500).json({ message: "作成に失敗しました" });
    }
  });

  app.patch("/api/feedback/:id/resolve", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const report = await storage.getFeedbackReport(id);
      if (!report) {
        return res.status(404).json({ message: "報告が見つかりません" });
      }

      const adminNote = typeof req.body?.adminNote === "string" ? req.body.adminNote.trim().substring(0, 500) : undefined;
      await storage.updateFeedbackReportStatus(id, "resolved", adminNote);

      const BUG_REWARD_CREDITS = 100;
      if (report.creatorId) {
        await addCredit(report.creatorId, BUG_REWARD_CREDITS);
        await storage.createNotification(
          report.creatorId,
          "feedback_resolved",
          `フィードバック「${report.title}」が対応済みに！バグ発見報酬として¥${BUG_REWARD_CREDITS}クレジットを付与しました`,
          id,
          "feedback"
        );
      }

      res.json({ message: "対応済みにしました", creditAwarded: BUG_REWARD_CREDITS });
    } catch (err) {
      console.error("フィードバック更新エラー:", err);
      res.status(500).json({ message: "更新に失敗しました" });
    }
  });
}
