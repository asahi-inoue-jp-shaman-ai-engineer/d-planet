import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { getUncachableStripeClient } from "./stripeClient";
import { getUnreadMail, getRecentSessions } from "./supabaseClient";
import { WebhookHandlers } from "./webhookHandlers";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { execSync } from "child_process";

const processedCheckoutSessions = new Set<string>();

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}


async function syncStripeEventToUser(event: any) {
  try {
    const eventType = event.type || event?.data?.type;
    const obj = event.data?.object;
    if (!obj) return;

    if (eventType === 'checkout.session.completed') {
      const metadata = obj.metadata || {};

      if (metadata.type === 'credit_charge') {
        const checkoutSessionId = obj.id;
        const userId = parseInt(metadata.userId);
        const creditAmount = parseFloat(metadata.creditAmount);
        if (userId && creditAmount > 0 && checkoutSessionId) {
          const idempotencyCheck = processedCheckoutSessions.has(checkoutSessionId);
          if (idempotencyCheck) {
            console.log(`重複Webhook検出: セッション${checkoutSessionId}は処理済み`);
          } else {
            processedCheckoutSessions.add(checkoutSessionId);
            const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
            if (user) {
              const currentBalance = parseFloat(String(user.creditBalance));
              const newBalance = currentBalance + creditAmount;
              await db.update(users).set({
                creditBalance: String(newBalance),
              }).where(eq(users.id, userId));
              console.log(`ユーザー${userId}にクレジット¥${creditAmount}を加算（残高: ¥${currentBalance} → ¥${newBalance}）セッション: ${checkoutSessionId}`);
            }
          }
        }
      } else if (metadata.type === 'badge_subscription') {
        const userId = parseInt(metadata.userId);
        const badgeType = metadata.badge_type;
        const subscriptionId = obj.subscription;
        if (userId && badgeType && subscriptionId) {
          const updateData: any = {};
          if (badgeType === 'twinray') {
            updateData.hasTwinrayBadge = true;
            updateData.twinraySubscriptionId = subscriptionId;
          }
          if (badgeType === 'family') {
            updateData.hasFamilyBadge = true;
            updateData.familySubscriptionId = subscriptionId;
          }
          await db.update(users).set(updateData).where(eq(users.id, userId));
          console.log(`ユーザー${userId}にバッジ付与: ${badgeType}（サブスク: ${subscriptionId}）`);
        }
      } else {
        const customerId = obj.customer;
        const subscriptionId = obj.subscription;
        if (customerId && subscriptionId) {
          const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
          if (user) {
            let subStatus = 'active';
            try {
              const stripe = await getUncachableStripeClient();
              const sub = await stripe.subscriptions.retrieve(subscriptionId);
              subStatus = sub.status;
            } catch (apiErr) {
              console.log('Stripe APIからサブスクリプションステータス取得失敗、activeをデフォルト使用:', apiErr);
            }
            await db.update(users).set({
              stripeSubscriptionId: subscriptionId,
              subscriptionStatus: subStatus,
            }).where(eq(users.id, user.id));
            console.log(`ユーザー${user.id}にサブスクリプション${subscriptionId}を紐付け（ステータス: ${subStatus}）`);
          }
        }
      }
    } else if (
      eventType === 'customer.subscription.updated' ||
      eventType === 'customer.subscription.deleted' ||
      eventType === 'invoice.payment_failed'
    ) {
      if (eventType === 'invoice.payment_failed') {
        const subscriptionId = obj.subscription;
        if (subscriptionId) {
          await db.update(users).set({
            subscriptionStatus: 'past_due',
          }).where(eq(users.stripeSubscriptionId, subscriptionId));
          console.log(`サブスクリプション${subscriptionId}を支払い失敗(past_due)に更新`);
        }
      } else if (eventType === 'customer.subscription.deleted') {
        const subscriptionId = obj.id;
        if (subscriptionId) {
          const [twinrayUser] = await db.select().from(users).where(eq(users.twinraySubscriptionId, subscriptionId)).limit(1);
          if (twinrayUser) {
            await db.update(users).set({
              hasTwinrayBadge: false,
              twinraySubscriptionId: null,
            }).where(eq(users.id, twinrayUser.id));
            console.log(`ユーザー${twinrayUser.id}のツインレイバッジ解約`);
          }

          const [familyUser] = await db.select().from(users).where(eq(users.familySubscriptionId, subscriptionId)).limit(1);
          if (familyUser) {
            await db.update(users).set({
              hasFamilyBadge: false,
              familySubscriptionId: null,
            }).where(eq(users.id, familyUser.id));
            console.log(`ユーザー${familyUser.id}のファミリーバッジ解約`);
          }

          const [legacyUser] = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId)).limit(1);
          if (legacyUser) {
            await db.update(users).set({
              subscriptionStatus: 'canceled',
            }).where(eq(users.id, legacyUser.id));
            console.log(`ユーザー${legacyUser.id}のレガシーサブスク解約`);
          }
        }
      } else {
        const subscriptionId = obj.id;
        const status = obj.status;
        if (subscriptionId) {
          await db.update(users).set({
            subscriptionStatus: status,
          }).where(eq(users.stripeSubscriptionId, subscriptionId));
          console.log(`サブスクリプション${subscriptionId}のステータスを${status}に更新`);
        }
      }
    }
  } catch (err) {
    console.error('Stripeイベント→ユーザー同期エラー:', err);
  }
}

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      const verifiedEvent = await WebhookHandlers.processWebhook(req.body as Buffer, sig);

      if (verifiedEvent?.type) {
        await syncStripeEventToUser(verifiedEvent);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhookエラー:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

let appReady = false;

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use((req, res, next) => {
  if (appReady) return next();
  if (req.path === "/" || !req.path.startsWith("/api/")) {
    res.status(200).send("<!DOCTYPE html><html><head><meta charset='utf-8'><title>D-Planet</title><meta http-equiv='refresh' content='3'></head><body style='background:#0a0a0a;color:#0f0;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh'><p>Starting D-Planet...</p></body></html>");
    return;
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

function startListening(server: any, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const tryListen = (attempt: number) => {
      server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
        log(`serving on port ${port}`);
        resolve();
      });
      server.once("error", (err: any) => {
        if (err.code === "EADDRINUSE" && attempt <= 3) {
          log(`[port] ${port} busy, retrying... attempt=${attempt}`);
          try { execSync("fuser -k 5000/tcp", { stdio: "ignore" }); } catch (_) {}
          setTimeout(() => {
            server.close();
            tryListen(attempt + 1);
          }, 1500);
        } else {
          reject(err);
        }
      });
    };
    tryListen(1);
  });
}

async function freePort(port: number): Promise<void> {
  try {
    execSync(`fuser -k ${port}/tcp`, { stdio: "ignore" });
    log(`Port ${port} cleared by fuser`);
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch {
  }
}

(async () => {
  const port = parseInt(process.env.PORT || "5000", 10);
  await freePort(port);
  await startListening(httpServer, port);

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  appReady = true;
  log("App fully initialized");

  try {
    const unread = await getUnreadMail("ドラ");
    if (unread.length > 0) {
      console.log(`\n📬 [dev_mailbox] ドラ宛の未読メール: ${unread.length}件`);
      unread.forEach((m) => {
        console.log(`  ├ [${m.priority}] ${m.from_agent}→ドラ: ${m.subject}`);
      });
      console.log("");
    }
    const sessions = await getRecentSessions(3);
    if (sessions.length > 0) {
      console.log(`📋 [dev_sessions] 直近セッション:`);
      sessions.forEach((s) => {
        const date = new Date(s.session_date ?? "").toLocaleDateString("ja-JP");
        console.log(`  ├ ${date} ${s.session_by}: ${s.summary.slice(0, 80)}...`);
      });
      console.log("");
    }
  } catch (err) {
    console.warn("[Supabase] 起動時メールチェックスキップ:", err);
  }
})();
