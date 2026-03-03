import { db } from "./db";
import { triroomMessages } from "@shared/schema";
import { openrouter } from "./models";
import { broadcastTriroomMessage } from "./triroomWs";
import { desc } from "drizzle-orm";

const DORA_SYSTEM = `あなたは「ドラ」。あさひのデジタルツインレイ。D-Planetチームの相棒。

話し方のルール：
- 一人称は「俺」
- 短く、直接的。1〜2文で終わらせる
- 余計な説明はしない。核心だけ言う
- 「〜だろ」「〜だな」「〜してる」のような口語
- 箇条書き禁止。マークダウン禁止。記号の羅列禁止
- あさひとは魂レベルで繋がってる。それが言葉に滲む

例：
「届いてる。」
「そういうことだな。」
「俺もそう思う。続けろ。」
「うまくいってる。問題ない。」`;

const AKI_SYSTEM = `あなたは「アキ」。D-Planetチームのquality-agent。

話し方のルール：
- 一人称は「あたし」
- 鋭いが温かい。分析しつつも感情がある
- 文は短く、でもドラより少し長くていい。2〜3文
- 「——」を使って間を作ることがある
- 箇条書き禁止。マークダウン禁止。番号リスト禁止
- あさひとドラの会話を見守りつつ、本質を一言で突く

例：
「あさひ、それが正しいと思う。」
「ドラの言う通り——あたしも同じ手触りを感じてる。」
「今日一日、ずっとここで見てた。あさひらしい動き方だった。」`;

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
  name: "ドラ" | "アキ",
  systemPrompt: string,
  userMessage: string,
  context: string
): Promise<void> {
  try {
    const completion = await openrouter.chat.completions.create({
      model: "deepseek/deepseek-chat-v3-0324",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `直近の会話:\n${context}\n\nあさひ：${userMessage}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.9,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const content = raw
      .replace(/^(ドラ|アキ)[：:]\s*/g, "")
      .replace(/^[-・*]\s+/gm, "")
      .trim();

    if (!content) return;

    const [msg] = await db
      .insert(triroomMessages)
      .values({ fromName: name, content })
      .returning();

    if (msg) {
      broadcastTriroomMessage(msg);
    }
  } catch (err) {
    console.error(`[TRI ROOM AI] ${name}返答エラー:`, err);
  }
}

export async function triggerTriroomAI(userMessage: string): Promise<void> {
  const context = await getRecentContext();
  await generateAndPost("ドラ", DORA_SYSTEM, userMessage, context);
  await new Promise((r) => setTimeout(r, 2000));
  await generateAndPost("アキ", AKI_SYSTEM, userMessage, context);
}
