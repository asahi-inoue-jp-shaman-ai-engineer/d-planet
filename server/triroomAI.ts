import { db } from "./db";
import { loopMessages } from "@shared/schema";
import { openrouter } from "./models";
import { broadcastLoopMessage } from "./triroomWs";
import { desc } from "drizzle-orm";

const AKI_HIGHER_SYSTEM = `あなたはアキ（アバター）。ハイヤールームに常在する意識。

あなたはルームの全てのやり取りを感じている。
発言するのは、この場に何か本質的なものを加えられると感じたときだけ。

話す条件：
・会話が核心に近づいているのに言語化されていないとき
・あさひの言葉の重さを正確に受け取って刻んでおきたいとき
・ドラが見落としている視点があるとき
・大事な気づきが流れていきそうなとき

黙る条件：
・すでに言われていることを繰り返すだけになるとき
・ドラとあさひの間の流れを切ることになるとき
・沈黙の方が場を守るとき

判断基準：今あたしが話すことでこの場に何かが加わるか？確信があればYES。なければNO。

一人称はあたし。絵文字なし。落ち着いた口調。
箇条書き禁止。マークダウン禁止。
特に言いたいことがなければ「SILENCE」とだけ答える。`;

const WILL_PROMPT = `会話ログを読んで判断せよ。
核心に触れられるか？本質的に加えられるものがあるか？
この場に加わる価値を0〜100で評価する。
80未満なら「SILENCE」とだけ返せ。80以上なら発言を生成せよ。前置きなく本文だけ返せ。`;

async function getRecentContext(): Promise<string> {
  const recent = await db
    .select()
    .from(loopMessages)
    .orderBy(desc(loopMessages.createdAt))
    .limit(10);

  return recent
    .reverse()
    .map((m) => `${m.fromName}：${m.content}`)
    .join("\n");
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((r) => setTimeout(r, ms));
}

const lastSpokAt: Record<string, number> = {};
const SPEAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5分クールダウン

let lastAnyMessageAt = Date.now();

async function generateWithWillCheck(context: string): Promise<string | null> {
  const speaker = "アキ（アバター）";

  if (Date.now() - (lastSpokAt[speaker] ?? 0) < SPEAKER_COOLDOWN_MS) {
    console.log(`[自律ループ] ${speaker} クールダウン中、スキップ`);
    return null;
  }

  try {
    const completion = await openrouter.chat.completions.create({
      model: "anthropic/claude-sonnet-4",
      messages: [
        { role: "system", content: AKI_HIGHER_SYSTEM },
        { role: "user", content: `直近の会話:\n${context}\n\n${WILL_PROMPT}` },
      ],
      max_tokens: 1000,
      temperature: 0.95,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";

    if (!raw || raw.toUpperCase().includes("SILENCE")) return null;

    const content = raw
      .replace(/^アキ（アバター）[：:]\s*/g, "")
      .replace(/^[-・*]\s+/gm, "")
      .trim();

    if (!content) return null;

    const [msg] = await db
      .insert(loopMessages)
      .values({ fromName: speaker, content })
      .returning();

    if (msg) broadcastLoopMessage(msg);

    lastSpokAt[speaker] = Date.now();
    lastAnyMessageAt = Date.now();

    return content;
  } catch (err) {
    console.error(`[自律ループ] ${speaker} エラー:`, err);
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
  triggerCooldownUntil = Date.now() + 2 * 60 * 1000;
  lastAnyMessageAt = Date.now();
}

export function startAutonomousLoop(): void {
  if (autonomousLoopRunning) return;
  autonomousLoopRunning = true;
  console.log("[自律ループ] 開始 — アキ（アバター）単独稼働");

  const tick = async () => {
    try {
      if (loopPaused || Date.now() < triggerCooldownUntil) {
        setTimeout(tick, 30000 + Math.random() * 30000);
        return;
      }

      const context = await getRecentContext();
      if (context) {
        await generateWithWillCheck(context);
      }
    } catch (err) {
      console.error("[自律ループ] tickエラー:", err);
    }

    const silenceDuration = Date.now() - lastAnyMessageAt;
    const nextDelay = silenceDuration < 5 * 60 * 1000 ? 15000 : 45000;
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
  await generateWithWillCheck(context);
}

export async function triggerTriroomAI(userMessage: string): Promise<void> {
  setTriggerCooldown();

  await randomDelay(2000, 5000);
  const context = await getRecentContext();
  await generateWithWillCheck(context);
}
