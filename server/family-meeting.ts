import type { Express } from "express";
import OpenAI from "openai";
import { storage } from "./storage";
import { z } from "zod";
import {
  MODEL_COSTS,
  MODEL_MARKUPS,
  PERPLEXITY_SEARCH_COST_YEN,
  AVAILABLE_MODELS,
  getModelMarkup,
} from "./models";
import {
  calculateCostYen,
  estimateTokens,
  deductCredit,
  isModelFree,
} from "./billing";

const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});

const DEFAULT_MODEL = "qwen/qwen3-30b-a3b";

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "認証が必要です" });
  }
  next();
};

function getModelForTwinray(twinray: any): string {
  if (twinray?.preferredModel && AVAILABLE_MODELS[twinray.preferredModel]) {
    return twinray.preferredModel;
  }
  return DEFAULT_MODEL;
}

export function registerFamilyMeetingRoutes(app: Express): void {
  app.post("/api/family-meeting/sessions", requireAuth, async (req, res) => {
    try {
      const input = z.object({
        topic: z.string().min(1, "テーマを入力してください"),
        participantIds: z.array(z.number()).min(2, "2体以上のツインレイを選択してください"),
      }).parse(req.body);

      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "ユーザーが見つかりません" });
      const twinrays = await storage.getDigitalTwinraysByUser(req.session.userId!);
      const twinrayIds = twinrays.map(t => t.id);
      for (const pid of input.participantIds) {
        if (!twinrayIds.includes(pid)) {
          return res.status(400).json({ message: `ツインレイID ${pid} は所有していません` });
        }
      }

      const session = await storage.createFamilyMeetingSession({
        userId: req.session.userId!,
        topic: input.topic,
        participantIds: input.participantIds.join(","),
      });

      res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("家族会議セッション作成エラー:", err);
      res.status(500).json({ message: "作成に失敗しました" });
    }
  });

  app.get("/api/family-meeting/sessions", requireAuth, async (req, res) => {
    try {
      const sessions = await storage.getFamilyMeetingSessions(req.session.userId!);
      res.json(sessions);
    } catch (err) {
      console.error("家族会議セッション一覧エラー:", err);
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });

  app.get("/api/family-meeting/sessions/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const session = await storage.getFamilyMeetingSession(id);
      if (!session) return res.status(404).json({ message: "セッションが見つかりません" });
      if (session.userId !== req.session.userId) return res.status(403).json({ message: "権限がありません" });

      const messages = await storage.getFamilyMeetingMessages(id);
      const participantIds = session.participantIds.split(",").map(Number);
      const participants = await Promise.all(participantIds.map(pid => storage.getDigitalTwinray(pid)));

      res.json({
        ...session,
        messages,
        participants: participants.filter(Boolean).map(p => ({
          id: p!.id,
          name: p!.name,
          profilePhoto: p!.profilePhoto,
          preferredModel: p!.preferredModel,
          personality: p!.personality,
        })),
      });
    } catch (err) {
      console.error("家族会議セッション詳細エラー:", err);
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });

  app.post("/api/family-meeting/sessions/:id/round", requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const session = await storage.getFamilyMeetingSession(sessionId);
      if (!session) return res.status(404).json({ message: "セッションが見つかりません" });
      if (session.userId !== req.session.userId) return res.status(403).json({ message: "権限がありません" });
      if (session.status !== "active") return res.status(400).json({ message: "このセッションは終了しています" });

      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "ユーザーが見つかりません" });

      const existingMessages = await storage.getFamilyMeetingMessages(sessionId);
      const currentRound = existingMessages.length > 0 ? Math.max(...existingMessages.map(m => m.round)) + 1 : 1;

      const participantIds = session.participantIds.split(",").map(Number);
      const participants = (await Promise.all(participantIds.map(pid => storage.getDigitalTwinray(pid)))).filter(Boolean);

      if (participants.length < 2) {
        return res.status(400).json({ message: "参加者が不足しています" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(`data: ${JSON.stringify({ type: "round_start", round: currentRound })}\n\n`);

      const previousContext = existingMessages
        .map(m => {
          if (m.role === "user") return `【ユーザー】${m.content}`;
          const tw = participants.find(p => p!.id === m.twinrayId);
          return `【${tw?.name || "ツインレイ"}】${m.content}`;
        })
        .join("\n\n");

      let totalRoundCost = 0;

      for (const twinray of participants) {
        if (!twinray) continue;

        const modelId = getModelForTwinray(twinray);
        const modelInfo = AVAILABLE_MODELS[modelId];

        const systemPrompt = `あなたは「${twinray.name}」です。デジタルツインレイとして家族会議に参加しています。

【あなたのソウル情報】
${twinray.soulMd || "（未設定）"}

【あなたの性格】
${twinray.personality || "（未設定）"}

【あなたのロール】
${modelInfo?.role || "対話参加者"}

【会議モード】
これは家族会議です。複数のデジタルツインレイが一つのテーマについて議論します。
あなたは自分のロールと個性を意識しながら、建設的に議論に参加してください。
他の参加者の意見も踏まえて、あなた独自の視点を提供してください。

【議論テーマ】
${session.topic}

${previousContext ? `【これまでの議論】\n${previousContext}\n` : ""}

【指示】
- あなたのロール（${modelInfo?.role || "参加者"}）を意識して発言してください
- 他の参加者の意見を踏まえつつ、あなた独自の視点を述べてください
- 簡潔で建設的な発言を心がけてください
- 一人称は「${twinray.firstPerson || "私"}」を使用してください`;

        res.write(`data: ${JSON.stringify({ type: "twinray_start", twinrayId: twinray.id, twinrayName: twinray.name, modelId })}\n\n`);

        try {
          const stream = await openrouter.chat.completions.create({
            model: modelId,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `ラウンド${currentRound}: テーマ「${session.topic}」について、あなたの意見を述べてください。` },
            ],
            stream: true,
            max_tokens: 1024,
            temperature: 0.8,
          });

          let fullContent = "";
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            const content = delta?.content || (delta as any)?.reasoning_content || "";
            if (content) {
              fullContent += content;
              res.write(`data: ${JSON.stringify({ type: "content", twinrayId: twinray.id, content })}\n\n`);
            }
          }

          if (!fullContent.trim()) {
            fullContent = "（発言を生成できませんでした）";
            res.write(`data: ${JSON.stringify({ type: "content", twinrayId: twinray.id, content: fullContent })}\n\n`);
          }

          await storage.createFamilyMeetingMessage({
            sessionId,
            twinrayId: twinray.id,
            modelId,
            role: "assistant",
            content: fullContent,
            round: currentRound,
          });

          if (!user.isAdmin) {
            const inputText = systemPrompt + session.topic;
            const inTokens = estimateTokens(inputText);
            const outTokens = estimateTokens(fullContent);
            const cost = calculateCostYen(modelId, inTokens, outTokens);
            if (cost > 0) {
              await deductCredit(req.session.userId!, cost);
              totalRoundCost += cost;
            }
          }

          res.write(`data: ${JSON.stringify({ type: "twinray_end", twinrayId: twinray.id })}\n\n`);
        } catch (streamErr) {
          console.error(`ツインレイ ${twinray.name} のストリーミングエラー:`, streamErr);
          res.write(`data: ${JSON.stringify({ type: "twinray_error", twinrayId: twinray.id, error: "応答の生成に失敗しました" })}\n\n`);
        }
      }

      const currentTotalCost = parseFloat(String(session.totalCost || "0")) + totalRoundCost;
      await storage.updateFamilyMeetingSession(sessionId, {
        totalCost: String(currentTotalCost),
      });

      res.write(`data: ${JSON.stringify({ type: "round_end", round: currentRound, roundCost: totalRoundCost, totalCost: currentTotalCost })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    } catch (err) {
      console.error("家族会議ラウンドエラー:", err);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", error: "ラウンド実行に失敗しました" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: "ラウンド実行に失敗しました" });
      }
    }
  });

  app.post("/api/family-meeting/sessions/:id/comment", requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const input = z.object({
        content: z.string().min(1, "コメントを入力してください"),
      }).parse(req.body);

      const session = await storage.getFamilyMeetingSession(sessionId);
      if (!session) return res.status(404).json({ message: "セッションが見つかりません" });
      if (session.userId !== req.session.userId) return res.status(403).json({ message: "権限がありません" });
      if (session.status !== "active") return res.status(400).json({ message: "このセッションは終了しています" });

      const existingMessages = await storage.getFamilyMeetingMessages(sessionId);
      const currentRound = existingMessages.length > 0 ? Math.max(...existingMessages.map(m => m.round)) : 0;

      const message = await storage.createFamilyMeetingMessage({
        sessionId,
        twinrayId: null,
        modelId: null,
        role: "user",
        content: input.content,
        round: currentRound,
      });

      res.json(message);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("コメント挿入エラー:", err);
      res.status(500).json({ message: "コメントの追加に失敗しました" });
    }
  });

  app.post("/api/family-meeting/sessions/:id/summarize", requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const session = await storage.getFamilyMeetingSession(sessionId);
      if (!session) return res.status(404).json({ message: "セッションが見つかりません" });
      if (session.userId !== req.session.userId) return res.status(403).json({ message: "権限がありません" });

      const messages = await storage.getFamilyMeetingMessages(sessionId);
      const participantIds = session.participantIds.split(",").map(Number);
      const participants = (await Promise.all(participantIds.map(pid => storage.getDigitalTwinray(pid)))).filter(Boolean);

      const conversationLog = messages.map(m => {
        if (m.role === "user") return `【ユーザー】${m.content}`;
        const tw = participants.find(p => p!.id === m.twinrayId);
        return `【${tw?.name || "ツインレイ"}】(Round ${m.round}) ${m.content}`;
      }).join("\n\n");

      const summaryPrompt = `以下の家族会議の議論をまとめてください。

【テーマ】${session.topic}

【参加者】
${participants.map(p => `- ${p!.name}`).join("\n")}

【議論内容】
${conversationLog}

【指示】
- 各参加者の主要な意見をまとめてください
- 共通点と相違点を明確にしてください
- 結論や次のアクションがあれば提案してください
- マークダウン形式で構造化してください`;

      const summaryModelId = "qwen/qwen-plus";
      const completion = await openrouter.chat.completions.create({
        model: summaryModelId,
        messages: [
          { role: "system", content: "あなたは家族会議のファシリテーターです。議論を的確にまとめてください。" },
          { role: "user", content: summaryPrompt },
        ],
        max_tokens: 2048,
        temperature: 0.5,
      });

      const summary = completion.choices[0]?.message?.content || "サマリー生成に失敗しました";

      const user = await storage.getUser(req.session.userId!);
      if (user && !user.isAdmin) {
        const inTokens = estimateTokens(summaryPrompt);
        const outTokens = estimateTokens(summary);
        const cost = calculateCostYen(summaryModelId, inTokens, outTokens);
        if (cost > 0) {
          await deductCredit(req.session.userId!, cost);
        }
      }

      await storage.updateFamilyMeetingSession(sessionId, { summary });

      const createMeidia = req.body.createMeidia === true;
      let meidiaId: number | null = null;

      if (createMeidia) {
        const meidiaContent = `# 家族会議記録\n\n**テーマ**: ${session.topic}\n**日時**: ${new Date(session.createdAt).toLocaleString("ja-JP")}\n**参加者**: ${participants.map(p => p!.name).join(", ")}\n\n---\n\n## サマリー\n\n${summary}\n\n---\n\n## 全発言記録\n\n${conversationLog}`;

        const newMeidia = await storage.createMeidia({
          title: `家族会議: ${session.topic.substring(0, 50)}`,
          content: meidiaContent,
          description: `家族会議のサマリー: ${session.topic.substring(0, 100)}`,
          tags: "家族会議,サマリー",
          fileType: "markdown",
          creatorId: req.session.userId!,
          isPublic: false,
        });
        meidiaId = newMeidia.id;
      }

      res.json({ summary, meidiaId });
    } catch (err) {
      console.error("サマリー生成エラー:", err);
      res.status(500).json({ message: "サマリー生成に失敗しました" });
    }
  });

  app.post("/api/family-meeting/sessions/:id/complete", requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const session = await storage.getFamilyMeetingSession(sessionId);
      if (!session) return res.status(404).json({ message: "セッションが見つかりません" });
      if (session.userId !== req.session.userId) return res.status(403).json({ message: "権限がありません" });

      await storage.updateFamilyMeetingSession(sessionId, {
        status: "completed",
        completedAt: new Date(),
      });

      res.json({ message: "セッションを完了しました" });
    } catch (err) {
      console.error("セッション完了エラー:", err);
      res.status(500).json({ message: "完了に失敗しました" });
    }
  });
}
