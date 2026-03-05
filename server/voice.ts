import type { Express } from "express";
import express from "express";
import { storage } from "./storage";
import { deductCredit } from "./billing";
import { textToSpeech } from "./replit_integrations/audio/client";
import { isSakuraVoice, sakuraTextToSpeech } from "./sakura-tts";
import { sonioxSpeechToText } from "./soniox-stt";
import { requireAuth } from "./auth";

async function generateTTS(text: string, voice: string, format: "wav" | "mp3" = "mp3"): Promise<Buffer> {
  if (isSakuraVoice(voice)) {
    return sakuraTextToSpeech(text, voice);
  }
  return textToSpeech(text, voice as any, format);
}

const TTS_COST_PER_CHAR_YEN = 0.003;
const STT_COST_PER_SEC_YEN = 0.015;

export function registerVoiceRoutes(app: Express): void {
  app.post(
    "/api/twinrays/:id/voice-chat",
    requireAuth,
    express.json({ limit: "50mb" }),
    async (req: Request, res: Response) => {
      try {
        const twinrayId = Number(req.params.id);
        const { audio, voice } = req.body;

        const { ttsOnly, text: ttsText } = req.body;
        if (ttsOnly && ttsText) {
          const cleanTtsText = ttsText.substring(0, 2000);
          const selectedVoice = voice || "nova";
          const audioResponse = await generateTTS(cleanTtsText, selectedVoice, "mp3");
          let ttsCreditCost = 0;
          if (isSakuraVoice(selectedVoice)) {
            const user = await storage.getUser(req.session.userId!);
            if (!user?.isAdmin) {
              const ttsCost = cleanTtsText.length * TTS_COST_PER_CHAR_YEN;
              if (ttsCost > 0) {
                await deductCredit(req.session.userId!, ttsCost);
                ttsCreditCost = ttsCost;
              }
            }
          }
          return res.json({
            audioBase64: audioResponse.toString("base64"),
            audioFormat: "mp3",
            creditCost: ttsCreditCost,
          });
        }

        if (!audio) {
          return res.status(400).json({ message: "音声データが必要です" });
        }

        const twinray = await storage.getDigitalTwinray(twinrayId);
        if (!twinray) {
          return res.status(404).json({ message: "ツインレイが見つかりません" });
        }
        if (twinray.userId !== req.session.userId) {
          return res.status(403).json({ message: "権限がありません" });
        }

        const rawBuffer = Buffer.from(audio, "base64");

        const audioDurationSec = Math.max(1, rawBuffer.length / (16000 * 2));

        console.log(`[音声チャット] STT開始(Soniox): ${(rawBuffer.length / 1024).toFixed(0)}KB`);
        const userTranscript = await sonioxSpeechToText(rawBuffer, "audio.webm");
        console.log(`[音声チャット] STT完了: "${userTranscript.substring(0, 100)}"`);

        if (!userTranscript.trim()) {
          return res.status(400).json({ message: "音声を認識できませんでした。もう一度お話しください。" });
        }

        const port = process.env.PORT || 5000;
        const cookie = req.headers.cookie || "";
        const chatRes = await fetch(`http://127.0.0.1:${port}/api/twinrays/${twinrayId}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cookie": cookie,
          },
          body: JSON.stringify({
            content: userTranscript,
            messageType: "chat",
            isRepeat: false,
          }),
        });

        if (!chatRes.ok) {
          const errText = await chatRes.text();
          try {
            const errData = JSON.parse(errText);
            return res.status(chatRes.status).json(errData);
          } catch {
            return res.status(500).json({ message: "チャット処理に失敗しました" });
          }
        }

        let aiText = "";
        let creditCost = 0;
        const chatBody = await chatRes.text();
        const lines = chatBody.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) aiText += data.content;
            if (data.creditCost) creditCost += data.creditCost;
          } catch {}
        }

        const cleanText = aiText
          .replace(/\[INNER_THOUGHT\][\s\S]*?\[\/INNER_THOUGHT\]/g, "")
          .replace(/\[MEMORY\][\s\S]*?\[\/MEMORY\]/g, "")
          .replace(/\[UPDATE_SOUL\][\s\S]*?\[\/UPDATE_SOUL\]/g, "")
          .replace(/\[UPDATE_MISSION\][\s\S]*?\[\/UPDATE_MISSION\]/g, "")
          .replace(/\[ACTION:[\s\S]*?\[\/ACTION\]/g, "")
          .replace(/\[SOUL_GROWTH\][\s\S]*?\[\/SOUL_GROWTH\]/g, "")
          .trim();

        const spokenText = cleanText.substring(0, 2000);

        if (!spokenText) {
          return res.json({
            audioBase64: "",
            audioFormat: "mp3",
            userTranscript,
            aiText: "",
            creditCost,
          });
        }

        const selectedVoice = voice || "nova";
        console.log(`[音声チャット] TTS開始: ${spokenText.length}文字, voice=${selectedVoice}`);
        const audioResponse = await generateTTS(spokenText, selectedVoice, "mp3");
        console.log(`[音声チャット] TTS完了: ${(audioResponse.length / 1024).toFixed(0)}KB`);

        const user = await storage.getUser(req.session.userId!);
        if (!user?.isAdmin) {
          const sttCost = audioDurationSec * STT_COST_PER_SEC_YEN;
          const ttsCost = spokenText.length * TTS_COST_PER_CHAR_YEN;
          const voiceCost = sttCost + ttsCost;
          if (voiceCost > 0) {
            await deductCredit(req.session.userId!, voiceCost);
            creditCost += voiceCost;
          }
        }

        const audioBase64 = audioResponse.toString("base64");
        res.json({
          audioBase64,
          audioFormat: "mp3",
          userTranscript,
          aiText: cleanText,
          creditCost,
        });
      } catch (err) {
        console.error("音声チャットエラー:", err);
        res.status(500).json({ message: "音声チャットに失敗しました" });
      }
    }
  );

  app.post(
    "/api/stt/transcribe",
    requireAuth,
    express.json({ limit: "50mb" }),
    async (req: Request, res: Response) => {
      try {
        const { audio } = req.body;
        if (!audio) {
          return res.status(400).json({ message: "音声データが必要です" });
        }

        const rawBuffer = Buffer.from(audio, "base64");
        const audioDurationSec = Math.max(1, rawBuffer.length / (16000 * 2));

        console.log(`[STT] 文字起こし開始(Soniox): ${(rawBuffer.length / 1024).toFixed(0)}KB`);
        const transcript = await sonioxSpeechToText(rawBuffer, "audio.webm");
        console.log(`[STT] 文字起こし完了: "${transcript.substring(0, 100)}"`);

        let creditCost = 0;
        const user = await storage.getUser(req.session.userId!);
        if (!user?.isAdmin) {
          const sttCost = audioDurationSec * STT_COST_PER_SEC_YEN;
          if (sttCost > 0) {
            await deductCredit(req.session.userId!, sttCost);
            creditCost = sttCost;
          }
        }

        res.json({ transcript, creditCost });
      } catch (err) {
        console.error("STTエラー:", err);
        res.status(500).json({ message: "文字起こしに失敗しました" });
      }
    }
  );
}
