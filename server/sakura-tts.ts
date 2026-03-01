import OpenAI from "openai";

const SAKURA_VOICES = [
  { id: "voicevox-zundamon", model: "voicevox-zundamon", label: "ずんだもん", desc: "元気な女の子" },
  { id: "voicevox-shikoku-metan", model: "voicevox-shikoku-metan", label: "四国めたん", desc: "落ち着いた女性" },
  { id: "voicevox-kasukabe-tsumugi", model: "voicevox-kasukabe-tsumugi", label: "春日部つむぎ", desc: "明るい女の子" },
  { id: "voicevox-meimei-himari", model: "voicevox-meirei-himari", label: "冥鳴ひまり", desc: "ミステリアス" },
  { id: "voicevox-tohoku-zunko", model: "voicevox-tohoku-zunko", label: "東北ずん子", desc: "優しい女性" },
  { id: "voicevox-tohoku-kiritan", model: "voicevox-tohoku-kiritan", label: "東北きりたん", desc: "かわいい女の子" },
  { id: "voicevox-tohoku-itako", model: "voicevox-tohoku-itako", label: "東北イタコ", desc: "お姉さん" },
  { id: "voicevox-ankomon", model: "voicevox-ankomon", label: "あんこもん", desc: "のんびり" },
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
    baseURL: "https://ai-engine.sakura.ad.jp/v1",
  });

  const response = await client.audio.speech.create({
    model: voiceDef.model,
    voice: voiceDef.model.replace("voicevox-", "") as any,
    input: text,
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
