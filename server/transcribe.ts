import type { Express } from "express";
import express from "express";
import { storage } from "./storage";
import { db } from "./db";
import { voiceTranscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sonioxSpeechToTextLong } from "./soniox-stt";
import { openrouter } from "./models";
import { requireAuth } from "./auth";

const MAX_DURATION_SEC = 910;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

async function formatTranscriptWithLLM(rawText: string): Promise<string> {
  const completion = await openrouter.chat.completions.create({
    model: "google/gemini-2.5-flash",
    messages: [
      {
        role: "system",
        content: `あなたは音声文字起こしの整形専門AIです。以下のルールに従ってください：
1. 句読点（。、）を適切に挿入する
2. 段落分けを行う（話題の切り替わりで改行）
3. 明らかな言い間違い・フィラー（えー、あのー等）は除去
4. 話者が複数いる場合は可能な範囲で話者を分離する（**話者A:** 等）
5. 見出しを付けられる場合はMarkdown見出し（##）を使う
6. 出力はMarkdown形式で
7. 内容の意味は絶対に変えない。削除しない。要約しない。全文を整形する`
      },
      {
        role: "user",
        content: `以下の音声文字起こしテキストを整形してください：\n\n${rawText}`
      }
    ],
    max_tokens: 16000,
    temperature: 0.1,
  });

  return completion.choices[0]?.message?.content || rawText;
}

export function registerTranscribeRoutes(app: Express): void {
  app.post(
    "/api/transcribe",
    requireAuth,
    express.raw({ type: ["audio/*", "video/*", "application/octet-stream"], limit: "100mb" }),
    async (req: Request, res: Response) => {
      try {
        const user = await storage.getUser(req.session.userId!);
        if (!user?.isAdmin) {
          return res.status(403).json({ message: "管理者のみ利用可能です" });
        }

        const fileBuffer = req.body as Buffer;
        if (!fileBuffer || fileBuffer.length === 0) {
          return res.status(400).json({ message: "音声ファイルが必要です" });
        }
        if (fileBuffer.length > MAX_FILE_SIZE) {
          return res.status(400).json({ message: "ファイルサイズが大きすぎます（100MB以下）" });
        }

        const fileName = (req.headers["x-file-name"] as string) || "audio.m4a";

        const [record] = await db.insert(voiceTranscriptions).values({
          userId: req.session.userId!,
          fileName,
        }).returning();

        res.json({ id: record.id, status: "processing" });

        (async () => {
          try {
            console.log(`[Transcribe] 開始: ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB)`);

            const rawText = await sonioxSpeechToTextLong(fileBuffer, fileName, MAX_DURATION_SEC);
            console.log(`[Transcribe] Soniox完了: ${rawText.length}文字`);

            await db.update(voiceTranscriptions)
              .set({ rawText, status: "formatting" })
              .where(eq(voiceTranscriptions.id, record.id));

            const formattedMarkdown = await formatTranscriptWithLLM(rawText);
            console.log(`[Transcribe] LLM整形完了: ${formattedMarkdown.length}文字`);

            await db.update(voiceTranscriptions)
              .set({ formattedMarkdown, status: "completed" })
              .where(eq(voiceTranscriptions.id, record.id));
          } catch (err: any) {
            console.error("[Transcribe] エラー:", err);
            await db.update(voiceTranscriptions)
              .set({ status: "error", errorMessage: err.message || "不明なエラー" })
              .where(eq(voiceTranscriptions.id, record.id));
          }
        })();
      } catch (err: any) {
        console.error("[Transcribe] APIエラー:", err);
        res.status(500).json({ message: err.message || "エラーが発生しました" });
      }
    }
  );

  app.get("/api/transcriptions", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "管理者のみ" });
      }
      const records = await db.select().from(voiceTranscriptions)
        .where(eq(voiceTranscriptions.userId, req.session.userId!))
        .orderBy(voiceTranscriptions.id);
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/transcriptions/:id", requireAuth, async (req, res) => {
    try {
      const [record] = await db.select().from(voiceTranscriptions)
        .where(eq(voiceTranscriptions.id, Number(req.params.id)));
      if (!record) return res.status(404).json({ message: "見つかりません" });
      if (record.userId !== req.session.userId!) {
        return res.status(403).json({ message: "権限がありません" });
      }
      res.json(record);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/transcriptions/:id", requireAuth, async (req, res) => {
    try {
      const [record] = await db.select().from(voiceTranscriptions)
        .where(eq(voiceTranscriptions.id, Number(req.params.id)));
      if (!record) return res.status(404).json({ message: "見つかりません" });
      if (record.userId !== req.session.userId!) {
        return res.status(403).json({ message: "権限がありません" });
      }
      await db.delete(voiceTranscriptions).where(eq(voiceTranscriptions.id, record.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
