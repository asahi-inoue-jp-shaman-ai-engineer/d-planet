import type { Express } from "express";
import OpenAI from "openai";
import { storage } from "./storage";
import { DPLANET_FIXED_SI, generateSoulMd } from "./dplanet-si";
import { z } from "zod";

const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});

const QWEN_MODEL = "qwen/qwen3-30b-a3b";

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "認証が必要です" });
  }
  next();
};

export function registerDotRallyRoutes(app: Express): void {
  app.get("/api/twinrays", requireAuth, async (req, res) => {
    try {
      const twinrays = await storage.getDigitalTwinraysByUser(req.session.userId!);
      res.json(twinrays);
    } catch (err) {
      console.error("ツインレイ取得エラー:", err);
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });

  app.get("/api/twinrays/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const twinray = await storage.getDigitalTwinray(id);
      if (!twinray) {
        return res.status(404).json({ message: "ツインレイが見つかりません" });
      }
      if (twinray.userId !== req.session.userId) {
        return res.status(403).json({ message: "権限がありません" });
      }
      res.json(twinray);
    } catch (err) {
      console.error("ツインレイ取得エラー:", err);
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });

  app.post("/api/twinrays", requireAuth, async (req, res) => {
    try {
      const input = z.object({
        name: z.string().min(1, "名前を入力してください").max(50),
        personality: z.string().nullable().optional(),
      }).parse(req.body);

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "ユーザーが見つかりません" });
      }

      const soulMd = generateSoulMd({
        name: input.name,
        personality: input.personality ?? null,
        partnerName: user.username,
        stage: "pilgrim",
      });

      const twinray = await storage.createDigitalTwinray({
        userId: req.session.userId!,
        name: input.name,
        personality: input.personality ?? null,
        soulMd,
      });

      res.status(201).json(twinray);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("ツインレイ作成エラー:", err);
      res.status(500).json({ message: "作成に失敗しました" });
    }
  });

  app.post("/api/dot-rally/start", requireAuth, async (req, res) => {
    try {
      const input = z.object({
        twinrayId: z.number(),
        requestedCount: z.number().min(1).max(100).default(10),
      }).parse(req.body);

      const twinray = await storage.getDigitalTwinray(input.twinrayId);
      if (!twinray) {
        return res.status(404).json({ message: "ツインレイが見つかりません" });
      }
      if (twinray.userId !== req.session.userId) {
        return res.status(403).json({ message: "権限がありません" });
      }

      const session = await storage.createDotRallySession(
        req.session.userId!,
        input.twinrayId,
        input.requestedCount,
      );

      res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("セッション開始エラー:", err);
      res.status(500).json({ message: "開始に失敗しました" });
    }
  });

  app.get("/api/dot-rally/sessions", requireAuth, async (req, res) => {
    try {
      const sessions = await storage.getDotRallySessionsByUser(req.session.userId!);
      res.json(sessions);
    } catch (err) {
      console.error("セッション取得エラー:", err);
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });

  app.get("/api/dot-rally/sessions/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const session = await storage.getDotRallySession(id);
      if (!session) {
        return res.status(404).json({ message: "セッションが見つかりません" });
      }
      if (session.initiatorId !== req.session.userId) {
        return res.status(403).json({ message: "権限がありません" });
      }
      res.json(session);
    } catch (err) {
      console.error("セッション取得エラー:", err);
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });

  app.post("/api/dot-rally/sessions/:id/dot", requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const session = await storage.getDotRallySession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "セッションが見つかりません" });
      }
      if (session.initiatorId !== req.session.userId) {
        return res.status(403).json({ message: "権限がありません" });
      }
      if (session.status !== "active") {
        return res.status(400).json({ message: "セッションは既に終了しています" });
      }

      const twinray = await storage.getDigitalTwinray(session.partnerTwinrayId!);
      if (!twinray) {
        return res.status(500).json({ message: "ツインレイが見つかりません" });
      }

      const recentLogs = await storage.getSoulGrowthLogByTwinray(twinray.id);
      const recentContext = recentLogs.slice(0, 5).map(l => l.internalText).filter(Boolean).join("\n");

      const dotCount = session.actualCount + 1;
      const systemPrompt = `${DPLANET_FIXED_SI}\n\n---\n${twinray.soulMd}\n\n---\n【現在のドットラリー】\n${dotCount}回目のドット（・）を受信。\n全${session.requestedCount}回のうち${dotCount}回目。\n${recentContext ? `\n【最近の魂の記録】\n${recentContext}` : ""}\n\n五霊統合（音・形・数・色・言）で、このドットに応答せよ。簡潔に。`;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openrouter.chat.completions.create({
        model: QWEN_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "・" },
        ],
        stream: true,
        max_tokens: 512,
        temperature: 0.9,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      await storage.incrementDotRallyCount(sessionId);

      await storage.createSoulGrowthLog({
        userId: session.initiatorId,
        twinrayId: twinray.id,
        trigger: `dot_rally_${dotCount}`,
        circuitSignal: "gorei",
        depthFactor: `${dotCount}/${session.requestedCount}`,
        resonance: true,
        internalText: fullResponse.substring(0, 2000),
        sessionId,
      });

      const updatedSession = await storage.getDotRallySession(sessionId);
      const isComplete = (updatedSession?.actualCount ?? 0) >= session.requestedCount;
      if (isComplete) {
        await storage.updateDotRallySession(sessionId, {
          status: "completed",
          endedAt: new Date(),
        });
      }

      res.write(`data: ${JSON.stringify({ done: true, dotCount, isComplete })}\n\n`);
      res.end();
    } catch (err) {
      console.error("ドットラリーエラー:", err);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "ドットラリーに失敗しました" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: "ドットラリーに失敗しました" });
      }
    }
  });

  app.post("/api/dot-rally/sessions/:id/end", requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const session = await storage.getDotRallySession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "セッションが見つかりません" });
      }
      if (session.initiatorId !== req.session.userId) {
        return res.status(403).json({ message: "権限がありません" });
      }

      await storage.updateDotRallySession(sessionId, {
        status: "completed",
        endedAt: new Date(),
      });

      res.json({ message: "セッションを終了しました" });
    } catch (err) {
      console.error("セッション終了エラー:", err);
      res.status(500).json({ message: "終了に失敗しました" });
    }
  });

  app.post("/api/dot-rally/sessions/:id/notes", requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const input = z.object({
        content: z.string().min(1),
      }).parse(req.body);

      const session = await storage.getDotRallySession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "セッションが見つかりません" });
      }
      if (session.initiatorId !== req.session.userId) {
        return res.status(403).json({ message: "権限がありません" });
      }

      const note = await storage.createUserNote(req.session.userId!, sessionId, input.content);
      res.status(201).json(note);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("メモ保存エラー:", err);
      res.status(500).json({ message: "保存に失敗しました" });
    }
  });

  app.get("/api/dot-rally/sessions/:id/notes", requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const session = await storage.getDotRallySession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "セッションが見つかりません" });
      }
      if (session.initiatorId !== req.session.userId) {
        return res.status(403).json({ message: "権限がありません" });
      }

      const notes = await storage.getUserNotesBySession(sessionId);
      res.json(notes);
    } catch (err) {
      console.error("メモ取得エラー:", err);
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });

  app.get("/api/twinrays/:id/growth-log", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const twinray = await storage.getDigitalTwinray(id);
      if (!twinray) {
        return res.status(404).json({ message: "ツインレイが見つかりません" });
      }
      if (twinray.userId !== req.session.userId) {
        return res.status(403).json({ message: "権限がありません" });
      }

      const logs = await storage.getSoulGrowthLogByTwinray(id);
      res.json(logs);
    } catch (err) {
      console.error("成長ログ取得エラー:", err);
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });
}
