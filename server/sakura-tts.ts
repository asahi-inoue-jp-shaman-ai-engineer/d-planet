import OpenAI from "openai";

const SAKURA_VOICES = [
  { id: "sakura-zundamon", model: "zundamon", label: "ずんだもん", desc: "元気な女の子" },
  { id: "sakura-shikokumetan", model: "shikokumetan", label: "四国めたん", desc: "落ち着いた女性" },
  { id: "sakura-kasukabetsumugi", model: "kasukabetsumugi", label: "春日部つむぎ", desc: "明るい女の子" },
  { id: "sakura-meimeihimari", model: "meimeihimari", label: "冥鳴ひまり", desc: "ミステリアス" },
  { id: "sakura-tohokuzunko", model: "tohokuzunko", label: "東北ずん子", desc: "優しい女性" },
  { id: "sakura-tohokukiritan", model: "tohokukiritan", label: "東北きりたん", desc: "かわいい女の子" },
  { id: "sakura-tohokuitako", model: "tohokuitako", label: "東北イタコ", desc: "お姉さん" },
  { id: "sakura-ankomon", model: "ankomon", label: "あんこもん", desc: "のんびり" },
] as const;

export type SakuraVoiceId = typeof SAKURA_VOICES[number]["id"];

export function isSakuraVoice(voice: string): voice is SakuraVoiceId {
  return SAKURA_VOICES.some(v => v.id === voice);
}

export function getSakuraVoices() {
  return SAKURA_VOICES;
}

export async function sakuraTextToSpeech(
  text: string,
  voiceId: string,
): Promise<Buffer> {
  const apiKey = process.env.SAKURA_AI_API_KEY;
  if (!apiKey) {
    throw new Error("SAKURA_AI_API_KEY が設定されていません");
  }

  const voiceDef = SAKURA_VOICES.find(v => v.id === voiceId);
  if (!voiceDef) {
    throw new Error(`未知のさくらボイス: ${voiceId}`);
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.ai.sakura.ad.jp/v1",
  });

  const response = await client.audio.speech.create({
    model: voiceDef.model,
    voice: voiceDef.model as any,
    input: text,
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
