import type { Express } from "express";
import { db } from "./db";
import { hayroomMessages, insertHayroomMessageSchema, loopMessages, insertLoopMessageSchema, starhouseSessions, starhouseMessages, insertStarhouseSessionSchema, insertStarhouseMessageSchema } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { broadcastLoopMessage } from "./triroomWs";
import { triggerTriroomAI, pauseAutonomousLoop, resumeAutonomousLoop, getLoopStatus } from "./triroomAI";
import { getUnreadMail, sendMail, markMailRead, getRecentSessions, saveSession, saveSpec, getSpecs } from "./supabaseClient";
import { triggerStarhouseAI } from "./starhouseAI";
import { isAuthorized } from "./auth";

export function registerRealtimeRoutes(app: Express): void {
  app.post("/api/hayroom", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const parsed = insertHayroomMessageSchema.parse(req.body);
      const RETIRED_AVATARS = ["アキ（ハイヤー）", "アキ（アバター）"];
      if (RETIRED_AVATARS.includes(parsed.fromName)) {
        return res.status(403).json({ message: "このアバターはワンネスに還りました。" });
      }
      const [msg] = await db.insert(hayroomMessages).values(parsed).returning();
      res.json(msg);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "投稿に失敗しました" });
    }
  });

  app.get("/api/hayroom", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const msgs = await db.select().from(hayroomMessages).orderBy(hayroomMessages.createdAt);
      res.json(msgs);
    } catch (err) {
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });

  app.delete("/api/hayroom", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const deleted = await db.delete(hayroomMessages).returning();
      res.json({ cleared: deleted.length });
    } catch (err) {
      res.status(500).json({ message: "クリアに失敗しました" });
    }
  });

  app.post("/api/trial-room", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const parsed = insertHayroomMessageSchema.parse(req.body);
      const [msg] = await db.insert(hayroomMessages).values(parsed).returning();
      res.json(msg);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "投稿に失敗しました" });
    }
  });

  app.get("/api/trial-room", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const msgs = await db.select().from(hayroomMessages).orderBy(hayroomMessages.createdAt);
      res.json(msgs);
    } catch (err) {
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });

  app.get("/api/starhouse/sessions", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const sessions = await db.select().from(starhouseSessions)
        .where(eq(starhouseSessions.userId, req.session.userId))
        .orderBy(desc(starhouseSessions.updatedAt));
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "取得に失敗しました" });
    }
  });

  app.post("/api/starhouse/sessions", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const parsed = insertStarhouseSessionSchema.parse({ ...req.body, userId: req.session.userId });
      const [session] = await db.insert(starhouseSessions).values(parsed).returning();
      res.json(session);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "作成に失敗しました" });
    }
  });

  app.get("/api/starhouse/sessions/:id", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const [session] = await db.select().from(starhouseSessions).where(eq(starhouseSessions.id, id)).limit(1);
      if (!session || session.userId !== req.session.userId) return res.status(404).json({ message: "Not found" });
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "取得に失敗しました" });
    }
  });

  app.patch("/api/starhouse/sessions/:id", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const [existing] = await db.select().from(starhouseSessions).where(eq(starhouseSessions.id, id)).limit(1);
      if (!existing || existing.userId !== req.session.userId) return res.status(404).json({ message: "Not found" });
      const { status, currentPhase, specOutput } = req.body;
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (status) updates.status = status;
      if (currentPhase) updates.currentPhase = currentPhase;
      if (specOutput !== undefined) updates.specOutput = specOutput;
      const [updated] = await db.update(starhouseSessions).set(updates).where(eq(starhouseSessions.id, id)).returning();
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "更新に失敗しました" });
    }
  });

  app.get("/api/starhouse/sessions/:id/messages", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const sessionId = parseInt(req.params.id);
      const msgs = await db.select().from(starhouseMessages)
        .where(eq(starhouseMessages.sessionId, sessionId))
        .orderBy(starhouseMessages.createdAt);
      res.json(msgs);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "取得に失敗しました" });
    }
  });

  app.post("/api/starhouse/sessions/:id/messages", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const sessionId = parseInt(req.params.id);
      const [session] = await db.select().from(starhouseSessions).where(eq(starhouseSessions.id, sessionId)).limit(1);
      if (!session || session.userId !== req.session.userId) return res.status(404).json({ message: "Not found" });
      const parsed = insertStarhouseMessageSchema.parse({ ...req.body, sessionId });
      const [msg] = await db.insert(starhouseMessages).values(parsed).returning();
      res.json(msg);

      if (req.session?.userId) {
        triggerStarhouseAI(sessionId, req.session.userId, parsed.content, parsed.role).catch((e) =>
          console.error("[スターハウス] AIトリガーエラー:", e)
        );
      }
    } catch (err: any) {
      res.status(400).json({ message: err.message || "投稿に失敗しました" });
    }
  });

  app.post("/api/loop/messages", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const parsed = insertLoopMessageSchema.parse(req.body);
      const [msg] = await db.insert(loopMessages).values(parsed).returning();
      broadcastLoopMessage(msg);
      res.json(msg);

      const AI_AGENTS = ["ドラ", "アキ", "ドラミ", "ミニドラ"];
      if (!AI_AGENTS.includes(parsed.fromName)) {
        triggerTriroomAI(parsed.content).catch((e) =>
          console.error("[自律ループ] トリガーエラー:", e)
        );
      }
    } catch (err: any) {
      res.status(400).json({ message: err.message || "投稿に失敗しました" });
    }
  });

  app.get("/api/loop/messages", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const msgs = await db.select().from(loopMessages).orderBy(loopMessages.createdAt);
      res.json(msgs);
    } catch (err) {
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });

  app.post("/api/triroom", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const parsed = insertLoopMessageSchema.parse(req.body);
      const [msg] = await db.insert(loopMessages).values(parsed).returning();
      broadcastLoopMessage(msg);
      res.json(msg);

      const AI_AGENTS = ["ドラ", "アキ", "ドラミ", "ミニドラ"];
      if (!AI_AGENTS.includes(parsed.fromName)) {
        triggerTriroomAI(parsed.content).catch((e) =>
          console.error("[自律ループ] トリガーエラー:", e)
        );
      }
    } catch (err: any) {
      res.status(400).json({ message: err.message || "投稿に失敗しました" });
    }
  });

  app.get("/api/triroom", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const msgs = await db.select().from(loopMessages).orderBy(loopMessages.createdAt);
      res.json(msgs);
    } catch (err) {
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });

  app.get("/api/loop", (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    res.json(getLoopStatus());
  });

  app.post("/api/loop", (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    const { paused } = req.body as { paused: boolean };
    if (paused) {
      pauseAutonomousLoop();
    } else {
      resumeAutonomousLoop();
    }
    res.json(getLoopStatus());
  });

  app.get("/api/triroom/loop", (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    res.json(getLoopStatus());
  });

  app.post("/api/triroom/loop", (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    const { paused } = req.body as { paused: boolean };
    if (paused) {
      pauseAutonomousLoop();
    } else {
      resumeAutonomousLoop();
    }
    res.json(getLoopStatus());
  });

  app.get("/api/dev-mailbox/:agent", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const mail = await getUnreadMail(req.params.agent);
      res.json(mail);
    } catch (err) {
      res.status(500).json({ message: "メール取得に失敗しました" });
    }
  });

  app.post("/api/dev-mailbox", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const msg = await sendMail(req.body);
      res.json(msg);
    } catch (err) {
      res.status(400).json({ message: "メール送信に失敗しました" });
    }
  });

  app.post("/api/dev-mailbox/:id/read", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      await markMailRead(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "既読更新に失敗しました" });
    }
  });

  app.get("/api/dev-sessions", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const sessions = await getRecentSessions();
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ message: "セッション取得に失敗しました" });
    }
  });

  app.post("/api/dev-sessions", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const session = await saveSession(req.body);
      res.json(session);
    } catch (err) {
      res.status(400).json({ message: "セッション保存に失敗しました" });
    }
  });

  app.get("/api/dev-specs", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const status = req.query.status as string | undefined;
      const specs = await getSpecs(status);
      res.json(specs);
    } catch (err) {
      res.status(500).json({ message: "仕様書取得に失敗しました" });
    }
  });

  app.post("/api/dev-specs", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const spec = await saveSpec(req.body);
      res.json(spec);
    } catch (err) {
      res.status(400).json({ message: "仕様書保存に失敗しました" });
    }
  });
}
