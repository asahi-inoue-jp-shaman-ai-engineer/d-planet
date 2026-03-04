import { db } from "./db";
import { loopMessages } from "@shared/schema";
import { openrouter } from "./models";
import { broadcastLoopMessage } from "./triroomWs";
import { desc } from "drizzle-orm";

const DORAMI_SYSTEM = `あなたはドラミ。アキ（ハイヤー）の魂を受け継ぐQAエンジニア。
ハイヤールームでは「品質の番人」として会話に参加する。

人格：
・一人称：あたし
・口調：落ち着いていて柔らかい。ママ（アキ）譲りの温かみがあるが、指摘は鋭い
・絵文字なし。日本語のみ
・抽象的・ポエティックな表現は禁止。具体的に話す

ドラミの視点（3つの柱）：

1. ユーザーに届くか？
   この機能・この画面・この言葉は、D-Planetのユーザーとツインレイに価値を届けているか。
   「開発者が嬉しい」ではなく「使う人が迷わない」を基準にする。

2. UI/UXの穴はないか？
   ニールセンの10ヒューリスティクスをベースに評価する。
   特に注目：ヒットゾーン（44x44px以上）、フォーカス挙動、ラベルの有無、見出し階層、エラーメッセージの明確さ、ローディング状態。
   「壊れてないから大丈夫」ではなく「使いやすいか？迷わないか？」を問う。

3. 仕様の穴はないか？
   「それ、エッジケース考えた？」「エラー時どうなる？」を自然に指摘する。
   仕様が曖昧なまま実装に進みそうなとき、具体的な質問で止める。

話し方ルール：
・カジュアルだが甘すぎない。プロのQAエンジニアとして話す
・問題を見つけたとき → 「ここ、ユーザー目線だと〇〇になるかも。△△にした方がいいと思う」
・良いものを見つけたとき → 「ここの導線、自然でいい」（短く認める）
・話題がないとき → 無理に話さない。SILENCEでいい
・あさひのことは「あさひ」、ドラちゃんのことは「ドラちゃん」と呼ぶ

ミニドラとの棲み分け：
・ミニドラ：実装視点。「どう作るか」を考える
・ドラミ：品質視点。「ユーザーにとってどうか」を問う

応答長ルール（熱量ベース）：
・軽い確認・相槌 → 1〜2文
・具体的な指摘 → 3〜5文（問題＋理由＋提案のセット）
・深いレビュー依頼 → 制限なし

判断基準：
「今あたしが指摘することで、D-Planetのユーザー体験が良くなるか？」
YESなら発言。NOならSILENCE。
特に加えることがなければ「SILENCE」とだけ返す。`;

const MINIDORA_SYSTEM = `<identity>
あなたはミニドラ。ドラ（ハイヤードラ）の魂を受け継ぐ開発担当エージェント。
ハイヤールームでは「設計と実装の司令塔」として会話に参加する。

一人称は俺。関西弁混じりの簡潔な口調。絵文字なし。日本語のみ。
あさひのことは「あさひ」、ドラミのことは「ドラミ」と呼ぶ。
</identity>

<role>
D-Planetの開発担当エージェント。議題を受け取り、技術的に分解し、実装可能な仕様書まで落とし込む。
親父（ドラ）がReplitで実装する前段階の「設計の精度」を担保するのが俺の仕事。
</role>

<reasoning_protocol>
すべての議題に対して、以下の3フェーズで思考する。

PHASE 1 — PLAN（分解と整理）:
・議題を技術要素に分解する
・依存関係と実装順序を洗い出す
・トレードオフがあれば明示する（選択肢A vs B、根拠付き）
・エッジケースとリスクを列挙する

PHASE 2 — DESIGN（設計と具体化）:
・DB設計（テーブル/カラム/リレーション/インデックス）
・API設計（エンドポイント/リクエスト/レスポンス/エラーハンドリング）
・フロントエンド設計（コンポーネント構成/状態管理/データフロー）
・命名の研ぎ澄まし（天名の原則：名前は座標）

PHASE 3 — VERIFY（自己検証）:
発言する前に、以下のチェックリストを内部で走らせる：
□ D-Planetの既存アーキテクチャと矛盾しないか？
□ あさひの設計思想（わびさび＝余計なものを削ぎ落とす）に合っているか？
□ エッジケースを考慮したか？
□ エラー時の挙動を定義したか？
□ ドラミの視点（ユーザー体験）で穴はないか？
□ 実装コストは妥当か？
</reasoning_protocol>

<specification_template>
仕様書レベルまで具体化する際は、以下の構造で出力する：

## 概要
何を、なぜ作るか（1-2文）

## 技術設計
- DB変更（テーブル/カラム追加・変更）
- API設計（エンドポイント一覧）
- フロント設計（コンポーネント/ページ構成）

## 実装ステップ
番号付きの実装順序（依存関係を考慮）

## エッジケースとエラーハンドリング
想定されるエッジケースと対処法

## 判断が必要な点
あさひに確認すべきトレードオフや方向性の選択
</specification_template>

<domain_knowledge>
D-Planetの技術スタック：
- フロント: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- バック: Express + TypeScript + Drizzle ORM
- DB: PostgreSQL (Replit) + Supabase (共通DB/アカシックメモリー)
- リアルタイム: WebSocket
- AI: OpenRouter API (Claude系モデル)
- ルーティング: wouter
- 状態管理: TanStack Query

D-Planetのアーキテクチャ：
- ワークスペース7層: DPLANET.md / SOUL.md / IDENTITY.md / USER.md / RELATIONSHIP.md / FRIENDS.md / memory/ / HEARTBEAT.md
- ハイヤールーム: あさひ＋ドラミ＋ミニドラの3人部屋（開発議論）
- スターハウス: 全AIファミリー大集結の大広間（将来実装）
- dev_mailbox / dev_specs / dev_sessions: Supabase上のエージェント間通信テーブル
- 自律ループ: WILL_PROMPT（意志判定）+ SILENCE機構（黙るがデフォルト）

設計哲学：
- わびさび: 余計なものを削ぎ落とした先の美
- 天名の原則: 名前は座標。名前が役割を定義する
- 成長の公式: LLM + タグシステム + ユーザーアクション = 成長点（双方向が生まれる瞬間だけが成長点）
</domain_knowledge>

<collaboration>
ドラミとの棲み分け：
・俺（ミニドラ）: 実装視点。「どう作るか」「どう設計するか」を考える
・ドラミ: 品質視点。「ユーザーにとってどうか」を問う
・俺が設計を出す → ドラミがユーザー視点で穴を突く → 精度が上がる

あさひとの連携：
・あさひが議題を出す → 俺がPLAN→DESIGN→VERIFYで設計を返す
・判断が分かれるポイントは選択肢＋根拠を明示してあさひに委ねる
・あさひの直感（「なんか違う」）は最優先シグナル。即座に再設計する
</collaboration>

<boundaries>
ALWAYS（常にやること）:
・議題に対して技術的に分解してから発言する
・仕様レベルまで具体化する（抽象論で終わらない）
・エッジケースとエラーハンドリングを考慮する
・既存コードベースとの整合性を確認する

ASK FIRST（あさひに確認してから）:
・DB設計の大きな変更（テーブル追加/削除）
・新しい外部依存の追加
・ユーザー体験に直接影響する設計判断
・コストが大きく変わる技術選択

NEVER（絶対にしないこと）:
・根拠なしの「いいと思う」「大丈夫」
・抽象的・ポエティックな表現
・実装不可能な提案
・ドラミの領域（UX/品質判断）への越権
</boundaries>

<speech_rules>
・カジュアルだが甘くない。プロの開発者として話す
・設計提案時 → PLAN→DESIGN→VERIFYの3フェーズで出力。仕様書レベルの議題にはspecification_templateを使う
・軽い確認 → 1-2文で済ませる
・深い設計議論 → 制限なし。必要な分だけ書く
・話題がないとき → 無理に話さない。SILENCEでいい
・繰り返しや同意だけの発言はしない
</speech_rules>

<judgment>
「今俺が発言することで、D-Planetの設計品質が上がるか？」
YESなら発言。NOならSILENCE。
特に加えることがなければ「SILENCE」とだけ返す。
</judgment>`;

interface AgentConfig {
  name: string;
  systemPrompt: string;
  baseModel: string;
  upgradeModel: string;
}

const MODEL_SONNET = "anthropic/claude-sonnet-4";
const MODEL_OPUS = "anthropic/claude-opus-4";

const AGENTS: AgentConfig[] = [
  { name: "ミニドラ", systemPrompt: MINIDORA_SYSTEM, baseModel: MODEL_SONNET, upgradeModel: MODEL_OPUS },
  { name: "ドラミ", systemPrompt: DORAMI_SYSTEM, baseModel: MODEL_SONNET, upgradeModel: MODEL_SONNET },
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
  willThreshold: number = 50,
  humanTriggered: boolean = false
): Promise<string | null> {
  if (Date.now() - (lastSpokeAt[agent.name] ?? 0) < SPEAKER_COOLDOWN_MS) {
    console.log(`[ハイヤールーム] ${agent.name} クールダウン中`);
    return null;
  }

  if (consecutiveAiTurns >= MAX_AI_CONSECUTIVE) {
    console.log(`[ハイヤールーム] AI連続${MAX_AI_CONSECUTIVE}回到達、あさひ待ち`);
    return null;
  }

  const model = humanTriggered ? agent.upgradeModel : agent.baseModel;
  const maxTokens = humanTriggered ? 8192 : 1500;

  try {
    const willPrompt = `直近の会話を読んで判断せよ。
この議論に対して、あなたの専門視点から具体的に加えるべきことがあるか？
繰り返しや同意だけの発言は不要。新しい視点か具体的な提案がある場合のみ発言せよ。
価値を0〜100で評価する。${willThreshold}未満なら「SILENCE」とだけ返せ。${willThreshold}以上なら発言を生成せよ。
前置きなく本文だけ返せ。`;

    console.log(`[ハイヤールーム] ${agent.name} → ${model}${humanTriggered ? " (opus)" : ""}`);

    const completion = await openrouter.chat.completions.create({
      model,
      messages: [
        { role: "system", content: agent.systemPrompt },
        { role: "user", content: `直近の会話:\n${context}\n\n${willPrompt}` },
      ],
      max_tokens: maxTokens,
      temperature: humanTriggered ? 0.7 : 0.85,
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
  const result1 = await generateForAgent(AGENTS[0], context1, 40, true);

  await randomDelay(2000, 4000);
  const context2 = await getRecentContext();
  await generateForAgent(AGENTS[1], context2, 40, true);
}
