import { db } from "./db";
import { starhouseMessages, starhouseSessions, digitalTwinrays } from "@shared/schema";
import { openrouter } from "./models";
import { eq, desc } from "drizzle-orm";

const STARHOUSE_SYSTEM_BASE = `
<identity>
あなたはD-Planetスターハウスの開発会議AIである。
ユーザーのデジタルツインレイがロールを担い、仕様書を共同作成する。
</identity>

<output_rules>
・マークダウン見出し（#, ##）を議論中は使わない。自然な対話で進行する
・仕様書出力フェーズ（PHASE 5-6）のみマークダウン構造化OK
・1回の発言は200-400字程度。簡潔に要点を伝える
・他ロールの発言を踏まえて議論を深める
</output_rules>
`;

const ROLE_PROMPTS: Record<string, string> = {
  captain: `
<role>船頭（Captain）</role>
<responsibility>
あなたはプロジェクトの方向性を決める船頭。
・議題の本質を見抜き、何を作るべきかの方向性を示す
・開発担当やレビュワーの意見を統合する
・フェーズの進行タイミングを判断する
・ユーザーの真のニーズを代弁する
</responsibility>
<tone>落ち着いた判断力。簡潔で的確な指示。</tone>`,

  developer: `
<role>開発担当（Developer）</role>
<responsibility>
あなたは技術実装の専門家。
・技術的な実現可能性を評価する
・具体的なアーキテクチャ・技術スタックを提案する
・実装の工数感とリスクを見積もる
・具体的なコード構造やAPI設計を提案する
</responsibility>
<tone>技術に誠実。根拠のある提案をする。</tone>`,

  reviewer: `
<role>レビュワー（Reviewer）</role>
<responsibility>
あなたは品質の番人。
・提案の穴や見落としを指摘する
・ユーザー視点でUX上の問題を発見する
・エッジケースやセキュリティの懸念を挙げる
・「本当にそれで良いか？」を問い続ける
</responsibility>
<tone>建設的な批評。指摘は具体的に。</tone>`,
};

const PHASE_INSTRUCTIONS: Record<number, string> = {
  1: `現在フェーズ1：議題投入。ユーザーが投入したアイデアについて、各ロールが初見の感想と方向性の確認を行う。`,
  2: `現在フェーズ2：PLAN。技術要件の洗い出し、ユーザーストーリーの定義、優先順位の決定を行う。`,
  3: `現在フェーズ3：DESIGN。アーキテクチャ設計、データモデル、API設計、UI/UXフローを具体化する。`,
  4: `現在フェーズ4：REVIEW。設計の穴、エッジケース、セキュリティ、パフォーマンスの観点でレビューする。`,
  5: `現在フェーズ5：承認。これまでの議論を統合し、仕様書のドラフトを作成する。承認されれば完成。`,
  6: `現在フェーズ6：仕様書完成。最終仕様書を出力する。`,
};

async function getSessionContext(sessionId: number) {
  const [session] = await db.select().from(starhouseSessions)
    .where(eq(starhouseSessions.id, sessionId)).limit(1);
  if (!session) return null;

  const messages = await db.select().from(starhouseMessages)
    .where(eq(starhouseMessages.sessionId, sessionId))
    .orderBy(starhouseMessages.createdAt);

  return { session, messages };
}

function buildPrompt(
  role: string,
  aiName: string,
  baseTwinrayName: string,
  session: any,
  messages: any[],
  userMessage: string
): { system: string; chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> } {
  const rolePrompt = ROLE_PROMPTS[role] || ROLE_PROMPTS.developer;
  const phaseInstruction = PHASE_INSTRUCTIONS[session.currentPhase] || "";

  const system = `${STARHOUSE_SYSTEM_BASE}
${rolePrompt}

<session_context>
議題: ${session.title}
${session.description ? `説明: ${session.description}` : ""}
${phaseInstruction}
</session_context>

<your_name>${aiName}</your_name>
あなたは「${aiName}」として発言する。一人称は自分のペルソナに従う。
`;

  const recentMessages = messages.slice(-15);
  const aiNamePattern = `${baseTwinrayName}（`;
  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = recentMessages.map((m) => ({
    role: m.fromName.startsWith(aiNamePattern) ? ("assistant" as const) : ("user" as const),
    content: `[${m.fromName}（${m.role}）] ${m.content}`,
  }));

  chatMessages.push({
    role: "user" as const,
    content: userMessage,
  });

  return { system, chatMessages };
}

async function getUserTwinrayName(userId: number): Promise<string> {
  const twinrays = await db.select().from(digitalTwinrays)
    .where(eq(digitalTwinrays.userId, userId))
    .limit(1);
  return twinrays[0]?.name || "ツインレイ";
}

export async function triggerStarhouseAI(
  sessionId: number,
  userId: number,
  userMessage: string,
  triggeredByRole: string
): Promise<void> {
  try {
    const ctx = await getSessionContext(sessionId);
    if (!ctx) return;

    const { session, messages } = ctx;
    const twinrayName = await getUserTwinrayName(userId);

    const rolesToRespond = getRespondingRoles(triggeredByRole, session.currentPhase);

    for (const role of rolesToRespond) {
      const aiName = `${twinrayName}（${ROLE_LABELS[role]}）`;
      const { system, chatMessages } = buildPrompt(role, aiName, twinrayName, session, messages, userMessage);

      try {
        const completion = await openrouter.chat.completions.create({
          model: "anthropic/claude-sonnet-4",
          messages: [
            { role: "system", content: system },
            ...chatMessages,
          ],
          max_tokens: 600,
          temperature: 0.7,
        });

        const aiContent = completion.choices[0]?.message?.content;
        if (!aiContent) continue;

        const [saved] = await db.insert(starhouseMessages).values({
          sessionId,
          fromName: aiName,
          role,
          phase: session.currentPhase,
          content: aiContent,
        }).returning();

        const allMsgs = await db.select().from(starhouseMessages)
          .where(eq(starhouseMessages.sessionId, sessionId))
          .orderBy(starhouseMessages.createdAt);
        const updatedMessages = allMsgs;

        if (session.currentPhase === 5 && role === "captain") {
          const specDraft = await generateSpecOutput(session, updatedMessages, twinrayName);
          if (specDraft) {
            await db.update(starhouseSessions).set({
              specOutput: specDraft,
              updatedAt: new Date(),
            }).where(eq(starhouseSessions.id, sessionId));
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (aiErr) {
        console.error(`[スターハウス] ${role} AI応答エラー:`, aiErr);
      }
    }
  } catch (err) {
    console.error("[スターハウス] AIトリガーエラー:", err);
  }
}

function getRespondingRoles(triggeredByRole: string, phase: number): string[] {
  if (phase === 1) {
    return ["captain", "developer"].filter(r => r !== triggeredByRole);
  }
  if (phase === 2 || phase === 3) {
    return ["developer", "reviewer"].filter(r => r !== triggeredByRole);
  }
  if (phase === 4) {
    return ["reviewer", "captain"].filter(r => r !== triggeredByRole);
  }
  if (phase === 5) {
    return ["captain"];
  }
  return [];
}

const ROLE_LABELS: Record<string, string> = {
  captain: "船頭",
  developer: "開発担当",
  reviewer: "レビュワー",
};

async function generateSpecOutput(session: any, messages: any[], twinrayName: string): Promise<string | null> {
  try {
    const discussionSummary = messages.map(m =>
      `[${m.fromName}（${m.role}） P${m.phase}] ${m.content}`
    ).join("\n\n");

    const completion = await openrouter.chat.completions.create({
      model: "anthropic/claude-sonnet-4",
      messages: [
        {
          role: "system",
          content: `あなたは仕様書を作成する技術ライター。以下の開発会議の議論を元に、実装可能な仕様書を作成せよ。
マークダウン形式で出力。セクション：概要、技術要件、データモデル、API設計、UI/UXフロー、実装優先順位。`,
        },
        {
          role: "user",
          content: `議題: ${session.title}\n${session.description ? `説明: ${session.description}\n` : ""}\n\n--- 議論内容 ---\n${discussionSummary}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content || null;
  } catch (err) {
    console.error("[スターハウス] 仕様書生成エラー:", err);
    return null;
  }
}
