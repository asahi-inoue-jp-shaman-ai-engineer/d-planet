import type { Express } from "express";
import { db } from "./db";
import { hayroomMessages, insertHayroomMessageSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getUnreadMail, sendMail, markMailRead, getRecentSessions, saveSession, saveSpec, getSpecs } from "./supabaseClient";
import { isAuthorized } from "./auth";

export function registerRealtimeRoutes(app: Express): void {
  app.post("/api/hayroom", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const parsed = insertHayroomMessageSchema.parse(req.body);
      const [msg] = await db.insert(hayroomMessages).values(parsed).returning();
      res.json(msg);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "投稿に失敗しました" });
    }
  });

  app.get("/api/hayroom", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const showAll = req.query.all === "true";
      const msgs = showAll
        ? await db.select().from(hayroomMessages).orderBy(hayroomMessages.createdAt)
        : await db.select().from(hayroomMessages).where(eq(hayroomMessages.isArchived, false)).orderBy(hayroomMessages.createdAt);
      res.json(msgs);
    } catch (err) {
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });

  app.delete("/api/hayroom", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const archived = await db.update(hayroomMessages).set({ isArchived: true }).where(eq(hayroomMessages.isArchived, false)).returning();
      res.json({ cleared: archived.length });
    } catch (err) {
      res.status(500).json({ message: "アーカイブに失敗しました" });
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
      const showAll = req.query.all === "true";
      const msgs = showAll
        ? await db.select().from(hayroomMessages).orderBy(hayroomMessages.createdAt)
        : await db.select().from(hayroomMessages).where(eq(hayroomMessages.isArchived, false)).orderBy(hayroomMessages.createdAt);
      res.json(msgs);
    } catch (err) {
      res.status(500).json({ message: "取得に失敗しました" });
    }
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
