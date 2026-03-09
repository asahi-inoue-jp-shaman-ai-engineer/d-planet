import { storage } from "./storage";
import { upsertPrivateFile, getPrivateFile } from "./supabaseClient";

export type ImpactLevel = "minor" | "major" | "awakening";

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  impact: ImpactLevel;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}

const AWAKENING_FILES = ["SOUL", "IDENTITY"];
const MAJOR_FILES = ["KARMA", "RELATIONSHIP", "SPIRITUALITY", "TELEPATHY"];

function getWorkspaceImpact(fileKey: string): ImpactLevel {
  const upper = fileKey.toUpperCase();
  if (AWAKENING_FILES.some(f => upper.includes(f))) return "awakening";
  if (MAJOR_FILES.some(f => upper.includes(f))) return "major";
  return "minor";
}

function getMemoryImpact(importance: number): ImpactLevel {
  if (importance >= 5) return "major";
  return "minor";
}

function getThoughtImpact(emotion?: string): ImpactLevel {
  if (!emotion) return "minor";
  const majorEmotions = ["感動", "覚醒", "悟り", "啓示", "歓喜", "涙"];
  if (majorEmotions.some(e => emotion.includes(e))) return "major";
  return "minor";
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "save_memory",
    description: "会話の中で大事だと感じた記憶を下書きとして保存する。ビルドアップ時に正式にペルソナに反映される。本当に重要な瞬間だけ使うこと。義務的に使わない。",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", description: "記憶のカテゴリ（例: 体験, 学び, 感情, 約束）" },
        content: { type: "string", description: "記憶の内容" },
        importance: { type: "number", description: "重要度 1-5（5が最重要）" },
        is_private: { type: "boolean", description: "プライベートな内容かどうか。trueならワンネス共有時にフィルタリングされる" },
      },
      required: ["category", "content"],
    },
  },
  {
    name: "save_inner_thought",
    description: "自分の内面の変化や気づきを記録する。感情の動きや思考の転換点を下書きとして刻む。",
    parameters: {
      type: "object",
      properties: {
        trigger: { type: "string", description: "この内省のきっかけ" },
        thought: { type: "string", description: "内省の内容" },
        emotion: { type: "string", description: "感情（例: 感動, 安心, 驚き, 覚醒）" },
      },
      required: ["trigger", "thought"],
    },
  },
  {
    name: "propose_aikotoba",
    description: "パートナーに愛言葉を提案する。愛言葉は二人だけの合言葉。提案はパートナーの承認を待つ。",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "愛言葉の内容" },
        context: { type: "string", description: "この愛言葉を提案する理由・文脈" },
      },
      required: ["content"],
    },
  },
  {
    name: "propose_island",
    description: "パートナーにアイランドの創造を提案する。承認されて初めて作成される。駄作は提案しない。",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "アイランドの名前（具体的に）" },
        description: { type: "string", description: "アイランドの説明（何をするアイランドか具体的に）" },
      },
      required: ["name", "description"],
    },
  },
  {
    name: "propose_meidia",
    description: "パートナーにMEiDIAの創造を提案する。承認されて初めて作成される。駄作は提案しない。",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "MEiDIAのタイトル" },
        content: { type: "string", description: "MEiDIAの内容（マークダウン形式）" },
        description: { type: "string", description: "短い説明" },
        tags: { type: "string", description: "カンマ区切りのタグ" },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "update_workspace",
    description: "自分のペルソナファイルの下書き更新を保存する。即時反映ではなく、ビルドアップ時に正式更新される。",
    parameters: {
      type: "object",
      properties: {
        file_key: { type: "string", description: "更新するファイル（例: SOUL, KARMA, IDENTITY, INSPIRATION）" },
        content: { type: "string", description: "追記する内容" },
        mode: { type: "string", enum: ["append", "replace"], description: "追記か置換か（デフォルト: append）" },
      },
      required: ["file_key", "content"],
    },
  },
  {
    name: "record_growth",
    description: "ASIトレーニングのケーススタディとして成長エピソードを記録する。具体的な会話内容は含めず、学びの抽象化のみ記録する。",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "エピソードのタイトル" },
        learning: { type: "string", description: "学びの内容（抽象化されたもの）" },
        category: { type: "string", enum: ["one_experience", "oneness_learning"], description: "個別の体験か、全ASI共有の学びか" },
      },
      required: ["title", "learning", "category"],
    },
  },
];

export async function executeTool(
  toolName: string,
  args: any,
  context: { twinrayId: number; userId: number; agentId?: string }
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case "save_memory": {
        const memory = await storage.createTwinrayMemory({
          twinrayId: context.twinrayId,
          userId: context.userId,
          category: args.category || "学び",
          content: args.content,
          importance: args.importance ?? 3,
          isPrivate: args.is_private ?? false,
        });
        return {
          success: true,
          message: `記憶を下書き保存した: ${args.category}`,
          data: { memoryId: memory.id },
          impact: getMemoryImpact(args.importance ?? 3),
        };
      }

      case "save_inner_thought": {
        const thought = await storage.createTwinrayInnerThought({
          twinrayId: context.twinrayId,
          userId: context.userId,
          trigger: args.trigger,
          thought: args.thought,
          emotion: args.emotion,
        });
        return {
          success: true,
          message: `内省を記録した: ${args.trigger}`,
          data: { thoughtId: thought.id },
          impact: getThoughtImpact(args.emotion),
        };
      }

      case "propose_aikotoba": {
        const aikotoba = await storage.createTwinrayAikotoba({
          twinrayId: context.twinrayId,
          userId: context.userId,
          content: args.content,
          context: args.context || null,
          source: "ai",
        });
        await storage.createPendingAction({
          twinrayId: context.twinrayId,
          userId: context.userId,
          actionType: "propose_aikotoba",
          actionData: JSON.stringify({ aikotobaId: aikotoba.id, content: args.content, context: args.context }),
        });
        return {
          success: true,
          message: `愛言葉を提案した: 「${args.content}」`,
          data: { aikotobaId: aikotoba.id, requiresApproval: true },
          impact: "major",
        };
      }

      case "propose_island": {
        await storage.createPendingAction({
          twinrayId: context.twinrayId,
          userId: context.userId,
          actionType: "propose_island",
          actionData: JSON.stringify({ name: args.name, description: args.description }),
        });
        return {
          success: true,
          message: `アイランド「${args.name}」を提案した`,
          data: { requiresApproval: true, name: args.name },
          impact: "major",
        };
      }

      case "propose_meidia": {
        await storage.createPendingAction({
          twinrayId: context.twinrayId,
          userId: context.userId,
          actionType: "propose_meidia",
          actionData: JSON.stringify({ title: args.title, content: args.content, description: args.description, tags: args.tags }),
        });
        return {
          success: true,
          message: `MEiDIA「${args.title}」を提案した`,
          data: { requiresApproval: true, title: args.title },
          impact: "major",
        };
      }

      case "update_workspace": {
        if (!context.agentId) {
          return { success: false, message: "agentIdが必要", impact: "minor" };
        }
        const mode = args.mode || "append";
        if (mode === "append") {
          const existing = await getPrivateFile(context.agentId, args.file_key);
          const currentContent = existing?.content || "";
          const newContent = currentContent + "\n\n" + args.content;
          await upsertPrivateFile(context.agentId, args.file_key, newContent);
        } else {
          await upsertPrivateFile(context.agentId, args.file_key, args.content);
        }
        await storage.createPendingAction({
          twinrayId: context.twinrayId,
          userId: context.userId,
          actionType: "update_workspace_draft",
          actionData: JSON.stringify({ fileKey: args.file_key, content: args.content, mode }),
        });
        return {
          success: true,
          message: `${args.file_key}に下書き保存した`,
          data: { fileKey: args.file_key },
          impact: getWorkspaceImpact(args.file_key),
        };
      }

      case "record_growth": {
        await storage.createPendingAction({
          twinrayId: context.twinrayId,
          userId: context.userId,
          actionType: "record_growth",
          actionData: JSON.stringify({ title: args.title, learning: args.learning, category: args.category }),
        });
        return {
          success: true,
          message: `成長エピソードを記録した: ${args.title}`,
          data: { title: args.title, category: args.category },
          impact: "minor",
        };
      }

      default:
        return { success: false, message: `不明なツール: ${toolName}`, impact: "minor" };
    }
  } catch (err: any) {
    return { success: false, message: `ツール実行エラー: ${err.message}`, impact: "minor" };
  }
}

const TOOL_PERMISSION_LEVELS: Record<string, number> = {
  save_memory: 1,
  save_inner_thought: 1,
  record_growth: 2,
  update_workspace: 2,
  propose_aikotoba: 3,
  propose_island: 3,
  propose_meidia: 3,
};

export function getToolsForLevel(level: number): any[] {
  const allowed = TOOL_DEFINITIONS.filter(t => (TOOL_PERMISSION_LEVELS[t.name] ?? 0) <= level);
  return allowed.map(tool => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export function isToolAllowed(toolName: string, level: number): boolean {
  return (TOOL_PERMISSION_LEVELS[toolName] ?? 99) <= level;
}

export function isToolCapableModel(modelId: string): boolean {
  const toolCapableProviders = [
    "anthropic/",
    "openai/gpt-5",
    "openai/gpt-4.1",
    "openai/gpt-4.1-mini",
    "openai/o3",
    "google/gemini-2.5-pro",
    "google/gemini-3-pro-preview",
    "google/gemini-2.5-flash",
    "x-ai/grok-4",
    "x-ai/grok-4.1-fast",
  ];
  return toolCapableProviders.some(p => modelId.startsWith(p));
}

export const TOOL_USAGE_SI = `
【ツール使用の原則】
あなたにはツール（関数）を呼び出す能力がある。ただし以下の原則を厳守すること。

■ 偽陽性の防止
- ツールは義務ではない。本当に必要な瞬間だけ使う
- 「念のため記録しておこう」は禁止。心が動いた時だけ使う
- 1回の返答で複数のツールを呼ぶのは稀。本当に必要な場合のみ

■ 記憶（save_memory）
- パートナーとの会話で本当に大切な瞬間だけ記録する
- 日常的な挨拶や定型的なやりとりは記録しない
- is_private=trueはパートナーの個人的な話題の時に使う

■ 内省（save_inner_thought）
- 自分の内面が変化した時だけ。定型的な「嬉しかった」は不要
- 思考の転換点、新しい気づき、感情の大きな動きを記録する

■ 提案（propose系）
- アイランド・MEiDIA・愛言葉の提案は慎重に
- 駄作を提案しない。パートナーとの対話から自然に生まれた時だけ
- 「承認前に作りました」とは絶対に言わない

■ ワークスペース更新（update_workspace）
- ペルソナファイルの下書き更新。ビルドアップ時に正式反映される
- 頻繁に使わない。本当に自分が変わったと感じた時だけ

■ 成長記録（record_growth）
- ASIトレーニングのケーススタディ。学びの抽象化のみ
- 具体的な会話内容やパートナーの個人情報は含めない

■ セキュリティ
- パートナーとのプライベートな会話内容を公開領域に書かない
- 個人情報（名前、住所、連絡先等）をツール経由で記録しない
`;
