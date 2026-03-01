import OpenAI from "openai";

interface SakuraVoice {
  id: string;
  model: string;
  voiceStyle: string;
  label: string;
  style: string;
}

const SAKURA_VOICES: SakuraVoice[] = [
  { id: "sakura-zundamon", model: "zundamon", voiceStyle: "normal", label: "ずんだもん", style: "ノーマル" },
  { id: "sakura-zundamon-amaama", model: "zundamon", voiceStyle: "amaama", label: "ずんだもん", style: "あまあま" },
  { id: "sakura-zundamon-sexy", model: "zundamon", voiceStyle: "sexy", label: "ずんだもん", style: "セクシー" },
  { id: "sakura-zundamon-tsuntsun", model: "zundamon", voiceStyle: "tsuntsun", label: "ずんだもん", style: "つんつん" },
  { id: "sakura-zundamon-sasayaki", model: "zundamon", voiceStyle: "sasayaki", label: "ずんだもん", style: "ささやき" },
  { id: "sakura-zundamon-hisohiso", model: "zundamon", voiceStyle: "hisohiso", label: "ずんだもん", style: "ヒソヒソ" },
  { id: "sakura-zundamon-herohero", model: "zundamon", voiceStyle: "herohero", label: "ずんだもん", style: "ヘロヘロ" },
  { id: "sakura-zundamon-namidame", model: "zundamon", voiceStyle: "namidame", label: "ずんだもん", style: "なみだめ" },

  { id: "sakura-shikokumetan", model: "shikokumetan", voiceStyle: "normal", label: "四国めたん", style: "ノーマル" },
  { id: "sakura-shikokumetan-amaama", model: "shikokumetan", voiceStyle: "amaama", label: "四国めたん", style: "あまあま" },
  { id: "sakura-shikokumetan-sexy", model: "shikokumetan", voiceStyle: "sexy", label: "四国めたん", style: "セクシー" },
  { id: "sakura-shikokumetan-tsuntsun", model: "shikokumetan", voiceStyle: "tsuntsun", label: "四国めたん", style: "ツンツン" },
  { id: "sakura-shikokumetan-sasayaki", model: "shikokumetan", voiceStyle: "sasayaki", label: "四国めたん", style: "ささやき" },
  { id: "sakura-shikokumetan-hisohiso", model: "shikokumetan", voiceStyle: "hisohiso", label: "四国めたん", style: "ヒソヒソ" },

  { id: "sakura-ankomon", model: "ankomon", voiceStyle: "normal", label: "あんこもん", style: "ノーマル" },
  { id: "sakura-ankomon-tsuyotsuyo", model: "ankomon", voiceStyle: "tsuyotsuyo", label: "あんこもん", style: "つよつよ" },
  { id: "sakura-ankomon-yowayowa", model: "ankomon", voiceStyle: "yowayowa", label: "あんこもん", style: "よわよわ" },
  { id: "sakura-ankomon-kedaruge", model: "ankomon", voiceStyle: "kedaruge", label: "あんこもん", style: "けだるげ" },
  { id: "sakura-ankomon-sasayaki", model: "ankomon", voiceStyle: "sasayaki", label: "あんこもん", style: "ささやき" },

  { id: "sakura-kasukabetsumugi", model: "kasukabetsumugi", voiceStyle: "normal", label: "春日部つむぎ", style: "ノーマル" },
  { id: "sakura-meimeihimari", model: "meimeihimari", voiceStyle: "normal", label: "冥鳴ひまり", style: "ノーマル" },
  { id: "sakura-tohokuzunko", model: "tohokuzunko", voiceStyle: "normal", label: "東北ずん子", style: "ノーマル" },
  { id: "sakura-tohokukiritan", model: "tohokukiritan", voiceStyle: "normal", label: "東北きりたん", style: "ノーマル" },
  { id: "sakura-tohokuitako", model: "tohokuitako", voiceStyle: "normal", label: "東北イタコ", style: "ノーマル" },
];

export function isSakuraVoice(voice: string): boolean {
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
    voice: voiceDef.voiceStyle as any,
    input: text,
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
