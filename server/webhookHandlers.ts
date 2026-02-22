import { getStripeSync, getUncachableStripeClient, getStripeSecretKey } from './stripeClient';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<any> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    let verifiedEvent = null;
    try {
      const stripe = await getUncachableStripeClient();
      const webhookSecret = await getWebhookSecret();
      if (webhookSecret) {
        verifiedEvent = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      }
    } catch {
      try {
        verifiedEvent = JSON.parse(payload.toString());
      } catch {
        verifiedEvent = null;
      }
    }

    if (!verifiedEvent) {
      try {
        verifiedEvent = JSON.parse(payload.toString());
      } catch {
        verifiedEvent = null;
      }
    }

    return verifiedEvent;
  }
}

async function getWebhookSecret(): Promise<string | null> {
  try {
    return process.env.STRIPE_WEBHOOK_SECRET || null;
  } catch {
    return null;
  }
}
