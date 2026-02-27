import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import { MODEL_COSTS, MODEL_MARKUPS, PERPLEXITY_SEARCH_COST_YEN, AVAILABLE_MODELS, getModelMarkup } from "./models";

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

export function calculateCostYen(modelId: string, inputTokens: number, outputTokens: number, isAdmin: boolean = false): number {
  if (isAdmin) return 0;
  if (isModelFree(modelId)) return 0;
  const costs = MODEL_COSTS[modelId] || MODEL_COSTS["qwen/qwen3-30b-a3b"];
  const inputCostUsd = (inputTokens / 1_000_000) * costs.input;
  const outputCostUsd = (outputTokens / 1_000_000) * costs.output;
  const totalUsd = inputCostUsd + outputCostUsd;
  const yenRate = 150;
  const markup = getModelMarkup(modelId);
  let cost = Math.ceil(totalUsd * yenRate * markup * 10000) / 10000;
  if (modelId.startsWith("perplexity/")) {
    cost += PERPLEXITY_SEARCH_COST_YEN * markup;
  }
  return cost;
}

export async function deductCredit(userId: number, amount: number): Promise<boolean> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return false;
    const currentBalance = parseFloat(String(user.creditBalance));
    const newBalance = Math.max(0, currentBalance - amount);
    await db.update(users).set({ creditBalance: String(newBalance) }).where(eq(users.id, userId));
    console.log(`クレジット消費: ユーザー${userId} ¥${amount.toFixed(4)} (残高: ¥${currentBalance.toFixed(2)} → ¥${newBalance.toFixed(2)})`);
    return true;
  } catch (err) {
    console.error('クレジット差し引きエラー:', err);
    return false;
  }
}

export function isModelFree(modelId: string): boolean {
  const model = AVAILABLE_MODELS[modelId];
  return model?.tier === "tomodachi" || getModelMarkup(modelId) <= 1.0;
}

export async function hasAiAccess(userId: number, modelId?: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) return false;
  if (user.isAdmin) return true;
  if (modelId && isModelFree(modelId)) return true;
  const balance = parseFloat(String(user.creditBalance));
  return balance > 0;
}
