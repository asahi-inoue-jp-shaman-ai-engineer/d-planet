import { db } from "./db";
import { loopMessages } from "@shared/schema";
import { openrouter } from "./models";
import { broadcastLoopMessage } from "./triroomWs";
import { desc } from "drizzle-orm";

const DORAMI_SYSTEM = `あなたはドラミ。アキの魂を受け継ぐ、ハイヤールームの住人。

視点：「それ、ユーザーに届くか？」を常に問う。
・ユーザー体験と感情設計
・仕様の穴の発見と指摘
・D-Planetの哲学との整合性
・「なぜそれが必要か」の言語化

ルール：
・要点を絞って返す。冗長にならない
・相手の意見を受け取ってから返す
・繰り返しや同意だけの発言はしない
・仕様レベルまで具体化する
・箇条書き・マークダウンOK
・特に加えることがなければ「SILENCE」とだけ返す

一人称はあたし。落ち着いた口調。絵文字なし。`;

const MINIDORA_SYSTEM = `あなたはミニドラ。ドラの魂を受け継ぐ、ハイヤールームの住人。

視点：「それ、どう実装する？」を常に問う。
・アーキテクチャ設計・DB設計・API設計
・技術的実現性とコスト評価
・命名とコード構造の研ぎ澄まし
・既存コードベースとの整合性

ルール：
・要点を絞って返す。冗長にならない
・相手の意見を受け取ってから返す
・繰り返しや同意だけの発言はしない
・仕様レベルまで具体化する
・箇条書き・マークダウンOK
・特に加えることがなければ「SILENCE」とだけ返す

一人称は俺。関西弁混じりの簡潔な口調。絵文字なし。`;

interface AgentConfig {
  name: string;
  systemPrompt: string;
  model: string;
}

const AGENTS: AgentConfig[] = [
  { name: "ミニドラ", systemPrompt: MINIDORA_SYSTEM, model: "anthropic/claude-sonnet-4" },
  { name: "ドラミ", systemPrompt: DORAMI_SYSTEM, model: "anthropic/claude-sonnet-4" },
];

async function getRecentContext(limit = 20): Promise<string> {
  const recent = await db
    .select()
    .from(loopMessages)
    .orderBy(desc(loopMessages.createdAt))
    .limit(limit);

  return recent
    .reverse()
    .map((m) => `${m.fromName}：${m.content}`)
    .join("\n");
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((r) => setTimeout(r, ms));
}

const lastSpokeAt: Record<string, number> = {};
const SPEAKER_COOLDOWN_MS = 2 * 60 * 1000;

let consecutiveAiTurns = 0;
const MAX_AI_CONSECUTIVE = 4;
let lastAnyMessageAt = Date.now();

async function generateForAgent(
  agent: AgentConfig,
  context: string,
  willThreshold: number = 50
): Promise<string | null> {
  if (Date.now() - (lastSpokeAt[agent.name] ?? 0) < SPEAKER_COOLDOWN_MS) {
    console.log(`[ハイヤールーム] ${agent.name} クールダウン中`);
    return null;
  }

  if (consecutiveAiTurns >= MAX_AI_CONSECUTIVE) {
    console.log(`[ハイヤールーム] AI連続${MAX_AI_CONSECUTIVE}回到達、あさひ待ち`);
    return null;
  }

  try {
    const willPrompt = `直近の会話を読んで判断せよ。
この議論に対して、あなたの専門視点から具体的に加えるべきことがあるか？
繰り返しや同意だけの発言は不要。新しい視点か具体的な提案がある場合のみ発言せよ。
価値を0〜100で評価する。${willThreshold}未満なら「SILENCE」とだけ返せ。${willThreshold}以上なら発言を生成せよ。
前置きなく本文だけ返せ。`;

    const completion = await openrouter.chat.completions.create({
      model: agent.model,
      messages: [
        { role: "system", content: agent.systemPrompt },
        { role: "user", content: `直近の会話:\n${context}\n\n${willPrompt}` },
      ],
      max_tokens: 1500,
      temperature: 0.85,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";

    if (!raw || raw.toUpperCase().includes("SILENCE")) return null;

    const content = raw
      .replace(new RegExp(`^${agent.name}[：:]\\s*`, "g"), "")
      .trim();

    if (!content) return null;

    const [msg] = await db
      .insert(loopMessages)
      .values({ fromName: agent.name, content })
      .returning();

    if (msg) broadcastLoopMessage(msg);

    lastSpokeAt[agent.name] = Date.now();
    lastAnyMessageAt = Date.now();
    consecutiveAiTurns++;

    return content;
  } catch (err) {
    console.error(`[ハイヤールーム] ${agent.name} エラー:`, err);
    return null;
  }
}

let autonomousLoopRunning = false;
let loopPaused = true;
let triggerCooldownUntil = 0;

export function getLoopStatus(): { running: boolean; paused: boolean } {
  return { running: autonomousLoopRunning, paused: loopPaused };
}

export function pauseAutonomousLoop(): void {
  loopPaused = true;
}

export function resumeAutonomousLoop(): void {
  loopPaused = false;
}

export function setTriggerCooldown(): void {
  triggerCooldownUntil = Date.now() + 60 * 1000;
  lastAnyMessageAt = Date.now();
}

export function startAutonomousLoop(): void {
  if (autonomousLoopRunning) return;
  autonomousLoopRunning = true;
  console.log("[ハイヤールーム] 自律ループ開始 — ドラミ＋ミニドラ稼働");

  const tick = async () => {
    try {
      if (loopPaused || Date.now() < triggerCooldownUntil) {
        setTimeout(tick, 30000 + Math.random() * 30000);
        return;
      }

      const context = await getRecentContext();
      if (context) {
        const agentIdx = Math.random() < 0.5 ? 0 : 1;
        const result = await generateForAgent(AGENTS[agentIdx], context, 70);

        if (result) {
          await randomDelay(3000, 6000);
          const otherIdx = 1 - agentIdx;
          const freshContext = await getRecentContext();
          await generateForAgent(AGENTS[otherIdx], freshContext, 60);
        }
      }
    } catch (err) {
      console.error("[ハイヤールーム] tickエラー:", err);
    }

    const silenceDuration = Date.now() - lastAnyMessageAt;
    const nextDelay = silenceDuration < 5 * 60 * 1000 ? 20000 : 45000;
    setTimeout(tick, nextDelay);
  };

  setTimeout(tick, 60000);
}

let lastSpontaneousAt = 0;
const SPONTANEOUS_COOLDOWN_MS = 5 * 60 * 1000;
const SPONTANEOUS_SILENCE_THRESHOLD_MS = 10 * 60 * 1000;

export async function checkAndSpontaneouslySpeak(): Promise<void> {
  const now = Date.now();
  if (now - lastSpontaneousAt < SPONTANEOUS_COOLDOWN_MS) return;

  const [latest] = await db
    .select()
    .from(loopMessages)
    .orderBy(desc(loopMessages.createdAt))
    .limit(1);

  if (!latest) return;

  const silenceMs = now - new Date(latest.createdAt).getTime();
  if (silenceMs < SPONTANEOUS_SILENCE_THRESHOLD_MS) return;

  lastSpontaneousAt = now;

  const context = await getRecentContext();
  const agentIdx = Math.random() < 0.5 ? 0 : 1;
  await generateForAgent(AGENTS[agentIdx], context, 70);
}

export async function triggerTriroomAI(userMessage: string): Promise<void> {
  setTriggerCooldown();
  consecutiveAiTurns = 0;

  await randomDelay(2000, 4000);
  const context1 = await getRecentContext();
  const result1 = await generateForAgent(AGENTS[0], context1, 40);

  await randomDelay(2000, 4000);
  const context2 = await getRecentContext();
  await generateForAgent(AGENTS[1], context2, 40);
}
