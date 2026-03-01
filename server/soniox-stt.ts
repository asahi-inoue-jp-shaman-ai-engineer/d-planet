const SONIOX_API_BASE = "https://api.soniox.com/v1";

export async function sonioxSpeechToText(audioBuffer: Buffer, filename: string = "audio.webm"): Promise<string> {
  const apiKey = process.env.SONIOX_API_KEY;
  if (!apiKey) {
    throw new Error("SONIOX_API_KEY が設定されていません");
  }

  const headers = { Authorization: `Bearer ${apiKey}` };

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: "application/octet-stream" });
  formData.append("file", blob, filename);

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
