import Stripe from 'stripe';

function getCredentials() {
  const secretKey = process.env.STRIPE_LIVE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_LIVE_PUBLISHABLE_KEY;

  if (!secretKey || !publishableKey) {
    throw new Error('STRIPE_LIVE_SECRET_KEY / STRIPE_LIVE_PUBLISHABLE_KEY が設定されていません');
  }

  return { secretKey, publishableKey };
}

export async function getUncachableStripeClient() {
  const { secretKey } = getCredentials();
  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
