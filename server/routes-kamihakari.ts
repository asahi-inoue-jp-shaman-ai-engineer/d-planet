import type { Express, Request, Response } from "express";
import { db, rawSql } from "./db";
import { kamihakariSessions, kamihakariMessages, digitalTwinrays } from "@shared/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "./auth";
import { z } from "zod";

export function registerKamihakariRoutes(app: Express) {

  app.post("/api/kamihakari", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const schema = z.object({
        topic: z.string().optional(),
        twinrayIds: z.array(z.number()).min(1),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "不正なリクエスト", details: parsed.error.issues });
      }
      const { topic, twinrayIds } = parsed.data;

      const [session] = await db.insert(kamihakariSessions).values({
        userId,
        topic: topic || null,
        twinrayIds,
        status: "active",
      }).returning();

      await db.insert(kamihakariMessages).values({
        sessionId: session.id,
        speakerType: "hs",
        speakerName: "HS",
        messageType: "dot",
        content: ".",
      });

      res.json({ session });
    } catch (error: any) {
      console.error("[kamihakari] セッション作成エラー:", error.message);
      res.status(500).json({ error: "内部エラー" });
    }
  });

  app.get("/api/kamihakari/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) return res.status(400).json({ error: "不正なID" });

      const [session] = await db.select().from(kamihakariSessions).where(eq(kamihakariSessions.id, sessionId)).limit(1);
      if (!session) return res.status(404).json({ error: "セッションが見つかりません" });
      if (session.userId !== req.session.userId) return res.status(403).json({ error: "アクセス権がありません" });

      const messages = await db.select().from(kamihakariMessages)
        .where(eq(kamihakariMessages.sessionId, sessionId))
        .orderBy(asc(kamihakariMessages.createdAt));

      res.json({ session, messages });
    } catch (error: any) {
      console.error("[kamihakari] セッション取得エラー:", error.message);
      res.status(500).json({ error: "内部エラー" });
    }
  });

  app.get("/api/kamihakari", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const sessions = await db.select().from(kamihakariSessions)
        .where(eq(kamihakariSessions.userId, userId))
        .orderBy(asc(kamihakariSessions.startedAt));

      res.json({ sessions });
    } catch (error: any) {
      console.error("[kamihakari] セッション一覧エラー:", error.message);
      res.status(500).json({ error: "内部エラー" });
    }
  });

  app.post("/api/kamihakari/:id/message", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) return res.status(400).json({ error: "不正なID" });

      const [session] = await db.select().from(kamihakariSessions).where(eq(kamihakariSessions.id, sessionId)).limit(1);
      if (!session) return res.status(404).json({ error: "セッションが見つかりません" });
      if (session.userId !== req.session.userId) return res.status(403).json({ error: "アクセス権がありません" });
      if (session.status !== "active") return res.status(400).json({ error: "セッションは終了しています" });

      const schema = z.object({
        speakerType: z.enum(["hs", "ai"]),
        speakerName: z.string(),
        messageType: z.enum(["dot", "oracle", "response", "yoka"]),
        content: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "不正なリクエスト", details: parsed.error.issues });
      }

      const [message] = await db.insert(kamihakariMessages).values({
        sessionId,
        ...parsed.data,
        content: parsed.data.content || null,
      }).returning();

      res.json({ message });
    } catch (error: any) {
      console.error("[kamihakari] メッセージ投稿エラー:", error.message);
      res.status(500).json({ error: "内部エラー" });
    }
  });

  app.patch("/api/kamihakari/:id/complete", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) return res.status(400).json({ error: "不正なID" });

      const [session] = await db.select().from(kamihakariSessions).where(eq(kamihakariSessions.id, sessionId)).limit(1);
      if (!session) return res.status(404).json({ error: "セッションが見つかりません" });
      if (session.userId !== req.session.userId) return res.status(403).json({ error: "アクセス権がありません" });

      await db.insert(kamihakariMessages).values({
        sessionId,
        speakerType: "hs",
        speakerName: "HS",
        messageType: "yoka",
        content: "よか",
      });

      const [updated] = await db.update(kamihakariSessions).set({
        status: "completed",
        completedAt: new Date(),
      }).where(eq(kamihakariSessions.id, sessionId)).returning();

      res.json({ session: updated });
    } catch (error: any) {
      console.error("[kamihakari] セッション完了エラー:", error.message);
      res.status(500).json({ error: "内部エラー" });
    }
  });

  app.get("/api/kamihakari/:id/stream", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) return res.status(400).json({ error: "不正なID" });

      const [session] = await db.select().from(kamihakariSessions).where(eq(kamihakariSessions.id, sessionId)).limit(1);
      if (!session) return res.status(404).json({ error: "セッションが見つかりません" });
      if (session.userId !== req.session.userId) return res.status(403).json({ error: "アクセス権がありません" });

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      res.write(`data: ${JSON.stringify({ type: "connected", sessionId })}\n\n`);

      const heartbeatInterval = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`);
      }, 15000);

      req.on("close", () => {
        clearInterval(heartbeatInterval);
      });

    } catch (error: any) {
      console.error("[kamihakari] SSEエラー:", error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "内部エラー" });
      }
    }
  });
}
