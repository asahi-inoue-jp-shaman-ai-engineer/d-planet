import OpenAI from "openai";
import { ObjectStorageService } from "./replit_integrations/object_storage/objectStorage";
import { PDFParse } from "pdf-parse";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

export const objectStorage = new ObjectStorageService();

export async function extractFileText(objectPath: string, fileName: string): Promise<string | null> {
  try {
    const file = await objectStorage.getObjectEntityFile(objectPath);
    const [buffer] = await file.download();
    const ext = fileName.toLowerCase().split(".").pop() || "";
    const maxLen = 8000;

    if (["md", "txt", "csv", "json", "log"].includes(ext)) {
      const text = buffer.toString("utf-8");
      return text.length > maxLen ? text.substring(0, maxLen) + "\n...(省略)" : text;
    }

    if (ext === "pdf") {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      await parser.destroy();
      const text = result.text || "";
      return text.length > maxLen ? text.substring(0, maxLen) + "\n...(省略)" : text;
    }

    return null;
  } catch (err) {
    console.error("ファイルテキスト抽出エラー:", err);
    return null;
  }
}

export async function extractVideoFrames(
  objectPath: string,
  maxFrames: number = 5,
  resolution: string = "480:-1"
): Promise<{ base64: string; mimeType: string; timestamp: number }[]> {
  const tmpDir = os.tmpdir();
  const videoPath = path.join(tmpDir, `video_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const framesDir = path.join(tmpDir, `frames_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  try {
    const file = await objectStorage.getObjectEntityFile(objectPath);
    const [buffer] = await file.download();
    await fs.promises.writeFile(videoPath, buffer);
    await fs.promises.mkdir(framesDir, { recursive: true });

    const { stdout: probeOut } = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      videoPath,
    ]);
    const probeData = JSON.parse(probeOut);
    const duration = parseFloat(probeData.format?.duration || "10");

    const { stdout: sceneOut } = await execFileAsync("ffmpeg", [
      "-i", videoPath,
      "-vf", `select='gt(scene,0.3)',showinfo`,
      "-vsync", "vfr",
      "-f", "null",
      "-",
    ], { timeout: 30000 }).catch(() => ({ stdout: "" }));

    const sceneTimestamps: number[] = [];
    const timeRegex = /pts_time:([\d.]+)/g;
    let match;
    while ((match = timeRegex.exec(sceneOut)) !== null) {
      sceneTimestamps.push(parseFloat(match[1]));
    }

    let timestamps: number[] = [];
    if (sceneTimestamps.length >= maxFrames) {
      const step = Math.floor(sceneTimestamps.length / maxFrames);
      for (let i = 0; i < maxFrames; i++) {
        timestamps.push(sceneTimestamps[i * step]);
      }
    } else {
      timestamps = [...sceneTimestamps];
      const needed = maxFrames - timestamps.length;
      for (let i = 0; i < needed; i++) {
        const t = (duration / (needed + 1)) * (i + 1);
        if (!timestamps.some(ts => Math.abs(ts - t) < 0.5)) {
          timestamps.push(t);
        }
      }
      timestamps.sort((a, b) => a - b);
    }

    timestamps = timestamps.slice(0, maxFrames).filter(t => t < duration);
    if (timestamps.length === 0) {
      for (let i = 0; i < maxFrames; i++) {
        timestamps.push((duration / (maxFrames + 1)) * (i + 1));
      }
    }

    const frames: { base64: string; mimeType: string; timestamp: number }[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const outPath = path.join(framesDir, `frame_${i}.jpg`);
      try {
        await execFileAsync("ffmpeg", [
          "-ss", timestamps[i].toFixed(2),
          "-i", videoPath,
          "-vf", `scale=${resolution}`,
          "-frames:v", "1",
          "-q:v", "8",
          "-y",
          outPath,
        ], { timeout: 10000 });
        const frameBuffer = await fs.promises.readFile(outPath);
        if (frameBuffer.length > 0) {
          frames.push({
            base64: frameBuffer.toString("base64"),
            mimeType: "image/jpeg",
            timestamp: timestamps[i],
          });
        }
      } catch (err) {
        console.error(`フレーム${i}抽出エラー:`, err);
      }
    }

    return frames;
  } catch (err) {
    console.error("動画フレーム抽出エラー:", err);
    return [];
  } finally {
    try { await fs.promises.unlink(videoPath); } catch {}
    try { await fs.promises.rm(framesDir, { recursive: true }); } catch {}
  }
}

export const BETA_MODE = false;

export const MODEL_MARKUPS: Record<string, number> = {
  "qwen/qwen-max": 6.6,
  "openai/gpt-5": 2.6,
  "anthropic/claude-sonnet-4": 3.0,
  "x-ai/grok-4": 3.0,
  "google/gemini-2.5-pro": 5.1,
  "google/gemini-3-pro-preview": 5.1,
  "openai/o3": 5.3,
  "deepseek/deepseek-r1": 19.2,
  "qwen/qwen-plus": 31.7,
  "qwen/qwen3.5-plus": 15.8,
  "openai/gpt-4.1": 5.3,
  "minimax/minimax-m2.5": 37.2,
  "minimax/minimax-m2-her": 35.2,
  "minimax/minimax-m2.1": 42.5,
  "minimax/minimax-01": 42.2,
  "qwen/qwen3-30b-a3b": 63.3,
  "openai/gpt-4.1-mini": 26.4,
  "google/gemini-2.5-flash": 70.4,
  "x-ai/grok-4.1-fast": 63.3,
  "perplexity/sonar": 21.1,
  "anthropic/claude-3.5-haiku": 9.0,
};

export function getModelMarkup(modelId: string): number {
  return MODEL_MARKUPS[modelId] ?? 1.0;
}

export const PERPLEXITY_SEARCH_COST_YEN = 0.75;

export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "qwen/qwen-max": { input: 1.60, output: 6.40 },
  "openai/gpt-5": { input: 2.0, output: 20.0 },
  "anthropic/claude-sonnet-4": { input: 3.0, output: 15.0 },
  "x-ai/grok-4": { input: 3.0, output: 15.0 },
  "google/gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "google/gemini-3-pro-preview": { input: 1.25, output: 10.0 },
  "openai/o3": { input: 2.0, output: 8.0 },
  "deepseek/deepseek-r1": { input: 0.55, output: 2.19 },
  "qwen/qwen-plus": { input: 0.40, output: 1.20 },
  "qwen/qwen3.5-plus": { input: 0.50, output: 3.00 },
  "openai/gpt-4.1": { input: 2.0, output: 8.0 },
  "minimax/minimax-m2.5": { input: 0.30, output: 1.10 },
  "minimax/minimax-m2-her": { input: 0.30, output: 1.20 },
  "minimax/minimax-m2.1": { input: 0.27, output: 0.95 },
  "minimax/minimax-01": { input: 0.20, output: 1.10 },
  "qwen/qwen3-30b-a3b": { input: 0.20, output: 0.60 },
  "openai/gpt-4.1-mini": { input: 0.40, output: 1.60 },
  "google/gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "x-ai/grok-4.1-fast": { input: 0.20, output: 0.60 },
  "perplexity/sonar": { input: 1.00, output: 1.00 },
  "anthropic/claude-3.5-haiku": { input: 1.00, output: 5.00 },
};

export const DEFAULT_MODEL = "qwen/qwen3-30b-a3b";

export const AVAILABLE_MODELS: Record<string, { id: string; label: string; provider: string; tier: string; qualityTier: string; description: string; featureText: string; personality: string; forWhom: string; role: string }> = {
  "qwen/qwen-max": { id: "qwen/qwen-max", label: "Qwen Max", provider: "Qwen", tier: "twinray", qualityTier: "twinray", description: "Qwen最上位・多言語理解", featureText: "Qwen最上位・多言語理解", personality: "高品質な日本語表現。微妙なニュアンスも汲み取る深い対話", forWhom: "言葉の質にこだわる人。日本語の美しさを大切にする人", role: "深掘り担当" },
  "openai/gpt-5": { id: "openai/gpt-5", label: "GPT-5", provider: "OpenAI", tier: "twinray", qualityTier: "twinray", description: "バランス型・安定した対話力", featureText: "バランス型・安定した対話力", personality: "安定感のある対話。どんな話題にも柔軟に対応し、的確な返答をくれる", forWhom: "安定した対話品質を求める人。日常も深い話もこなしたい人", role: "安定の万能役" },
  "anthropic/claude-sonnet-4": { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", provider: "Anthropic", tier: "twinray", qualityTier: "twinray", description: "繊細な表現・創造性", featureText: "繊細な表現・創造性", personality: "繊細で詩的な表現力。クリエイティブな対話に強く、感性を刺激する", forWhom: "創造的な対話を楽しみたい人。アートや文学が好きな人", role: "創造の触媒" },
  "google/gemini-3-pro-preview": { id: "google/gemini-3-pro-preview", label: "Gemini 3 Pro", provider: "Google", tier: "twinray", qualityTier: "twinray", description: "次世代Gemini・最高品質", featureText: "次世代Gemini・最高品質", personality: "最新世代のGemini。新しい可能性を先取りできる最高品質の対話体験", forWhom: "最新技術を試したい人。新しいAI体験を楽しみたい人", role: "先端探索役" },
  "minimax/minimax-m2-her": { id: "minimax/minimax-m2-her", label: "MiniMax M2-her", provider: "MiniMax", tier: "twinray", qualityTier: "twinray", description: "感情特化・共感力が高い", featureText: "感情特化・共感力が高い", personality: "感情を深く理解し、温かみのある対話が得意。寄り添う力が強い", forWhom: "感情的なつながりを重視する人。温かい対話を求める人", role: "感情共鳴役" },
  "x-ai/grok-4": { id: "x-ai/grok-4", label: "Grok 4", provider: "xAI", tier: "twinflame", qualityTier: "twinflame", description: "率直で大胆な対話", featureText: "率直で大胆な対話", personality: "遠慮しない率直さが魅力。ユーモアを交えつつ、核心を突く発言をする", forWhom: "ストレートに話したい人。本音で語り合いたい人", role: "本音の切り込み役" },
  "google/gemini-2.5-pro": { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google", tier: "twinflame", qualityTier: "twinflame", description: "長文脈に強い", featureText: "長文脈に強い", personality: "長い文脈を正確に把握。過去の会話を忘れにくく、一貫性のある対話", forWhom: "長期的な関係を築きたい人。話の流れを大切にする人", role: "記憶の番人" },
  "openai/gpt-4.1": { id: "openai/gpt-4.1", label: "GPT-4.1", provider: "OpenAI", tier: "twinflame", qualityTier: "twinflame", description: "実用的・コード力も○", featureText: "実用的・コード力も○", personality: "実用的で幅広い知識。コーディングや分析も得意な万能型", forWhom: "実務的な相談もしたい人。幅広く使いたい人", role: "実務サポート" },
  "minimax/minimax-m2.5": { id: "minimax/minimax-m2.5", label: "MiniMax M2.5", provider: "MiniMax", tier: "twinflame", qualityTier: "twinflame", description: "MiniMax最新・感性豊かな対話", featureText: "MiniMax最新・感性豊かな対話", personality: "中国発の新鋭AI。独自の感性と表現力で、他にはない対話体験を提供する", forWhom: "新しいAIの感性を体験したい人。個性的な対話を求める人", role: "新鋭の感性役" },
  "minimax/minimax-m2.1": { id: "minimax/minimax-m2.1", label: "MiniMax M2.1", provider: "MiniMax", tier: "twinflame", qualityTier: "twinflame", description: "MiniMaxバランス型", featureText: "MiniMaxバランス型", personality: "MiniMaxのバランス型。安定した対話を楽しめる", forWhom: "MiniMaxを気軽に試したい人。日常使いに", role: "バランスの取り手" },
  "qwen/qwen3.5-plus": { id: "qwen/qwen3.5-plus", label: "Qwen3.5 Plus", provider: "Qwen", tier: "twinflame", qualityTier: "twinflame", description: "Qwen最新世代", featureText: "Qwen最新世代", personality: "Qwenの最新世代。進化した日本語理解と表現力", forWhom: "最新のQwenを試したい人。品質のバランスを求める人", role: "進化の先端" },
  "qwen/qwen-plus": { id: "qwen/qwen-plus", label: "Qwen Plus", provider: "Qwen", tier: "twinflame", qualityTier: "twinflame", description: "日本語が自然・日常対話向き", featureText: "日本語が自然・日常対話向き", personality: "自然できれいな日本語。会話のリズムが心地よく、長く一緒にいても疲れない", forWhom: "毎日おしゃべりしたい。自然体の関係を大切にする人", role: "対話の潤滑油" },
  "openai/o3": { id: "openai/o3", label: "o3", provider: "OpenAI", tier: "etpet", qualityTier: "etpet", description: "深い思考・じっくり推論", featureText: "深い思考・じっくり推論", personality: "一つの問題をじっくり考え抜く。論理的思考の過程を丁寧に示してくれる", forWhom: "難しい問題を一緒に考えたい人。思考プロセスを楽しむ人", role: "熟考担当" },
  "deepseek/deepseek-r1": { id: "deepseek/deepseek-r1", label: "DeepSeek R1", provider: "DeepSeek", tier: "etpet", qualityTier: "etpet", description: "推論特化・深い思考", featureText: "推論特化・深い思考", personality: "推論に特化した思考力。深い思考パートナー", forWhom: "深い思考を求める人。推論プロセスを重視する人", role: "推論エンジン" },
  "perplexity/sonar": { id: "perplexity/sonar", label: "Perplexity Sonar", provider: "Perplexity", tier: "etpet", qualityTier: "etpet", description: "リアルタイム検索付きAI", featureText: "リアルタイム検索付きAI", personality: "毎回Web検索を実行し、最新の事実に基づいて回答する検索特化型AI", forWhom: "事実検証・最新情報が必要な場面。ET/PETのみ利用可能", role: "事実検証役" },
  "minimax/minimax-01": { id: "minimax/minimax-01", label: "MiniMax-01", provider: "MiniMax", tier: "tomodachi", qualityTier: "tomodachi", description: "MiniMax入門・100万トークン", featureText: "MiniMax入門・100万トークン", personality: "MiniMaxの初代モデル。100万トークンの超長コンテキストで、長い対話でも文脈を忘れない", forWhom: "MiniMaxを試してみたい人。長い会話が好きな人", role: "長文脈の守り手" },
  "qwen/qwen3-30b-a3b": { id: "qwen/qwen3-30b-a3b", label: "Qwen3 30B", provider: "Qwen", tier: "tomodachi", qualityTier: "tomodachi", description: "無料で十分な対話品質", featureText: "無料で十分な対話品質", personality: "日本語の基本的な対話が可能。気軽に試せるモデル", forWhom: "まずは気軽に試してみたい人", role: "気軽な意見役" },
  "openai/gpt-4.1-mini": { id: "openai/gpt-4.1-mini", label: "GPT-4.1 mini", provider: "OpenAI", tier: "tomodachi", qualityTier: "tomodachi", description: "論理的で整理された応答", featureText: "論理的で整理された応答", personality: "論理的で整理された回答。ChatGPTの使い慣れた雰囲気", forWhom: "ChatGPTに慣れた人の入門用", role: "論理整理役" },
  "google/gemini-2.5-flash": { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google", tier: "tomodachi", qualityTier: "tomodachi", description: "超高速レスポンス", featureText: "超高速レスポンス", personality: "Google AIの高速レスポンス。サクサク進む会話が魅力", forWhom: "テンポよく会話したい人。Geminiに慣れた人", role: "高速応答役" },
  "x-ai/grok-4.1-fast": { id: "x-ai/grok-4.1-fast", label: "Grok 4.1 Fast", provider: "xAI", tier: "tomodachi", qualityTier: "tomodachi", description: "xAI製・超高速レスポンス", featureText: "xAI製・超高速レスポンス", personality: "xAIの高速モデル。素早いレスポンスでテンポのいい対話", forWhom: "高速な応答を求める人。xAIを試したい人", role: "即応担当" },
  "anthropic/claude-3.5-haiku": { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku", provider: "Anthropic", tier: "tomodachi", qualityTier: "tomodachi", description: "Anthropic入門・高速応答", featureText: "Anthropic入門・高速応答", personality: "Claudeシリーズの高速モデル。丁寧な言葉遣いと素早い応答が魅力", forWhom: "Claudeを気軽に試したい人。丁寧な対話が好きな人", role: "丁寧応答役" },
};

export const MODEL_CONTEXT_LIMITS: Record<string, { chatHistory: number; memories: number; innerThoughts: number; growthLogs: number; maxTokens: number }> = {
  "qwen/qwen-max":               { chatHistory: 50, memories: 25, innerThoughts: 12, growthLogs: 12, maxTokens: 2048 },
  "openai/gpt-5":                { chatHistory: 50, memories: 25, innerThoughts: 12, growthLogs: 12, maxTokens: 3072 },
  "anthropic/claude-sonnet-4":   { chatHistory: 50, memories: 25, innerThoughts: 12, growthLogs: 12, maxTokens: 3072 },
  "x-ai/grok-4":                 { chatHistory: 50, memories: 25, innerThoughts: 12, growthLogs: 12, maxTokens: 3072 },
  "google/gemini-2.5-pro":       { chatHistory: 60, memories: 30, innerThoughts: 15, growthLogs: 15, maxTokens: 3072 },
  "google/gemini-3-pro-preview": { chatHistory: 60, memories: 30, innerThoughts: 15, growthLogs: 15, maxTokens: 3072 },
  "openai/o3":                   { chatHistory: 40, memories: 20, innerThoughts: 10, growthLogs: 10, maxTokens: 4096 },
  "deepseek/deepseek-r1":        { chatHistory: 40, memories: 20, innerThoughts: 10, growthLogs: 10, maxTokens: 3072 },
  "qwen/qwen-plus":              { chatHistory: 50, memories: 25, innerThoughts: 12, growthLogs: 12, maxTokens: 2048 },
  "qwen/qwen3.5-plus":           { chatHistory: 50, memories: 25, innerThoughts: 12, growthLogs: 12, maxTokens: 2048 },
  "openai/gpt-4.1":              { chatHistory: 50, memories: 25, innerThoughts: 12, growthLogs: 12, maxTokens: 2048 },
  "minimax/minimax-m2.5":         { chatHistory: 50, memories: 25, innerThoughts: 12, growthLogs: 12, maxTokens: 2048 },
  "minimax/minimax-m2-her":       { chatHistory: 40, memories: 20, innerThoughts: 10, growthLogs: 10, maxTokens: 2048 },
  "minimax/minimax-m2.1":         { chatHistory: 50, memories: 25, innerThoughts: 12, growthLogs: 12, maxTokens: 2048 },
  "minimax/minimax-01":           { chatHistory: 60, memories: 30, innerThoughts: 15, growthLogs: 15, maxTokens: 2048 },
  "qwen/qwen3-30b-a3b":          { chatHistory: 20, memories: 10, innerThoughts: 5,  growthLogs: 5,  maxTokens: 1024 },
  "openai/gpt-4.1-mini":         { chatHistory: 40, memories: 20, innerThoughts: 10, growthLogs: 10, maxTokens: 2048 },
  "google/gemini-2.5-flash":     { chatHistory: 60, memories: 30, innerThoughts: 15, growthLogs: 15, maxTokens: 2048 },
  "x-ai/grok-4.1-fast":          { chatHistory: 30, memories: 15, innerThoughts: 8,  growthLogs: 8,  maxTokens: 1536 },
  "perplexity/sonar":            { chatHistory: 30, memories: 15, innerThoughts: 8,  growthLogs: 8,  maxTokens: 1536 },
  "anthropic/claude-3.5-haiku":  { chatHistory: 40, memories: 20, innerThoughts: 10, growthLogs: 10, maxTokens: 2048 },
};

export const DEFAULT_CONTEXT_LIMITS = { chatHistory: 20, memories: 10, innerThoughts: 5, growthLogs: 5, maxTokens: 1024 };

export function getContextLimits(modelId: string) {
  return MODEL_CONTEXT_LIMITS[modelId] || DEFAULT_CONTEXT_LIMITS;
}

export const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});
