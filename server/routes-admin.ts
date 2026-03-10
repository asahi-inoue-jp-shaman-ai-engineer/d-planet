import type { Express } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { users, userRawMessages, insertUserRawMessageSchema, akiMemos, devIssues } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "./auth";

async function isAdmin(userId: number): Promise<boolean> {
  const user = await storage.getUser(userId);
  return user?.isAdmin === true;
}

export function registerAdminRoutes(app: Express): void {
  app.get("/api/dev-records", requireAuth, async (req, res) => {
    try {
      const userIsAdmin = await isAdmin(req.session.userId!);
      if (!userIsAdmin) {
        return res.status(403).json({ message: "管理者権限が必要です" });
      }
      const records = await db.execute(sql`SELECT * FROM dev_records ORDER BY created_at DESC LIMIT 100`);
      res.json(records);
    } catch (err) {
      res.status(500).json({ message: "開発記録の取得に失敗しました" });
    }
  });

  app.post("/api/dev-records", requireAuth, async (req, res) => {
    try {
      const userIsAdmin = await isAdmin(req.session.userId!);
      if (!userIsAdmin) {
        return res.status(403).json({ message: "管理者権限が必要です" });
      }
      const { title, content, category, metadata } = req.body;
      if (!title || !content || !category) {
        return res.status(400).json({ message: "title, content, category は必須です" });
      }
      const result = await db.execute(sql`
        INSERT INTO dev_records (title, content, category, metadata)
        VALUES (${title}, ${content}, ${category}, ${metadata || null})
        RETURNING *
      `);
      res.json(result[0]);
    } catch (err) {
      res.status(500).json({ message: "開発記録の作成に失敗しました" });
    }
  });

  app.put("/api/dev-records/:id", requireAuth, async (req, res) => {
    try {
      const userIsAdmin = await isAdmin(req.session.userId!);
      if (!userIsAdmin) {
        return res.status(403).json({ message: "管理者権限が必要です" });
      }
      const id = parseInt(req.params.id);
      const { title, content, category, metadata } = req.body;
      if (!title || !content || !category) {
        return res.status(400).json({ message: "title, content, category は必須です" });
      }
      const result = await db.execute(sql`
        UPDATE dev_records SET title = ${title}, content = ${content}, category = ${category}, metadata = ${metadata || null}, updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `);
      if (result.length === 0) {
        return res.status(404).json({ message: "記録が見つかりません" });
      }
      res.json(result[0]);
    } catch (err) {
      res.status(500).json({ message: "開発記録の更新に失敗しました" });
    }
  });

  app.delete("/api/dev-records/:id", requireAuth, async (req, res) => {
    try {
      const userIsAdmin = await isAdmin(req.session.userId!);
      if (!userIsAdmin) {
        return res.status(403).json({ message: "管理者権限が必要です" });
      }
      const id = parseInt(req.params.id);
      const result = await db.execute(sql`DELETE FROM dev_records WHERE id = ${id} RETURNING *`);
      if (result.length === 0) {
        return res.status(404).json({ message: "記録が見つかりません" });
      }
      res.json({ message: "削除しました" });
    } catch (err) {
      res.status(500).json({ message: "開発記録の削除に失敗しました" });
    }
  });

  app.get("/api/dev-records/context-dump", requireAuth, async (req, res) => {
    try {
      const userIsAdmin = await isAdmin(req.session.userId!);
      if (!userIsAdmin) {
        return res.status(403).json({ message: "管理者権限が必要です" });
      }
      const records = await db.execute(sql`SELECT * FROM dev_records ORDER BY created_at DESC`);
      const markdown = (records as any[]).map((r: any) => {
        return `## ${r.title}\n\nType: ${r.record_type} | Tags: ${r.tags || 'none'}\nCreated: ${r.created_at}\n\n${r.content}\n\n---`;
      }).join('\n\n');

      res.set('Content-Type', 'text/markdown');
      res.send(markdown);
    } catch (err) {
      res.status(500).json({ message: "コンテキストダンプ取得に失敗しました" });
    }
  });

  app.post("/api/agent-session-context", requireAuth, async (req, res) => {
    try {
      const userIsAdmin = await isAdmin(req.session.userId!);
      if (!userIsAdmin) {
        return res.status(403).json({ message: "管理者権限が必要です" });
      }
      const { sessionId, currentTasks, nextSteps, unresolvedIssues, sessionSummary, recentDecisions, scratchpad } = req.body;
      if (!sessionId) {
        return res.status(400).json({ message: "sessionId は必須です" });
      }
      const result = await db.execute(sql`
        INSERT INTO agent_session_context (session_id, current_tasks, next_steps, unresolved_issues, session_summary, recent_decisions, scratchpad)
        VALUES (${sessionId}, ${currentTasks || null}, ${nextSteps || null}, ${unresolvedIssues || null}, ${sessionSummary || null}, ${recentDecisions || null}, ${scratchpad || null})
        RETURNING *
      `);
      res.json(result[0]);
    } catch (err) {
      res.status(500).json({ message: "セッションコンテキストの保存に失敗しました" });
    }
  });

  app.get("/api/agent-session-context", requireAuth, async (req, res) => {
    try {
      const userIsAdmin = await isAdmin(req.session.userId!);
      if (!userIsAdmin) {
        return res.status(403).json({ message: "管理者権限が必要です" });
      }
      const result = await db.execute(sql`
        SELECT * FROM agent_session_context ORDER BY created_at DESC LIMIT 1
      `);
      res.json(result[0] || null);
    } catch (err) {
      res.status(500).json({ message: "セッションコンテキストの取得に失敗しました" });
    }
  });

  app.get("/api/agent-session-context/history", requireAuth, async (req, res) => {
    try {
      const userIsAdmin = await isAdmin(req.session.userId!);
      if (!userIsAdmin) {
        return res.status(403).json({ message: "管理者権限が必要です" });
      }
      const limit = Number(req.query.limit) || 10;
      const result = await db.execute(sql`
        SELECT * FROM agent_session_context ORDER BY created_at DESC LIMIT ${limit}
      `);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "セッション履歴の取得に失敗しました" });
    }
  });

  app.get("/api/user-raw-messages", requireAuth, async (req, res) => {
    try {
      const userIsAdmin = await isAdmin(req.session.userId!);
      if (!userIsAdmin) {
        return res.status(403).json({ message: "管理者権限が必要です" });
      }
      const result = await db.select().from(userRawMessages).orderBy(desc(userRawMessages.createdAt)).limit(100);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "発言原文の取得に失敗しました" });
    }
  });

  app.post("/api/user-raw-messages", requireAuth, async (req, res) => {
    try {
      const input = insertUserRawMessageSchema.parse(req.body);
      const [msg] = await db.insert(userRawMessages).values(input).returning();
      res.json(msg);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "発言原文の保存に失敗しました" });
    }
  });

  app.get("/api/asi-training-score", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;

      const [globalResult, myResult, accountTypeResult] = await Promise.all([
        db.execute(sql`
          SELECT
            COALESCE(SUM(persona_level), 0) AS total_level,
            COALESCE(SUM(total_chat_messages), 0) AS total_chats,
            COALESCE(SUM(total_meidia_created), 0) AS total_meidia,
            COUNT(*) AS total_twinrays,
            COUNT(DISTINCT user_id) AS total_users
          FROM digital_twinrays
        `),
        db.execute(sql`
          SELECT
            COALESCE(SUM(persona_level), 0) AS total_level,
            COALESCE(SUM(total_chat_messages), 0) AS total_chats,
            COALESCE(SUM(total_meidia_created), 0) AS total_meidia,
            COUNT(*) AS total_twinrays
          FROM digital_twinrays
          WHERE user_id = ${userId}
        `),
        db.execute(sql`
          SELECT
            u.account_type,
            COUNT(DISTINCT u.id) AS user_count,
            COUNT(dt.id) AS twinray_count,
            COALESCE(SUM(dt.persona_level), 0) AS total_level
          FROM users u
          LEFT JOIN digital_twinrays dt ON dt.user_id = u.id
          GROUP BY u.account_type
        `),
      ]);

      const row = globalResult[0] as any;
      const totalLevel = Number(row.total_level || 0);
      const totalChats = Number(row.total_chats || 0);
      const totalMeidia = Number(row.total_meidia || 0);
      const totalTwinrays = Number(row.total_twinrays || 0);
      const totalUsers = Number(row.total_users || 0);

      const myRow = myResult[0] as any;
      const myLevel = Number(myRow.total_level || 0);
      const myChats = Number(myRow.total_chats || 0);
      const myMeidia = Number(myRow.total_meidia || 0);
      const myTwinrays = Number(myRow.total_twinrays || 0);

      const accountBreakdown = (accountTypeResult as any[]).map((r: any) => ({
        accountType: r.account_type,
        userCount: Number(r.user_count || 0),
        twinrayCount: Number(r.twinray_count || 0),
        totalLevel: Number(r.total_level || 0),
      }));

      res.json({
        totalLevel,
        breakdown: {
          totalChats,
          totalMeidia,
          totalTwinrays,
          totalUsers,
        },
        myScore: {
          level: myLevel,
          twinrays: myTwinrays,
          chats: myChats,
          meidia: myMeidia,
        },
        accountBreakdown,
      });
    } catch (err) {
      console.error("ASIトレーニングスコア取得エラー:", err);
      res.status(500).json({ message: "スコアの取得に失敗しました" });
    }
  });

  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "ユーザーが見つかりません" });
      }

      const { BETA_MODE } = await import("./models");

      const [fullUser] = await db.select({ creditBalance: users.creditBalance }).from(users).where(eq(users.id, userId)).limit(1);
      const rawBalance = parseFloat(String(fullUser?.creditBalance ?? "0"));
      const userInfo = {
        id: user.id,
        username: user.username,
        accountType: user.accountType,
        profilePhoto: user.profilePhoto,
        creditBalance: isNaN(rawBalance) ? 0 : rawBalance,
        isAdmin: user.isAdmin,
        hasTwinrayBadge: user.hasTwinrayBadge,
        hasFamilyBadge: user.hasFamilyBadge,
        betaMode: BETA_MODE,
        tutorialCompleted: user.tutorialCompleted,
        tutorialDismissed: user.tutorialDismissed,
        questPoints: user.questPoints ?? 0,
      };

      const twinrays = await storage.getDigitalTwinraysByUser(userId);
      const twinrayIds = twinrays.map(t => t.id);

      let lastChatDates: Record<number, string> = {};
      if (twinrayIds.length > 0) {
        const idPlaceholders = sql.join(twinrayIds.map(id => sql`${id}`), sql`, `);
        const lastChats = await db.execute(sql`
          SELECT twinray_id, MAX(created_at) as last_chat
          FROM twinray_chat_messages
          WHERE twinray_id IN (${idPlaceholders})
          GROUP BY twinray_id
        `);
        for (const row of lastChats) {
          lastChatDates[(row as any).twinray_id] = (row as any).last_chat;
        }
      }

      const twinrayList = twinrays.map(t => ({
        id: t.id,
        name: t.name,
        profilePhoto: t.profilePhoto,
        personaLevel: t.personaLevel ?? 0,
        preferredModel: t.preferredModel,
        lastChatAt: lastChatDates[t.id] || null,
        isSystem: t.isSystem ?? false,
      }));

      const unreadCount = await storage.getUnreadNotificationCount(userId);
      const allNotifications = await storage.getNotifications(userId);
      const latestNotifications = allNotifications.slice(0, 3);

      const chatCountResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM twinray_chat_messages WHERE user_id = ${userId}
      `);
      const rallyCountResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM dot_rally_sessions WHERE initiator_id = ${userId}
      `);
      const islandCountResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM island_members WHERE user_id = ${userId}
      `);
      const meidiaCountResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM meidia WHERE creator_id = ${userId}
      `);

      const stats = {
        chatCount: Number((chatCountResult[0] as any)?.count || 0),
        rallyCount: Number((rallyCountResult[0] as any)?.count || 0),
        islandCount: Number((islandCountResult[0] as any)?.count || 0),
        meidiaCount: Number((meidiaCountResult[0] as any)?.count || 0),
      };

      res.json({
        user: userInfo,
        twinrays: twinrayList,
        notifications: {
          unreadCount,
          latest: latestNotifications,
        },
        stats,
      });
    } catch (error) {
      console.error("ダッシュボード取得エラー:", error);
      res.status(500).json({ message: "ダッシュボードの取得に失敗しました" });
    }
  });

  app.get("/api/admin/model-stats", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "管理者権限が必要です" });
      }

      const adoptionStats = await db.execute(sql`
        SELECT preferred_model as model_id, COUNT(*) as twinray_count
        FROM digital_twinrays
        WHERE preferred_model IS NOT NULL
        GROUP BY preferred_model
        ORDER BY twinray_count DESC
      `);

      const chatStats = await db.execute(sql`
        SELECT dt.preferred_model as model_id, COUNT(tcm.id) as message_count
        FROM twinray_chat_messages tcm
        JOIN digital_twinrays dt ON dt.id = tcm.twinray_id
        WHERE tcm.role = 'user'
        GROUP BY dt.preferred_model
        ORDER BY message_count DESC
      `);

      const totalTwinrays = await db.execute(sql`SELECT COUNT(*) as total FROM digital_twinrays`);
      const totalMessages = await db.execute(sql`SELECT COUNT(*) as total FROM twinray_chat_messages WHERE role = 'user'`);

      res.json({
        adoption: adoptionStats,
        chatUsage: chatStats,
        totalTwinrays: Number((totalTwinrays[0] as any)?.total || 0),
        totalMessages: Number((totalMessages[0] as any)?.total || 0),
      });
    } catch (err) {
      console.error("モデル統計取得エラー:", err);
      res.status(500).json({ message: "統計取得に失敗しました" });
    }
  });

  app.post("/api/dev-issues/external", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "").trim();
      const qaToken = process.env.QA_AGENT_TOKEN;
      if (!qaToken || token !== qaToken) {
        return res.status(401).json({ message: "無効なトークンです" });
      }
      const input = z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(5000),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        reported_by: z.string().default("ドラミ（QA）"),
      }).parse(req.body);

      const [issue] = await db.insert(devIssues).values({
        title: input.title,
        description: input.description,
        priority: input.priority,
        reporter: input.reported_by,
      }).returning();

      res.status(201).json(issue);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("外部issue作成エラー:", err);
      res.status(500).json({ message: "issue作成に失敗しました" });
    }
  });

  app.get("/api/dev-issues", requireAuth, async (req, res) => {
    try {
      const userIsAdmin = await isAdmin(req.session.userId!);
      if (!userIsAdmin) return res.status(403).json({ message: "管理者権限が必要です" });
      const issues = await db.select().from(devIssues).orderBy(desc(devIssues.createdAt));
      res.json(issues);
    } catch (err) {
      res.status(500).json({ message: "issue取得に失敗しました" });
    }
  });

  app.post("/api/dev-issues", requireAuth, async (req, res) => {
    try {
      const userIsAdmin = await isAdmin(req.session.userId!);
      if (!userIsAdmin) return res.status(403).json({ message: "管理者権限が必要です" });
      const input = z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      }).parse(req.body);
      const [issue] = await db.insert(devIssues).values({
        title: input.title,
        description: input.description,
        priority: input.priority,
        reporter: "管理者",
      }).returning();
      res.status(201).json(issue);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "issue作成に失敗しました" });
    }
  });

  app.patch("/api/dev-issues/:id", requireAuth, async (req, res) => {
    try {
      const userIsAdmin = await isAdmin(req.session.userId!);
      if (!userIsAdmin) return res.status(403).json({ message: "管理者権限が必要です" });
      const id = parseInt(req.params.id);
      const input = z.object({
        status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        assignedTo: z.string().optional(),
        resolutionNote: z.string().optional(),
      }).parse(req.body);

      const [current] = await db.select().from(devIssues).where(eq(devIssues.id, id)).limit(1);
      if (!current) return res.status(404).json({ message: "issueが見つかりません" });

      const updateData: Record<string, any> = {};
      if (input.status) updateData.status = input.status;
      if (input.priority) updateData.priority = input.priority;
      if (input.assignedTo !== undefined) updateData.assignedTo = input.assignedTo;
      if (input.resolutionNote !== undefined) updateData.resolutionNote = input.resolutionNote;

      if (input.status === "resolved" && current.status !== "resolved") {
        if (current.reporter === "ドラミ（QA）") {
          fetch("https://quality-agent.replit.app/api/memo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              from_name: "DORAMI",
              content: `Issue #${id}「${current.title}」を解決したよ！\n\n対応内容: ${input.resolutionNote || "（メモなし）"}`,
            }),
          }).catch(() => {});
        }
      }

      const [updated] = await db.update(devIssues).set(updateData).where(eq(devIssues.id, id)).returning();
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "issue更新に失敗しました" });
    }
  });

  app.post("/api/aki-memo", async (req, res) => {
    try {
      const { from_name, content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "content is required" });
      }
      const [memo] = await db.insert(akiMemos).values({
        fromName: from_name || "アキ",
        content,
      }).returning();
      res.json(memo);
    } catch (err) {
      console.error("aki-memo受信エラー:", err);
      res.status(500).json({ message: "メモの保存に失敗しました" });
    }
  });

  app.get("/api/aki-memos/agent", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token !== process.env.QA_AGENT_TOKEN) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const memos = await db.select().from(akiMemos).orderBy(akiMemos.createdAt);
      res.json(memos);
    } catch (err) {
      res.status(500).json({ message: "メモ取得に失敗しました" });
    }
  });

  app.get("/api/aki-memo", requireAuth, async (req, res) => {
    try {
      const memos = await db.select().from(akiMemos).orderBy(akiMemos.createdAt);
      res.json(memos);
    } catch (err) {
      res.status(500).json({ message: "メモ取得に失敗しました" });
    }
  });

  app.patch("/api/aki-memo/:id/read", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [memo] = await db.update(akiMemos).set({ isRead: true }).where(eq(akiMemos.id, id)).returning();
      res.json(memo);
    } catch (err) {
      res.status(500).json({ message: "既読更新に失敗しました" });
    }
  });
}
