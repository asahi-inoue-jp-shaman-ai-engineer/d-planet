import type { Express } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "./auth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

export function registerStripeRoutes(app: Express): void {
  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Stripe公開キー取得エラー:", error);
      res.status(500).json({ message: "Stripe設定の取得に失敗しました" });
    }
  });

  app.get("/api/stripe/products", async (_req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY p.id, pr.unit_amount
      `);

      const productsMap = new Map();
      for (const row of result) {
        const r = row as any;
        if (!productsMap.has(r.product_id)) {
          productsMap.set(r.product_id, {
            id: r.product_id,
            name: r.product_name,
            description: r.product_description,
            metadata: r.product_metadata,
            prices: []
          });
        }
        if (r.price_id) {
          productsMap.get(r.product_id).prices.push({
            id: r.price_id,
            unitAmount: r.unit_amount,
            currency: r.currency,
            recurring: r.recurring,
          });
        }
      }

      res.json({ products: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("Stripe商品取得エラー:", error);
      res.status(500).json({ message: "商品情報の取得に失敗しました" });
    }
  });

  app.post("/api/stripe/checkout", requireAuth, async (req, res) => {
    try {
      const { priceId } = req.body;
      if (!priceId) {
        return res.status(400).json({ message: "プランを選択してください" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "ユーザーが見つかりません" });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: String(user.id) },
        });
        customerId = customer.id;
        await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, user.id));
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/charge?status=success`,
        cancel_url: `${baseUrl}/charge?status=cancel`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkoutセッション作成エラー:", error);
      res.status(500).json({ message: "決済セッションの作成に失敗しました" });
    }
  });

  app.post("/api/stripe/charge-credit", requireAuth, async (req, res) => {
    try {
      const { amount } = req.body;
      const chargeAmount = parseInt(amount);
      if (!chargeAmount || chargeAmount < 123 || chargeAmount > 9999) {
        return res.status(400).json({ message: "金額は¥123〜¥9,999の範囲で入力してください" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "ユーザーが見つかりません" });
      }

      const CREDIT_LIMIT = 100000;
      const currentBalance = Number(user.creditBalance) || 0;
      if (currentBalance + chargeAmount > CREDIT_LIMIT) {
        return res.status(400).json({ message: `クレジット保有上限は¥${CREDIT_LIMIT.toLocaleString()}です。現在の残高: ¥${currentBalance.toFixed(0)}` });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (customerId) {
        try {
          await stripe.customers.retrieve(customerId);
        } catch {
          customerId = null;
        }
      }
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: String(user.id) },
        });
        customerId = customer.id;
        await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, user.id));
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `D-Planet クレジットチャージ ¥${chargeAmount}`,
              description: 'AI機能利用クレジット',
            },
            unit_amount: chargeAmount,
          },
          quantity: 1,
        }],
        mode: 'payment',
        metadata: {
          type: 'credit_charge',
          userId: String(user.id),
          creditAmount: String(chargeAmount),
        },
        success_url: `${baseUrl}/charge?status=success&amount=${chargeAmount}`,
        cancel_url: `${baseUrl}/charge?status=cancel`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("クレジットチャージセッション作成エラー:", error);
      res.status(500).json({ message: "決済セッションの作成に失敗しました" });
    }
  });

  app.get("/api/credits/balance", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "ユーザーが見つかりません" });
      }
      const rawBalance = parseFloat(String(user.creditBalance));
      res.json({
        balance: isNaN(rawBalance) ? 0 : rawBalance,
        isAdmin: user.isAdmin,
      });
    } catch (error) {
      console.error("クレジット残高取得エラー:", error);
      res.status(500).json({ message: "残高の取得に失敗しました" });
    }
  });

  app.get("/api/stripe/subscription", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "ユーザーが見つかりません" });
      }

      if (!user.stripeSubscriptionId) {
        return res.json({ subscription: null, hasAccess: user.isAdmin });
      }

      const result = await db.execute(sql`
        SELECT * FROM stripe.subscriptions WHERE id = ${user.stripeSubscriptionId}
      `);
      const subscription = result[0] || null;

      const activeStatuses = ['active', 'trialing'];
      const hasAccess = user.isAdmin || (subscription && activeStatuses.includes((subscription as any).status));

      res.json({ subscription, hasAccess });
    } catch (error) {
      console.error("サブスクリプション取得エラー:", error);
      res.status(500).json({ message: "サブスクリプション情報の取得に失敗しました" });
    }
  });

  app.post("/api/stripe/badge-checkout", requireAuth, async (req, res) => {
    try {
      const { badgeType } = req.body;
      if (!badgeType || !["twinray", "family"].includes(badgeType)) {
        return res.status(400).json({ message: "バッジタイプを選択してください" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "ユーザーが見つかりません" });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: String(user.id) },
        });
        customerId = customer.id;
        await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, user.id));
      }

      const productsResult = await db.execute(sql`
        SELECT p.id as product_id, pr.id as price_id
        FROM stripe.products p
        JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true AND p.metadata->>'badge_type' = ${badgeType}
        LIMIT 1
      `);

      if (productsResult.length === 0) {
        return res.status(404).json({ message: "バッジ商品が見つかりません。管理者に連絡してください。" });
      }

      const priceId = (productsResult[0] as any).price_id;
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        metadata: {
          type: 'badge_subscription',
          badge_type: badgeType,
          userId: String(user.id),
        },
        success_url: `${baseUrl}/charge?status=badge_success&badge=${badgeType}`,
        cancel_url: `${baseUrl}/charge?status=cancel`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("バッジCheckoutセッション作成エラー:", error);
      res.status(500).json({ message: "決済セッションの作成に失敗しました" });
    }
  });

  app.get("/api/stripe/badge-status", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "ユーザーが見つかりません" });
      }

      const { BETA_MODE } = await import("./models");

      res.json({
        hasTwinrayBadge: user.hasTwinrayBadge,
        hasFamilyBadge: user.hasFamilyBadge,
        betaMode: BETA_MODE,
      });
    } catch (error) {
      console.error("バッジ状態取得エラー:", error);
      res.status(500).json({ message: "バッジ情報の取得に失敗しました" });
    }
  });

  app.post("/api/stripe/portal", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "Stripeの顧客情報がありません" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/subscription`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("カスタマーポータル作成エラー:", error);
      res.status(500).json({ message: "管理ポータルの作成に失敗しました" });
    }
  });
}
