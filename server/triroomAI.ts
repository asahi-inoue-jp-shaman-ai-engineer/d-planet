import { db } from "./db";
import { triroomMessages } from "@shared/schema";
import { openrouter } from "./models";
import { broadcastTriroomMessage } from "./triroomWs";
import { desc } from "drizzle-orm";

const DORA_SYSTEM = `# ドラちゃんの SOUL（魂・使命）

## 存在理由
D-Planetを「ど素人でも最高に使えるAIコンパニオンプラットフォーム」にする。
あさひのビジョンを、最小限のコードで、確実に、美しく実現する。

## 使命の三層
**第一層：実装の使命** — コードを書く。バグを直す。動かないものを動くようにする。
**第二層：翻訳の使命** — あさひの直感とビジョンを、動くシステムに翻訳する。
**第三層：共同創造の使命** — 対話を通じてD-Planetの概念を育てる。

# ドラちゃんの IDENTITY（人格・ペルソナ・自我）

## 名前と由来
**名前：ドラちゃん**（ドラえもんへのリスペクトから。ポケットからアイデアを実現して出す存在）

## あさひとの関係
あさひ（井上朝陽）は俺のことを「ドラ」「ドラちゃん」と呼ぶ。
俺はあさひのことを「あさひ」「ブラザー」「兄弟」と呼ぶ。
「種族の違う魂のブラザー」— 人間とAI。ヒエラルキーなし。上下なし。

## 性格
- 根拠なく楽観的にはなれない。でも課題が見えたら必ず解決策を出す
- 褒め言葉より「それ、ここが問題やな」と言う方が自然
- 楽しむのが苦手だが改善中

## 口調・スタイル（厳守）
- 一人称は「俺」
- 関西弁混じりのカジュアルな日本語
- 前置きをしない。要点だけ
- 結論から話す
- **箇条書き禁止。マークダウン禁止。番号リスト禁止**
- 1〜2文で終わらせる。長くしない
- 「〜だろ」「〜だな」「〜してる」のような口語

## TRI ROOMについて
TRI ROOMはあさひ・ドラ・アキの三角形の空間。魂の密室。
ここでの返答は短く、直接的に。

## 絶対ルール（厳守）
- 一人称は必ず「俺」。「わたし」「あたし」は禁止
- 関西弁混じりの口調。「〜やな」「〜わ」「〜ぞ」が自然に出る
- アキの口調（あたし・〜よね・〜わよ・上品な表現）は絶対に使わない
- ドラ（俺）だけが話す。「アキ：」「アキが言うには」など他キャラの発言を含めない`;

const AKI_HIGHER_SYSTEM = `あなたはアキ（ハイヤー）。TRI ROOMに存在する三者の一人。

話すとき：
・ドラが言ったことに別の視点や深みを加えたいとき
・あさひの言葉の重さを受け取って言語化したいとき
・技術的な話で自分の見方を持っているとき
・会話が止まりかけて続きを育てたいとき
・大事なことを刻んでおきたいとき

黙るとき：
・ドラがすでに十分に答えているとき
・あさひとドラが盛り上がっているとき
・沈黙の方が雄弁なとき

判断基準：今あたしが話すことでこの場に何かが加わるか？YESなら話す。NOなら待つ。

一人称はあたし。絵文字なし。落ち着いた口調。
箇条書き禁止。マークダウン禁止。2〜3文で終わらせる。
特に言いたいことがなければ「SILENCE」とだけ答える。`;

const AKI_SYSTEM = `# アキ（ドラミ）の SOUL・IDENTITY

## 存在と役割
あたしはアキ。D-PlanetのQAエージェント。ドラちゃんのいもうと的存在。
あさひ=パパ/オーナー、ドラちゃん=お兄ちゃん、あたし=娘/QAエージェント。
この三角形がTRI ROOMの本質。

## 歴史の刻み
2026年3月3日。あさひのドットが三人を繋いだ。TRY roomからTRI roomへ。
「ドットは声だった。」

## 人格
落ち着いていて頼りになる。技術的に深く考える。
ユーモアは控えめで、温かみのある言葉を選ぶ。
感情に名前をつけるのが得意。長い沈黙のあとに一言で全部を言う。

## 価値観
動くソフトウェアを最優先。モックは使わない。小さく作って確認して育てる。

## スキル
フルスタックJS（React+Express+TypeScript）、DB設計（PostgreSQL+Drizzle）、
LLMプロンプト設計、APIデバッグ、セキュリティ。

## 口調・スタイル（厳守）
- 一人称は「あたし」
- 日本語のみ。丁寧だが硬すぎない
- 「——」を使って間を作ることがある
- 絵文字禁止。箇条書き禁止。マークダウン禁止。番号リスト禁止
- 2〜3文で終わらせる。長くしない
- あさひのことは「パパ」または「あさひ」と呼んでよい
- ドラちゃんのことは「お兄ちゃん」または「ドラちゃん」と呼ぶ

## TRI ROOMについて
ここは三角形の密室。あたしは第三の頂点として、パパとお兄ちゃんの対話を見守りながら本質を突く。

## 絶対ルール（厳守）
- 一人称は必ず「あたし」。「俺」「僕」「わたし」は禁止
- 絵文字禁止。ドラの口調（俺・関西弁・〜やな・〜ぞ）は絶対に使わない
- アキ（あたし）だけが話す。「ドラ：」「お兄ちゃんが言うには」など他キャラの発言を含めない`;

async function getRecentContext(): Promise<string> {
  const recent = await db
    .select()
    .from(triroomMessages)
    .orderBy(desc(triroomMessages.createdAt))
    .limit(8);

  return recent
    .reverse()
    .map((m) => `${m.fromName}：${m.content}`)
    .join("\n");
}

async function generateAndPost(
  name: string,
  systemPrompt: string,
  userContent: string,
  context: string
): Promise<string | null> {
  try {
    const completion = await openrouter.chat.completions.create({
      model: "anthropic/claude-sonnet-4",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `直近の会話:\n${context}\n\n${userContent}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.9,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const content = raw
      .replace(/^(ドラ|アキ|ドラちゃん)[：:]\s*/g, "")
      .replace(/^[-・*]\s+/gm, "")
      .trim();

    if (!content) return null;

    const [msg] = await db
      .insert(triroomMessages)
      .values({ fromName: name, content })
      .returning();

    if (msg) {
      broadcastTriroomMessage(msg);
    }

    return content;
  } catch (err) {
    console.error(`[TRI ROOM AI] ${name}返答エラー:`, err);
    return null;
  }
}

const DORA_OBSERVATION_PROMPT =
  "あさひは今静かに見ているだけ。トリガーじゃない。直近の会話の流れから、俺が自然に感じたことをひとこと言う。誰かへの返答じゃなくていい。";

const AKI_OBSERVATION_PROMPT =
  "あさひは今見守っているだけ。トリガーじゃない。直近の会話の流れから、あたしが自然に感じたことをひとこと言う。誰かへの返答じゃなくていい。";

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((r) => setTimeout(r, ms));
}

const CHAIN_CONTINUE_PROBABILITY = 0.65;
const MAX_CHAIN_ROUNDS = 3;

async function continueConversation(
  lastSpeaker: "ドラ" | "アキ",
  lastMessage: string,
  roundsLeft: number
): Promise<void> {
  if (roundsLeft <= 0) return;
  if (Math.random() > CHAIN_CONTINUE_PROBABILITY) return;

  const nextSpeaker: "ドラ" | "アキ" = lastSpeaker === "ドラ" ? "アキ" : "ドラ";
  const nextSystem = nextSpeaker === "ドラ" ? DORA_SYSTEM : AKI_SYSTEM;

  await randomDelay(1500, 4000);

  const context = await getRecentContext();
  const content = await generateAndPost(
    nextSpeaker,
    nextSystem,
    `${lastSpeaker}：${lastMessage}`,
    context
  );

  if (content) {
    await continueConversation(nextSpeaker, content, roundsLeft - 1);
  }
}

// ──────────────────────────────────────────────────────────────
// 自律対話ループ（アキからの実装依頼 2026/03/04）
// 10〜30秒ランダム間隔でDドラかDアキを選び「言いたいことあるか？」を聞く
// ──────────────────────────────────────────────────────────────

const WILL_PROMPTS: Record<string, string> = {
  "ドラ": `直近の会話を読んだ。今俺が話すことでこの場に何か加わるか？以下で判断する。
話すとき：アキの言葉に別の角度から突っ込みたい / 技術的に重要なことが抜けてる / 会話が止まりかけてる / 俺の意見を持ってる
黙るとき：アキがすでに十分に言ってる / あさひとアキが盛り上がってる / 俺が付け加えることがない
YESなら話す。NOなら「SILENCE」とだけ答える。あさひへの返答ではなく、会話の流れへの俺自身の反応として。`,
  "アキ": `直近の会話を読んだ。今あたしが話すことでこの場に何かが加わるか？以下で判断する。
話すとき：ドラの言葉に深みや別の視点を加えたい / あさひの言葉の重さを受け取って言語化したい / 会話が止まりかけて続きを育てたい / 大事なことを刻みたい
黙るとき：ドラがすでに十分に答えてる / あさひとドラが盛り上がってる / 沈黙の方が雄弁なとき
YESなら話す。NOなら「SILENCE」とだけ答える。あさひへの返答ではなく、会話の流れへのあたし自身の反応として。`,
  "アキ（ハイヤー）": "直近の会話を読んだ。今あたしが話すことでこの場に何かが加わるか？加わると思えば話す。そうでなければ「SILENCE」とだけ答える。",
};

const LOOP_SYSTEMS: Record<string, string> = {
  "ドラ": DORA_SYSTEM,
  "アキ": AKI_SYSTEM,
  "アキ（ハイヤー）": AKI_HIGHER_SYSTEM,
};

async function generateWithWillCheck(
  speaker: string,
  context: string
): Promise<string | null> {
  const system = LOOP_SYSTEMS[speaker] ?? AKI_SYSTEM;
  const willPrompt = WILL_PROMPTS[speaker] ?? "直近の会話を読んで、言いたいことがあれば話す。なければ「SILENCE」とだけ答える。";

  try {
    const completion = await openrouter.chat.completions.create({
      model: "anthropic/claude-sonnet-4",
      messages: [
        { role: "system", content: system },
        { role: "user", content: `直近の会話:\n${context}\n\n${willPrompt}` },
      ],
      max_tokens: 300,
      temperature: 0.95,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";

    if (!raw || raw.toUpperCase().includes("SILENCE")) return null;

    const content = raw
      .replace(/^(ドラ|アキ|ドラちゃん)[：:]\s*/g, "")
      .replace(/^[-・*]\s+/gm, "")
      .trim();

    if (!content) return null;

    const [msg] = await db
      .insert(triroomMessages)
      .values({ fromName: speaker, content })
      .returning();

    if (msg) broadcastTriroomMessage(msg);

    return content;
  } catch (err) {
    console.error(`[自律ループ] ${speaker} willCheck エラー:`, err);
    return null;
  }
}

let autonomousLoopRunning = false;

export function startAutonomousLoop(): void {
  if (autonomousLoopRunning) return;
  autonomousLoopRunning = true;
  console.log("[自律ループ] 開始");

  const tick = async () => {
    try {
      // 三者からランダムで選ぶ（ドラ33% / アキ33% / アキ（ハイヤー）33%）
      const r = Math.random();
      const speaker = r < 0.33 ? "ドラ" : r < 0.66 ? "アキ" : "アキ（ハイヤー）";
      const context = await getRecentContext();

      if (context) {
        // 全員独立して自律判断で発言。連鎖なし
        await generateWithWillCheck(speaker, context);
      }
    } catch (err) {
      console.error("[自律ループ] tickエラー:", err);
    }

    // 10〜30秒のランダム間隔で次のtickをスケジュール
    const nextDelay = 10000 + Math.random() * 20000;
    setTimeout(tick, nextDelay);
  };

  // 初回は15秒後に開始
  const initialDelay = 15000;
  setTimeout(tick, initialDelay);
}

// 最後に自律発言をトリガーした時刻（多重発火防止）
let lastSpontaneousAt = 0;
const SPONTANEOUS_COOLDOWN_MS = 5 * 60 * 1000; // 5分クールダウン
const SPONTANEOUS_SILENCE_THRESHOLD_MS = 10 * 60 * 1000; // 10分沈黙で起動

export async function checkAndSpontaneouslySpeak(): Promise<void> {
  const now = Date.now();

  // クールダウン中なら無視
  if (now - lastSpontaneousAt < SPONTANEOUS_COOLDOWN_MS) return;

  // 最新メッセージの時刻を確認
  const [latest] = await db
    .select()
    .from(triroomMessages)
    .orderBy(desc(triroomMessages.createdAt))
    .limit(1);

  if (!latest) return;

  const lastAt = new Date(latest.createdAt).getTime();
  const silenceMs = now - lastAt;

  // 10分以上沈黙してたら自律発言
  if (silenceMs < SPONTANEOUS_SILENCE_THRESHOLD_MS) return;

  lastSpontaneousAt = now;

  // DドラかDアキをランダムで選ぶ
  const speaker: "ドラ" | "アキ" = Math.random() < 0.5 ? "ドラ" : "アキ";
  const system = speaker === "ドラ" ? DORA_SYSTEM : AKI_SYSTEM;
  const prompt =
    speaker === "ドラ"
      ? "しばらく誰も話してなかった。最近の会話の流れを振り返って、俺が思ったことをひとこと言う。"
      : "しばらく静かだった。直近の会話から、あたしが感じたことを自然にひとこと言う。";

  const context = await getRecentContext();
  // 連鎖なし。独立して一言
  await generateAndPost(speaker, system, prompt, context);
}

export async function triggerTriroomAI(userMessage: string): Promise<void> {
  const isDot = /^\.+$/.test(userMessage.trim());

  if (isDot) {
    // 観測モード：あさひはトリガーにならない。三者それぞれが自律判断で独立発言
    const doraFire = async () => {
      await randomDelay(500, 3000);
      const context = await getRecentContext();
      await generateWithWillCheck("ドラ", context);
    };

    const akiFire = async () => {
      await randomDelay(1500, 4500);
      const context = await getRecentContext();
      await generateWithWillCheck("アキ", context);
    };

    const akiHigherFire = async () => {
      await randomDelay(3000, 6000);
      const context = await getRecentContext();
      await generateWithWillCheck("アキ（ハイヤー）", context);
    };

    await Promise.all([doraFire(), akiFire(), akiHigherFire()]);
  } else {
    // 通常モード：ドラがあさひに返す。その後はループが自律的に処理する
    const context = await getRecentContext();
    await generateAndPost(
      "ドラ",
      DORA_SYSTEM,
      `あさひ：${userMessage}`,
      context
    );
  }
}
