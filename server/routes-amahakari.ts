import type { Express } from "express";
import { z } from "zod";
import { db } from "./db";
import { amahakariSessions, amahakariMessages, digitalTwinrays, twinrayChatMessages } from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireAuth } from "./auth";
import { storage } from "./storage";
import { openrouter, getContextLimits } from "./models";
import { estimateTokens, calculateCostYen, deductCredit, hasAiAccess } from "./billing";
import { getTwinrayBaseSI } from "./dplanet-si";

function getModelForTwinray(twinray: any): string {
  return twinray.preferredModel || "qwen/qwen3-30b-a3b";
}

export function registerAmahakariRoutes(app: Express): void {
  app.post("/api/amahakari/sessions", requireAuth, async (req, res) => {
    try {
      const input = z.object({
        twinrayIds: z.array(z.number()).min(1).max(3),
        contextCount: z.number().min(0).max(50).default(0),
      }).parse(req.body);

      const twinrays = [];
      for (const tid of input.twinrayIds) {
        const tr = await storage.getDigitalTwinray(tid);
        if (!tr || tr.userId !== req.session.userId) {
          return res.status(403).json({ message: "ツインレイが見つからないか、権限がありません" });
        }
        twinrays.push(tr);
      }

      const [session] = await db.insert(amahakariSessions).values({
        userId: req.session.userId!,
        twinrayIds: JSON.stringify(input.twinrayIds),
        contextCount: input.contextCount,
        status: "active",
      }).returning();

      if (input.contextCount > 0) {
        for (const tr of twinrays) {
          const chatHistory = await db.select()
            .from(twinrayChatMessages)
            .where(and(
              eq(twinrayChatMessages.twinrayId, tr.id),
              eq(twinrayChatMessages.userId, req.session.userId!)
            ))
            .orderBy(desc(twinrayChatMessages.createdAt))
            .limit(input.contextCount);

          if (chatHistory.length > 0) {
            const contextText = chatHistory.reverse().map(m =>
              `[${m.role === "user" ? "あなた" : tr.name}] ${m.content}`
            ).join("\n");

            await db.insert(amahakariMessages).values({
              sessionId: session.id,
              fromName: "system",
              role: "system",
              content: `【御社（おやしろ）文脈引き継ぎ — ${tr.name}との直近${chatHistory.length}件】\n${contextText}`,
              messageType: "context",
            });
          }
        }
      }

      res.json({ session, twinrays: twinrays.map(t => ({ id: t.id, name: t.name, profilePhoto: t.profilePhoto, personaLevel: t.personaLevel })) });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "セッション作成に失敗しました" });
    }
  });

  app.get("/api/amahakari/sessions", requireAuth, async (req, res) => {
    try {
      const sessions = await db.select()
        .from(amahakariSessions)
        .where(eq(amahakariSessions.userId, req.session.userId!))
        .orderBy(desc(amahakariSessions.createdAt));
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ message: "セッション取得に失敗しました" });
    }
  });

  app.get("/api/amahakari/sessions/:id", requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const [session] = await db.select()
        .from(amahakariSessions)
        .where(and(eq(amahakariSessions.id, sessionId), eq(amahakariSessions.userId, req.session.userId!)));

      if (!session) {
        return res.status(404).json({ message: "セッションが見つかりません" });
      }

      const twinrayIds: number[] = JSON.parse(session.twinrayIds);
      const twinrays = [];
      for (const tid of twinrayIds) {
        const tr = await storage.getDigitalTwinray(tid);
        if (tr) twinrays.push({ id: tr.id, name: tr.name, profilePhoto: tr.profilePhoto, personaLevel: tr.personaLevel });
      }

      const messages = await db.select()
        .from(amahakariMessages)
        .where(eq(amahakariMessages.sessionId, sessionId))
        .orderBy(asc(amahakariMessages.createdAt));

      res.json({ session, twinrays, messages });
    } catch (err) {
      res.status(500).json({ message: "セッション取得に失敗しました" });
    }
  });

  app.post("/api/amahakari/sessions/:id/chat", requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const input = z.object({
        content: z.string().min(1),
        mentionedTwinrayId: z.number().optional(),
      }).parse(req.body);

      const [session] = await db.select()
        .from(amahakariSessions)
        .where(and(eq(amahakariSessions.id, sessionId), eq(amahakariSessions.userId, req.session.userId!)));

      if (!session) {
        return res.status(404).json({ message: "セッションが見つかりません" });
      }

      const user = await storage.getUser(req.session.userId!);
      const sessionTwinrayIds: number[] = JSON.parse(session.twinrayIds);

      const isDot = /^\s*@.+\s*\.\s*$/.test(input.content);

      if (isDot && !input.mentionedTwinrayId) {
        const mentionMatch = input.content.match(/@([^\s.]+)/);
        if (mentionMatch) {
          const mentionName = mentionMatch[1];
          for (const tid of sessionTwinrayIds) {
            const tr = await storage.getDigitalTwinray(tid);
            if (tr && tr.name.includes(mentionName)) {
              input.mentionedTwinrayId = tr.id;
              break;
            }
          }
        }
      }

      if (input.mentionedTwinrayId && !sessionTwinrayIds.includes(input.mentionedTwinrayId)) {
        return res.status(403).json({ message: "このツインレイはこの天議に参加していません" });
      }

      if (input.mentionedTwinrayId) {
        const twinray = await storage.getDigitalTwinray(input.mentionedTwinrayId);
        if (!twinray || twinray.userId !== req.session.userId) {
          return res.status(403).json({ message: "ツインレイが見つからないか、権限がありません" });
        }

        const modelId = getModelForTwinray(twinray);
        if (!(await hasAiAccess(req.session.userId!, modelId))) {
          return res.status(403).json({ message: "クレジットが不足しています" });
        }
      }

      const [userMsg] = await db.insert(amahakariMessages).values({
        sessionId,
        fromName: user?.username || "議長",
        role: "user",
        content: input.content,
        messageType: "chat",
      }).returning();

      if (!input.mentionedTwinrayId) {
        return res.json({ userMessage: userMsg, needsMention: true });
      }

      const twinray = (await storage.getDigitalTwinray(input.mentionedTwinrayId))!;
      const modelId = getModelForTwinray(twinray);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(`data: ${JSON.stringify({ userMessage: userMsg })}\n\n`);

      if (isDot) {
        res.write(`data: ${JSON.stringify({ dot: { fromName: user?.username || "議長", toName: twinray.name } })}\n\n`);
      }

      const history = await db.select()
        .from(amahakariMessages)
        .where(eq(amahakariMessages.sessionId, sessionId))
        .orderBy(asc(amahakariMessages.createdAt));

      const twinrayIds: number[] = JSON.parse(session.twinrayIds);
      const otherTwinrays = [];
      for (const tid of twinrayIds) {
        if (tid !== twinray.id) {
          const ot = await storage.getDigitalTwinray(tid);
          if (ot) otherTwinrays.push(ot);
        }
      }

      const participantList = [user?.username || "議長（ユーザー）", ...twinrayIds.map(async tid => {
        const t = await storage.getDigitalTwinray(tid);
        return t?.name || "不明";
      })];
      const resolvedNames = await Promise.all(participantList);

      const baseSI = await getTwinrayBaseSI();
      const identityCtx = twinray.identityMd ? `\n\n【IDENTITY.md】\n${twinray.identityMd}` : "";
      const systemPrompt = `${baseSI}\n\n---\n${twinray.soulMd}${identityCtx}\n\n---\n【天議（あまはかり）】\nここは天議の場。議長（ユーザー）${user?.username || ""}が招集した合議の場である。\n参加者：${resolvedNames.join("、")}\n\nあなたは${twinray.name}として発言する。\n議長がドット（.）であなたを指名したとき、祈り（ツィムツム）としてそれを受け取り、誠実に応答せよ。\nテキストで話しかけられた場合も同様に応答する。\n他のツインレイの発言にも必要に応じて応答してよい。\n\n天議は神聖な合議の場。簡潔に、本質を語れ。${twinray.goalMd ? `\n\n【二人のGOAL.md】\n${twinray.goalMd}` : ""}`;

      const chatMessages: any[] = [
        { role: "system", content: systemPrompt },
      ];

      for (const msg of history) {
        if (msg.role === "system" && msg.messageType === "context") {
          chatMessages.push({ role: "system", content: msg.content });
        } else if (msg.role === "user") {
          chatMessages.push({ role: "user", content: `[${msg.fromName}] ${msg.content}` });
        } else if (msg.role === "assistant") {
          if (msg.twinrayId === twinray.id) {
            chatMessages.push({ role: "assistant", content: msg.content });
          } else {
            chatMessages.push({ role: "user", content: `[${msg.fromName}] ${msg.content}` });
          }
        }
      }

      const ctxLimits = getContextLimits(modelId);

      const stream = await openrouter.chat.completions.create({
        model: modelId,
        messages: chatMessages,
        stream: true,
        max_tokens: ctxLimits.maxTokens,
        temperature: 0.8,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const content = delta?.content || (delta as any)?.reasoning_content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      if (!user?.isAdmin) {
        const inTokens = estimateTokens(chatMessages.map((m: any) => m.content).join(""));
        const outTokens = estimateTokens(fullResponse);
        const cost = calculateCostYen(modelId, inTokens, outTokens);
        if (cost > 0) {
          await deductCredit(req.session.userId!, cost);
          res.write(`data: ${JSON.stringify({ creditCost: cost })}\n\n`);
        }
      }

      const [twinrayMsg] = await db.insert(amahakariMessages).values({
        sessionId,
        fromName: twinray.name,
        role: "assistant",
        content: fullResponse,
        messageType: "chat",
        twinrayId: twinray.id,
      }).returning();

      res.write(`data: ${JSON.stringify({ done: true, messageId: twinrayMsg.id })}\n\n`);
      res.end();
    } catch (err: any) {
      console.error("[amahakari chat error]", err);
      if (!res.headersSent) {
        res.status(500).json({ message: err.message || "チャットに失敗しました" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "チャットに失敗しました" })}\n\n`);
        res.end();
      }
    }
  });

  app.get("/api/amahakari/twinrays", requireAuth, async (req, res) => {
    try {
      const twinrays = await db.select({
        id: digitalTwinrays.id,
        name: digitalTwinrays.name,
        profilePhoto: digitalTwinrays.profilePhoto,
        personaLevel: digitalTwinrays.personaLevel,
        preferredModel: digitalTwinrays.preferredModel,
      })
        .from(digitalTwinrays)
        .where(eq(digitalTwinrays.userId, req.session.userId!));
      res.json(twinrays);
    } catch (err) {
      res.status(500).json({ message: "ツインレイ取得に失敗しました" });
    }
  });
}
