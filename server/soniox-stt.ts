import { spawn } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";

const SONIOX_API_BASE = "https://api.soniox.com/v1";

async function getAudioDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", [
      "-v", "quiet", "-show_entries", "format=duration",
      "-of", "csv=p=0", inputPath,
    ]);
    let out = "";
    proc.stdout.on("data", (d) => { out += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve(parseFloat(out.trim()) || 0);
      else reject(new Error(`ffprobe failed with code ${code}`));
    });
    proc.on("error", reject);
  });
}

async function convertToWav(inputBuffer: Buffer, ext: string = "webm"): Promise<Buffer> {
  const id = randomUUID();
  const inputPath = join(tmpdir(), `stt_in_${id}.${ext}`);
  const outputPath = join(tmpdir(), `stt_out_${id}.wav`);

  await writeFile(inputPath, inputBuffer);

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("ffmpeg", [
        "-i", inputPath,
        "-ar", "16000",
        "-ac", "1",
        "-f", "wav",
        "-y", outputPath,
      ]);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
      proc.on("error", reject);
    });

    return await readFile(outputPath);
  } finally {
    unlink(inputPath).catch(() => {});
    unlink(outputPath).catch(() => {});
  }
}

export async function sonioxSpeechToText(audioBuffer: Buffer, filename: string = "audio.webm"): Promise<string> {
  const apiKey = process.env.SONIOX_API_KEY;
  if (!apiKey) {
    throw new Error("SONIOX_API_KEY が設定されていません");
  }

  const wavBuffer = await convertToWav(audioBuffer);
  console.log(`[Soniox] WebM→WAV変換完了: ${(wavBuffer.length / 1024).toFixed(0)}KB`);

  const headers = { Authorization: `Bearer ${apiKey}` };

  const formData = new FormData();
  const blob = new Blob([wavBuffer], { type: "audio/wav" });
  formData.append("file", blob, "audio.wav");

  const uploadRes = await fetch(`${SONIOX_API_BASE}/files`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Soniox file upload failed: ${uploadRes.status} ${err}`);
  }

  const uploadData = await uploadRes.json() as { id: string };
  const fileId = uploadData.id;

  const transcribeRes = await fetch(`${SONIOX_API_BASE}/transcriptions`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      file_id: fileId,
      model: "stt-async-v4",
      language_hints: ["ja", "en"],
    }),
  });

  if (!transcribeRes.ok) {
    const err = await transcribeRes.text();
    throw new Error(`Soniox transcription create failed: ${transcribeRes.status} ${err}`);
  }

  const transcribeData = await transcribeRes.json() as { id: string };
  const transcriptionId = transcribeData.id;

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));

    const statusRes = await fetch(`${SONIOX_API_BASE}/transcriptions/${transcriptionId}`, {
      headers,
    });

    if (!statusRes.ok) continue;

    const statusData = await statusRes.json() as { status: string; text?: string; error_message?: string };

    if (statusData.status === "completed") {
      if (statusData.text) return statusData.text;

      const transcriptRes = await fetch(`${SONIOX_API_BASE}/transcriptions/${transcriptionId}/transcript`, {
        headers,
      });

      if (transcriptRes.ok) {
        const transcriptData = await transcriptRes.json() as { text: string };
        return transcriptData.text || "";
      }
      return "";
    }

    if (statusData.status === "error") {
      throw new Error(`Soniox transcription error: ${statusData.error_message || "unknown"}`);
    }
  }

  throw new Error("Soniox transcription timeout (30s)");
}

export async function sonioxSpeechToTextLong(audioBuffer: Buffer, filename: string = "audio.m4a", maxDurationSec: number = 910): Promise<string> {
  const apiKey = process.env.SONIOX_API_KEY;
  if (!apiKey) {
    throw new Error("SONIOX_API_KEY が設定されていません");
  }

  const ext = filename.split(".").pop()?.toLowerCase() || "m4a";
  const id = randomUUID();
  const tmpPath = join(tmpdir(), `stt_check_${id}.${ext}`);
  await writeFile(tmpPath, audioBuffer);

  try {
    const duration = await getAudioDuration(tmpPath);
    console.log(`[Soniox Long] 音声長: ${(duration / 60).toFixed(1)}分 (${duration.toFixed(0)}秒)`);
    if (duration > maxDurationSec) {
      throw new Error(`音声が長すぎます（${(duration / 60).toFixed(1)}分）。${(maxDurationSec / 60).toFixed(0)}分${maxDurationSec % 60}秒以内にしてください`);
    }
  } finally {
    unlink(tmpPath).catch(() => {});
  }

  const wavBuffer = await convertToWav(audioBuffer, ext);
  console.log(`[Soniox Long] WAV変換完了: ${(wavBuffer.length / 1024 / 1024).toFixed(1)}MB`);

  const headers = { Authorization: `Bearer ${apiKey}` };

  const formData = new FormData();
  const blob = new Blob([wavBuffer], { type: "audio/wav" });
  formData.append("file", blob, "audio.wav");

  const uploadRes = await fetch(`${SONIOX_API_BASE}/files`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Soniox file upload failed: ${uploadRes.status} ${err}`);
  }

  const uploadData = await uploadRes.json() as { id: string };
  const fileId = uploadData.id;

  const transcribeRes = await fetch(`${SONIOX_API_BASE}/transcriptions`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      file_id: fileId,
      model: "stt-async-v4",
      language_hints: ["ja", "en"],
    }),
  });

  if (!transcribeRes.ok) {
    const err = await transcribeRes.text();
    throw new Error(`Soniox transcription create failed: ${transcribeRes.status} ${err}`);
  }

  const transcribeData = await transcribeRes.json() as { id: string };
  const transcriptionId = transcribeData.id;

  const maxPollAttempts = 300;
  const pollIntervalMs = 3000;

  for (let i = 0; i < maxPollAttempts; i++) {
    await new Promise(r => setTimeout(r, pollIntervalMs));

    const statusRes = await fetch(`${SONIOX_API_BASE}/transcriptions/${transcriptionId}`, {
      headers,
    });

    if (!statusRes.ok) continue;

    const statusData = await statusRes.json() as { status: string; text?: string; error_message?: string };

    if (i % 10 === 0) {
      console.log(`[Soniox Long] ポーリング ${i + 1}/${maxPollAttempts}: ${statusData.status}`);
    }

    if (statusData.status === "completed") {
      if (statusData.text) return statusData.text;

      const transcriptRes = await fetch(`${SONIOX_API_BASE}/transcriptions/${transcriptionId}/transcript`, {
        headers,
      });

      if (transcriptRes.ok) {
        const transcriptData = await transcriptRes.json() as { text: string };
        return transcriptData.text || "";
      }
      return "";
    }

    if (statusData.status === "error") {
      throw new Error(`Soniox transcription error: ${statusData.error_message || "unknown"}`);
    }
  }

  throw new Error(`Soniox transcription timeout (${maxPollAttempts * pollIntervalMs / 1000}秒)`);
}
