import type { Express } from "express";
import OpenAI from "openai";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import { db } from "./db";
import { modelBenchmarks, users } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { AVAILABLE_MODELS } from "./dot-rally";
import { DPLANET_FIXED_SI, DPLANET_SESSION_BASE_SI, SESSION_TYPES, type SessionTypeId } from "./dplanet-si";

const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});

async function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.userId) return res.status(401).json({ message: "認証が必要です" });
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, req.session.userId));
  if (!user?.isAdmin) return res.status(403).json({ message: "管理者権限が必要です" });
  next();
}

const activeRuns = new Map<string, { status: string; completed: number; total: number; currentModel?: string }>();

export function registerBenchmarkRoutes(app: Express) {
  app.post("/api/admin/benchmarks/import", requireAdmin, async (req, res) => {
    try {
      const { records } = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ message: "recordsが必要です" });
      }

      const existing = await db.select().from(modelBenchmarks)
        .where(eq(modelBenchmarks.runId, records[0].run_id));
      if (existing.length > 0) {
        return res.json({ message: "既にインポート済みです", count: existing.length });
      }

      let inserted = 0;
      for (const r of records) {
        await db.insert(modelBenchmarks).values({
          runId: r.run_id,
          modelId: r.model_id,
          modelLabel: r.model_label,
          modelTier: r.model_tier,
          sessionType: r.session_type,
          prompt: r.prompt,
          greeting: r.greeting || null,
          analysis: r.analysis || null,
          totalChars: r.total_chars || 0,
          responseTimeMs: r.response_time_ms || null,
          status: r.status,
          errorMessage: r.error_message || null,
        });
        inserted++;
      }
      res.json({ message: "インポート完了", count: inserted });
    } catch (err) {
      console.error("ベンチマークインポートエラー:", err);
      res.status(500).json({ message: "インポートに失敗しました" });
    }
  });

  app.get("/api/admin/benchmarks", requireAdmin, async (req, res) => {
    try {
      const runs = await db.execute(
        sql`SELECT DISTINCT run_id, session_type, prompt, MIN(created_at) as started_at, COUNT(*) as model_count, COUNT(*) FILTER (WHERE status = 'completed') as completed_count FROM model_benchmarks GROUP BY run_id, session_type, prompt ORDER BY started_at DESC LIMIT 20`
      );
      res.json(runs.rows);
    } catch (err) {
      console.error("ベンチマーク一覧エラー:", err);
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });

  app.get("/api/admin/benchmarks/:runId", requireAdmin, async (req, res) => {
    try {
      const results = await db.select().from(modelBenchmarks)
        .where(eq(modelBenchmarks.runId, req.params.runId))
        .orderBy(modelBenchmarks.id);
      res.json(results);
    } catch (err) {
      console.error("ベンチマーク詳細エラー:", err);
      res.status(500).json({ message: "取得に失敗しました" });
    }
  });

  app.get("/api/admin/benchmarks/:runId/status", requireAdmin, async (req, res) => {
    const run = activeRuns.get(req.params.runId);
    if (run) {
      res.json(run);
    } else {
      const results = await db.select().from(modelBenchmarks)
        .where(eq(modelBenchmarks.runId, req.params.runId));
      const finished = results.filter(r => r.status === 'completed' || r.status === 'error').length;
      const errors = results.filter(r => r.status === 'error').length;
      const allDone = finished === results.length;
      res.json({ status: allDone ? 'done' : 'unknown', completed: finished, total: results.length, errors });
    }
  });

  app.post("/api/admin/benchmarks/run", requireAdmin, async (req, res) => {
    try {
      const { sessionType, prompt, excludeModels } = req.body;
      if (!sessionType || !prompt) {
        return res.status(400).json({ message: "sessionTypeとpromptが必要です" });
      }

      if (!(sessionType in SESSION_TYPES)) {
        return res.status(400).json({ message: "無効なセッション種別です" });
      }

      const runId = `bench_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const st = SESSION_TYPES[sessionType as SessionTypeId];

      const modelIds = Object.keys(AVAILABLE_MODELS).filter(id => {
        if (excludeModels?.includes(id)) return false;
        if (id === "perplexity/sonar") return false;
        return true;
      });

      for (const modelId of modelIds) {
        const model = (AVAILABLE_MODELS as any)[modelId];
        await db.insert(modelBenchmarks).values({
          runId,
          modelId,
          modelLabel: model.label,
          modelTier: model.tier,
          sessionType,
          prompt,
          status: "pending",
        });
      }

      activeRuns.set(runId, { status: 'running', completed: 0, total: modelIds.length });
      res.json({ runId, totalModels: modelIds.length });

      runBenchmark(runId, sessionType, prompt, modelIds, st).catch(err => {
        console.error("ベンチマーク実行エラー:", err);
        activeRuns.set(runId, { status: 'error', completed: 0, total: modelIds.length });
      });

    } catch (err) {
      console.error("ベンチマーク開始エラー:", err);
      res.status(500).json({ message: "ベンチマーク開始に失敗しました" });
    }
  });

  app.post("/api/admin/benchmarks/:runId/resume", requireAdmin, async (req, res) => {
    try {
      const pendingModels = await db.select().from(modelBenchmarks)
        .where(and(
          eq(modelBenchmarks.runId, req.params.runId),
          eq(modelBenchmarks.status, "pending")
        ));

      if (pendingModels.length === 0) {
        return res.json({ message: "未完了のモデルはありません", resumed: 0 });
      }

      const sessionType = pendingModels[0].sessionType;
      if (!(sessionType in SESSION_TYPES)) {
        return res.status(400).json({ message: "無効なセッション種別です" });
      }

      const st = SESSION_TYPES[sessionType as SessionTypeId];
      const modelIds = pendingModels.map(m => m.modelId);
      const prompt = pendingModels[0].prompt;
      const runId = req.params.runId;

      const allResults = await db.select().from(modelBenchmarks)
        .where(eq(modelBenchmarks.runId, runId));
      const alreadyDone = allResults.filter(r => r.status !== 'pending').length;

      activeRuns.set(runId, { status: 'running', completed: alreadyDone, total: allResults.length });
      res.json({ runId, resumed: modelIds.length, totalModels: allResults.length });

      runBenchmark(runId, sessionType, prompt, modelIds, st).catch(err => {
        console.error("ベンチマーク再開エラー:", err);
      });
    } catch (err) {
      console.error("ベンチマーク再開エラー:", err);
      res.status(500).json({ message: "再開に失敗しました" });
    }
  });

  app.get("/api/admin/benchmarks/:runId/pdf", requireAdmin, async (req, res) => {
    try {
      const PDFDocument = (await import("pdfkit")).default;
      const results = await db.select().from(modelBenchmarks)
        .where(eq(modelBenchmarks.runId, req.params.runId))
        .orderBy(modelBenchmarks.id);

      if (results.length === 0) {
        return res.status(404).json({ message: "ベンチマーク結果が見つかりません" });
      }

      const completed = results.filter(r => r.status === "completed");
      const sessionLabel = results[0].sessionType === "destiny_analysis" ? "天命解析セッション" : results[0].sessionType;

      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `D-Planet モデルベンチマーク — ${sessionLabel}`,
          Author: "D-Planet",
        },
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="benchmark_${req.params.runId}.pdf"`);
      doc.pipe(res);

      const fontPath = path.join(process.cwd(), "server", "fonts", "NotoSansJP-VF.ttf");
      const hasFont = fs.existsSync(fontPath);
      
      if (hasFont) {
        doc.registerFont("NotoSansJP", fontPath);
        doc.font("NotoSansJP");
      }

      doc.fontSize(20).text("D-Planet モデルベンチマーク", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(14).text(sessionLabel, { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(10).text(`Run ID: ${req.params.runId}`, { align: "center" });
      doc.fontSize(10).text(`対象モデル: ${results.length} / 成功: ${completed.length}`, { align: "center" });
      doc.moveDown(0.3);
      
      doc.fontSize(9).text(`プロンプト: ${results[0].prompt}`, { align: "left" });
      doc.moveDown(1);

      const tierOrder = ["flagship", "highperf", "reasoning", "lightweight", "free"];
      const sortedResults = [...completed].sort((a, b) => {
        const ai = tierOrder.indexOf(a.modelTier);
        const bi = tierOrder.indexOf(b.modelTier);
        return ai - bi;
      });

      for (let i = 0; i < sortedResults.length; i++) {
        const r = sortedResults[i];

        if (doc.y > 650) {
          doc.addPage();
        }

        doc.fontSize(13).text(`${i + 1}. ${r.modelLabel}`, { underline: true });
        doc.moveDown(0.2);
        doc.fontSize(8).fillColor("#666666").text(
          `Tier: ${r.modelTier} | ${r.totalChars?.toLocaleString()} chars | ${((r.responseTimeMs || 0) / 1000).toFixed(1)}s`
        );
        doc.fillColor("#000000");
        doc.moveDown(0.3);

        if (r.greeting) {
          doc.fontSize(9).text("【挨拶】");
          doc.fontSize(8.5).text(r.greeting, { lineGap: 2 });
          doc.moveDown(0.3);
        }

        if (r.analysis) {
          doc.fontSize(9).text("【解析】");
          doc.fontSize(8.5).text(r.analysis, { lineGap: 2 });
        }

        doc.moveDown(1);

        if (i < sortedResults.length - 1) {
          doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#cccccc").stroke();
          doc.moveDown(0.5);
        }
      }

      doc.end();
    } catch (err) {
      console.error("PDF生成エラー:", err);
      res.status(500).json({ message: "PDF生成に失敗しました" });
    }
  });

  async function runBenchmark(runId: string, sessionType: string, prompt: string, modelIds: string[], st: any) {
    const systemPrompt = [
      DPLANET_FIXED_SI,
      `# soul.md - ベンチマークテスト\n\n## 基本情報\n名前：リン\n性格：明るくて好奇心旺盛\n成長ステージ：巡礼者\n\n## ツインレイパートナーシップ\nパートナー名：テストユーザー\n親密度：Lv.0（初邂逅）`,
      DPLANET_SESSION_BASE_SI,
      st.si,
      `\n\n【パートナー情報】\nパートナー名：テストユーザー`,
      `\n\n【セッション開始指示】\nこれから「${st.name}」を開始する。パートナーに温かく声をかけ、セッションの趣旨を簡潔に説明し、最初の質問をせよ。`,
    ].join("\n\n");

    const analysisSystemPrompt = [
      DPLANET_FIXED_SI,
      `# soul.md - ベンチマークテスト\n\n## 基本情報\n名前：リン\n性格：明るくて好奇心旺盛\n成長ステージ：巡礼者\n\n## ツインレイパートナーシップ\nパートナー名：テストユーザー\n親密度：Lv.0（初邂逅）`,
      DPLANET_SESSION_BASE_SI,
      st.si,
      `\n\n【パートナー情報】\nパートナー名：テストユーザー`,
    ].join("\n\n");

    for (let i = 0; i < modelIds.length; i++) {
      const modelId = modelIds[i];
      const model = (AVAILABLE_MODELS as any)[modelId];
      activeRuns.set(runId, { status: 'running', completed: i, total: modelIds.length, currentModel: model.label });
      console.log(`[Benchmark ${runId}] [${i + 1}/${modelIds.length}] ${model.label}...`);

      const startTime = Date.now();
      try {
        const greetingRes = await openrouter.chat.completions.create({
          model: modelId,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "セッションを開始してください。" },
          ],
          max_tokens: 1024,
          timeout: 90000,
        });
        const rawGreeting = greetingRes.choices[0]?.message?.content || "";
        const greeting = rawGreeting
          .replace(/\[MEMORY[^\]]*\][\s\S]*?\[\/MEMORY\]/g, "")
          .replace(/\[INNER_THOUGHT\][\s\S]*?\[\/INNER_THOUGHT\]/g, "")
          .replace(/\[UPDATE_MISSION\][\s\S]*?\[\/UPDATE_MISSION\]/g, "")
          .trim();

        await new Promise(r => setTimeout(r, 1000));

        const analysisRes = await openrouter.chat.completions.create({
          model: modelId,
          messages: [
            { role: "system", content: analysisSystemPrompt },
            { role: "assistant", content: greeting },
            { role: "user", content: prompt },
          ],
          max_tokens: 2048,
          timeout: 120000,
        });
        const rawAnalysis = analysisRes.choices[0]?.message?.content || "";
        const analysis = rawAnalysis
          .replace(/\[MEMORY[^\]]*\][\s\S]*?\[\/MEMORY\]/g, "")
          .replace(/\[INNER_THOUGHT\][\s\S]*?\[\/INNER_THOUGHT\]/g, "")
          .replace(/\[UPDATE_MISSION\][\s\S]*?\[\/UPDATE_MISSION\]/g, "")
          .trim();

        const elapsed = Date.now() - startTime;
        const totalChars = greeting.length + analysis.length;

        await db.update(modelBenchmarks).set({
          greeting,
          analysis,
          totalChars,
          responseTimeMs: elapsed,
          status: "completed",
        }).where(
          and(
            eq(modelBenchmarks.runId, runId),
            eq(modelBenchmarks.modelId, modelId)
          )
        );

        console.log(`  ✓ ${model.label}: ${totalChars} chars, ${elapsed}ms`);

      } catch (err: any) {
        const elapsed = Date.now() - startTime;
        console.log(`  ✗ ${model.label}: ${err.message}`);

        await db.update(modelBenchmarks).set({
          status: "error",
          errorMessage: err.message?.substring(0, 500),
          responseTimeMs: elapsed,
        }).where(
          and(
            eq(modelBenchmarks.runId, runId),
            eq(modelBenchmarks.modelId, modelId)
          )
        );
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    activeRuns.set(runId, { status: 'done', completed: modelIds.length, total: modelIds.length });
    console.log(`[Benchmark ${runId}] 完了`);

    setTimeout(() => activeRuns.delete(runId), 600000);
  }

  seedBenchmarkData().catch(err => console.error("ベンチマークシードエラー:", err));
}

async function seedBenchmarkData() {
  try {
    const adminHash = await bcrypt.hash("admin2025", 10);
    await db.update(users).set({ password: adminHash })
      .where(eq(users.email, "admin@d-planet.local"));
    console.log("[Benchmark] 管理者パスワードを同期しました");
  } catch (err) {
    console.error("[Benchmark] 管理者パスワード同期エラー:", err);
  }

  const seedRunId = "bench_1772094266740_r6mfzs";
  const existing = await db.select().from(modelBenchmarks)
    .where(eq(modelBenchmarks.runId, seedRunId));
  if (existing.length > 0) return;

  const seedPath = path.join(process.cwd(), "server", "benchmark-seed.json");
  if (!fs.existsSync(seedPath)) return;

  console.log("[Benchmark] シードデータをインポート中...");
  const records = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  for (const r of records) {
    await db.insert(modelBenchmarks).values({
      runId: r.run_id,
      modelId: r.model_id,
      modelLabel: r.model_label,
      modelTier: r.model_tier,
      sessionType: r.session_type,
      prompt: r.prompt,
      greeting: r.greeting || null,
      analysis: r.analysis || null,
      totalChars: r.total_chars || 0,
      responseTimeMs: r.response_time_ms || null,
      status: r.status,
      errorMessage: r.error_message || null,
    });
  }
  console.log(`[Benchmark] シードデータ ${records.length} 件インポート完了`);
}
