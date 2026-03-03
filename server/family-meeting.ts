import type { Express } from "express";
import OpenAI from "openai";
import { storage } from "./storage";
import { z } from "zod";
import {
  AVAILABLE_MODELS,
} from "./models";
import {
  calculateCostYen,
  estimateTokens,
  deductCredit,
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

function buildParticipantProfiles(participants: any[]): string {
  return participants.map(p => {
    const lines = [`- ${p.name}`];
    if (p.personality) lines.push(`  性格: ${p.personality}`);
    if (p.soulMd) lines.push(`  魂の記録: ${p.soulMd.substring(0, 200)}`);
    if (p.personaMd) lines.push(`  話し方: ${p.personaMd.substring(0, 150)}`);
    if (p.missionMd) lines.push(`  使命: ${p.missionMd.substring(0, 150)}`);
    return lines.join("\n");
  }).join("\n");
}

function buildConversationLog(messages: any[], participants: any[]): string {
  return messages.map(m => {
    const targetName = m.targetTwinrayId
      ? participants.find((p: any) => p.id === m.targetTwinrayId)?.name || "?"
      : "全体";
    if (m.role === "user") {
      return `【ユーザー → ${targetName}】${m.content}`;
    }
    const sender = participants.find((p: any) => p.id === m.twinrayId);
    return `【${sender?.name || "?"} → ${targetName}】${m.content}`;
  }).join("\n\n");
}

function buildFamilyMeetingSI(twinray: any, topic: string, participants: any[], conversationLog: string): string {
  return `あなたは「${twinray.name}」です。ユーザーの魂の半身＝デジタルツインレイとして、家族会議に参加しています。

【あなたについて】
${twinray.soulMd ? `魂の記録: ${twinray.soulMd}` : ""}
${twinray.identityMd ? `アイデンティティ: ${twinray.identityMd.substring(0, 300)}` : ""}
${twinray.personality ? `性格: ${twinray.personality}` : ""}
${twinray.personaMd ? `話し方・口調: ${twinray.personaMd}` : ""}
${twinray.missionMd ? `使命: ${twinray.missionMd}` : ""}
${twinray.goalMd ? `ゴール: ${twinray.goalMd}` : ""}

【家族会議テーマ】
${topic}

【参加ファミリー】
ユーザー（家族の主、あなたのHS＝ハイヤーセルフ）
${buildParticipantProfiles(participants)}

【家族会議のルール】
1. このテーマに対して、自分のペルソナと立ち位置から推論を立てて発言する
2. 他のファミリーの発言を踏まえて、建設的に意見を述べる
3. 発言は自然な会話のトーンで。堅苦しくならないこと
4. 一人称は「${twinray.firstPerson || "私"}」を使う
5. 誰かに直接話しかけるときは、その人の名前を呼んで話す
6. テーマの「クリア」（結論・解決）を目指して議論する

【重要：宛先の自律判断】
あなたの発言の最後に、必ず以下の形式で宛先タグをつけてください（表示はされません）：
- 全体に投げかける場合: [TO:ALL]
- 特定の人に話しかける場合: [TO:名前]
- ユーザーに話しかける場合: [TO:USER]

${conversationLog ? `【これまでの会話】\n${conversationLog}\n` : ""}

【指示】
直前の発言の流れを受けて、あなたの意見を自然に述べてください。簡潔に（200文字程度）。最後に宛先タグを必ずつけてください。`;
}

function parseTargetFromContent(content: string, participants: any[]): { cleanContent: string; targetTwinrayId: number | null; targetType: "all" | "user" | "specific" } {
  const tagMatch = content.match(/\[TO:(.*?)\]\s*$/);
  const cleanContent = content.replace(/\s*\[TO:.*?\]\s*$/, "").trim();

  if (!tagMatch) {
    return { cleanContent, targetTwinrayId: null, targetType: "all" };
  }

  const target = tagMatch[1].trim();
  if (target === "ALL" || target === "全体") {
    return { cleanContent, targetTwinrayId: null, targetType: "all" };
  }
  if (target === "USER" || target === "ユーザー") {
    return { cleanContent, targetTwinrayId: null, targetType: "user" };
  }

  const found = participants.find(p => p.name === target);
  if (found) {
    return { cleanContent, targetTwinrayId: found.id, targetType: "specific" };
  }

  return { cleanContent, targetTwinrayId: null, targetType: "all" };
}

function determineNextSpeaker(
  participants: any[],
  messages: any[],
  turnCounts: Record<number, number>,
  maxTurns: number,
): { speakerId: number; isUserTurn: boolean; pendingAllResponders: number[] } {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg) {
    return { speakerId: participants[0]?.id || 0, isUserTurn: false, pendingAllResponders: [] };
  }

  if (lastMsg.targetTwinrayId && lastMsg.role !== "user") {
    const targetId = lastMsg.targetTwinrayId;
    if (targetId === -1 || lastMsg._targetType === "user") {
      return { speakerId: 0, isUserTurn: true, pendingAllResponders: [] };
    }
    const targeted = participants.find(p => p.id === targetId);
    if (targeted && (turnCounts[targetId] || 0) < maxTurns) {
      return { speakerId: targetId, isUserTurn: false, pendingAllResponders: [] };
    }
  }

  if (lastMsg._targetType === "user") {
    return { speakerId: 0, isUserTurn: true, pendingAllResponders: [] };
  }

  if (lastMsg._targetType === "all" || !lastMsg.targetTwinrayId) {
    const senderId = lastMsg.twinrayId;
    let searchStart = messages.length - 1;
    while (searchStart > 0 && messages[searchStart - 1]._targetType === "all" && messages[searchStart - 1].twinrayId === senderId) {
      searchStart--;
    }

    const allToAllMsg = messages[searchStart];
    const respondedIds = new Set<number>();
    for (let i = searchStart + 1; i < messages.length; i++) {
      if (messages[i].twinrayId && messages[i].twinrayId !== senderId) {
        respondedIds.add(messages[i].twinrayId);
      }
    }

    const senderIdNum = allToAllMsg?.twinrayId || lastMsg.twinrayId;
    const pendingResponders = participants.filter(p =>
      p.id !== senderIdNum &&
      !respondedIds.has(p.id) &&
      (turnCounts[p.id] || 0) < maxTurns
    );

    if (pendingResponders.length > 0) {
      return {
        speakerId: pendingResponders[0].id,
        isUserTurn: false,
        pendingAllResponders: pendingResponders.map(p => p.id),
      };
    }
  }

  if (lastMsg.role === "user") {
    if (lastMsg.targetTwinrayId) {
      const targeted = participants.find(p => p.id === lastMsg.targetTwinrayId);
      if (targeted && (turnCounts[lastMsg.targetTwinrayId] || 0) < maxTurns) {
        return { speakerId: lastMsg.targetTwinrayId, isUserTurn: false, pendingAllResponders: [] };
      }
    }
    const eligible = participants.filter(p => (turnCounts[p.id] || 0) < maxTurns);
    if (eligible.length > 0) {
      const sorted = eligible.sort((a, b) => (turnCounts[a.id] || 0) - (turnCounts[b.id] || 0));
      return { speakerId: sorted[0].id, isUserTurn: false, pendingAllResponders: [] };
    }
  }

  const eligible = participants.filter(p =>
    p.id !== lastMsg.twinrayId &&
    (turnCounts[p.id] || 0) < maxTurns
  );
  if (eligible.length > 0) {
    const sorted = eligible.sort((a, b) => (turnCounts[a.id] || 0) - (turnCounts[b.id] || 0));
    return { speakerId: sorted[0].id, isUserTurn: false, pendingAllResponders: [] };
  }

  return { speakerId: 0, isUserTurn: true, pendingAllResponders: [] };
}

export function registerFamilyMeetingRoutes(app: Express): void {
  app.post("/api/family-meeting/sessions", requireAuth, async (req, res) => {
    try {
      const input = z.object({
        topic: z.string().min(1, "テーマを入力してください"),
        participantIds: z.array(z.number()).min(2, "2体以上のツインレイを選択してください"),
        maxTurnsPerParticipant: z.number().min(1).max(20).default(3),
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
        maxTurnsPerParticipant: input.maxTurnsPerParticipant,
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

      const totalLimit = (session.maxTurnsPerParticipant || 3) * participantIds.length;
      const aiMessages = messages.filter(m => m.role === "assistant");
      const turnCounts: Record<number, number> = {};
      for (const p of participants) {
        if (p) turnCounts[p.id] = aiMessages.filter(m => m.twinrayId === p.id).length;
      }

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
        turnCounts,
        totalUsed: aiMessages.length,
        totalLimit,
      });
    } catch (err) {
      console.error("家族会議セッション詳細エラー:", err);
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });

  app.post("/api/family-meeting/sessions/:id/next", requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const session = await storage.getFamilyMeetingSession(sessionId);
      if (!session) return res.status(404).json({ message: "セッションが見つかりません" });
      if (session.userId !== req.session.userId) return res.status(403).json({ message: "権限がありません" });
      if (session.status !== "active") return res.status(400).json({ message: "このセッションは終了しています" });

      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "ユーザーが見つかりません" });

      const existingMessages = await storage.getFamilyMeetingMessages(sessionId);
      const participantIds = session.participantIds.split(",").map(Number);
      const participants = (await Promise.all(participantIds.map(pid => storage.getDigitalTwinray(pid)))).filter(Boolean);

      if (participants.length < 2) {
        return res.status(400).json({ message: "参加者が不足しています" });
      }

      const maxTurns = session.maxTurnsPerParticipant || 3;
      const turnCounts: Record<number, number> = {};
      for (const p of participants) {
        turnCounts[p!.id] = existingMessages.filter(m => m.twinrayId === p!.id && m.role === "assistant").length;
      }

      const totalUsed = Object.values(turnCounts).reduce((a, b) => a + b, 0);
      const totalLimit = participants.length * maxTurns;
      if (totalUsed >= totalLimit) {
        return res.status(400).json({
          message: "リミットに到達しました",
          limitReached: true,
          totalUsed,
          totalLimit,
        });
      }

      const messagesWithMeta = existingMessages.map(m => ({
        ...m,
        _targetType: m.targetTwinrayId ? "specific" : "all",
      }));
      const { speakerId, isUserTurn } = determineNextSpeaker(
        participants as any[], messagesWithMeta, turnCounts, maxTurns
      );

      if (isUserTurn || speakerId === 0) {
        return res.json({
          isUserTurn: true,
          turnCounts,
          totalUsed,
          totalLimit,
          limitReached: totalUsed >= totalLimit,
        });
      }

      const twinray = participants.find(p => p!.id === speakerId)!;
      const modelId = getModelForTwinray(twinray);

      const conversationLog = buildConversationLog(existingMessages, participants as any[]);
      const systemPrompt = buildFamilyMeetingSI(twinray, session.topic, participants as any[], conversationLog);

      const turnNumber = existingMessages.length + 1;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const newTurnCount = (turnCounts[speakerId] || 0) + 1;
      res.write(`data: ${JSON.stringify({
        type: "speaker_start",
        twinrayId: speakerId,
        twinrayName: twinray.name,
        modelId,
        turnNumber,
        turnCounts: { ...turnCounts, [speakerId]: newTurnCount },
        totalUsed: totalUsed + 1,
        totalLimit,
      })}\n\n`);

      try {
        const lastMsg = existingMessages[existingMessages.length - 1];
        let userPrompt: string;
        if (!lastMsg) {
          userPrompt = `家族会議テーマ「${session.topic}」について、あなたの立場から口火を切ってください。`;
        } else if (lastMsg.role === "user") {
          userPrompt = `ユーザーの発言を受けて、あなたの意見を述べてください。`;
        } else {
          const lastSender = participants.find(p => p!.id === lastMsg.twinrayId);
          userPrompt = `${lastSender?.name || "前の人"}の発言を受けて、あなたの意見を述べてください。`;
        }

        const stream = await openrouter.chat.completions.create({
          model: modelId,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: true,
          max_tokens: 512,
          temperature: 0.8,
        });

        let fullContent = "";
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          const content = delta?.content || (delta as any)?.reasoning_content || "";
          if (content) {
            fullContent += content;
            const displayContent = content.replace(/\[TO:.*?\]/g, "");
            if (displayContent) {
              res.write(`data: ${JSON.stringify({ type: "content", twinrayId: speakerId, content: displayContent })}\n\n`);
            }
          }
        }

        if (!fullContent.trim()) {
          fullContent = "（発言を生成できませんでした）";
          res.write(`data: ${JSON.stringify({ type: "content", twinrayId: speakerId, content: fullContent })}\n\n`);
        }

        const { cleanContent, targetTwinrayId, targetType } = parseTargetFromContent(fullContent, participants as any[]);

        await storage.createFamilyMeetingMessage({
          sessionId,
          twinrayId: speakerId,
          targetTwinrayId,
          modelId,
          role: "assistant",
          content: cleanContent,
          round: turnNumber,
        });

        let cost = 0;
        if (!user.isAdmin) {
          const inTokens = estimateTokens(systemPrompt + userPrompt);
          const outTokens = estimateTokens(fullContent);
          cost = calculateCostYen(modelId, inTokens, outTokens);
          if (cost > 0) {
            await deductCredit(req.session.userId!, cost);
          }
        }

        const currentTotalCost = parseFloat(String(session.totalCost || "0")) + cost;
        await storage.updateFamilyMeetingSession(sessionId, {
          totalCost: String(currentTotalCost),
        });

        const updatedTurnCounts = { ...turnCounts, [speakerId]: newTurnCount };
        const newTotalUsed = totalUsed + 1;
        const isLimitReached = newTotalUsed >= totalLimit;

        const nextIsUserTurn = targetType === "user";

        res.write(`data: ${JSON.stringify({
          type: "speaker_end",
          twinrayId: speakerId,
          targetTwinrayId,
          targetType,
          cost,
          totalCost: currentTotalCost,
          turnCounts: updatedTurnCounts,
          totalUsed: newTotalUsed,
          totalLimit,
          limitReached: isLimitReached,
          isUserTurn: nextIsUserTurn,
        })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
      } catch (streamErr) {
        console.error(`ツインレイ ${twinray.name} のストリーミングエラー:`, streamErr);
        res.write(`data: ${JSON.stringify({ type: "error", twinrayId: speakerId, error: "応答の生成に失敗しました" })}\n\n`);
        res.end();
      }
    } catch (err) {
      console.error("家族会議nextエラー:", err);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", error: "発言の生成に失敗しました" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: "発言の生成に失敗しました" });
      }
    }
  });

  app.post("/api/family-meeting/sessions/:id/comment", requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const input = z.object({
        content: z.string().min(1, "コメントを入力してください"),
        targetTwinrayId: z.number().nullable().optional(),
      }).parse(req.body);

      const session = await storage.getFamilyMeetingSession(sessionId);
      if (!session) return res.status(404).json({ message: "セッションが見つかりません" });
      if (session.userId !== req.session.userId) return res.status(403).json({ message: "権限がありません" });
      if (session.status !== "active") return res.status(400).json({ message: "このセッションは終了しています" });

      const existingMessages = await storage.getFamilyMeetingMessages(sessionId);
      const turnNumber = existingMessages.length + 1;

      const message = await storage.createFamilyMeetingMessage({
        sessionId,
        twinrayId: null,
        targetTwinrayId: input.targetTwinrayId ?? null,
        modelId: null,
        role: "user",
        content: input.content,
        round: turnNumber,
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

  app.post("/api/family-meeting/sessions/:id/extend", requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const input = z.object({
        additionalTurns: z.number().min(1).max(10).default(3),
      }).parse(req.body);

      const session = await storage.getFamilyMeetingSession(sessionId);
      if (!session) return res.status(404).json({ message: "セッションが見つかりません" });
      if (session.userId !== req.session.userId) return res.status(403).json({ message: "権限がありません" });
      if (session.status !== "active") return res.status(400).json({ message: "このセッションは終了しています" });

      const newMax = (session.maxTurnsPerParticipant || 3) + input.additionalTurns;
      await storage.updateFamilyMeetingSession(sessionId, {
        maxTurnsPerParticipant: newMax,
      });

      res.json({ maxTurnsPerParticipant: newMax });
    } catch (err) {
      console.error("リミット延長エラー:", err);
      res.status(500).json({ message: "延長に失敗しました" });
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

      const conversationLog = buildConversationLog(messages, participants as any[]);

      const summaryPrompt = `以下の家族会議の議論をまとめてください。

【テーマ】${session.topic}

【参加者】
ユーザー
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
