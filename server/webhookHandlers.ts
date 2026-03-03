import { getUncachableStripeClient } from './stripeClient';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<any> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;

    if (webhookSecret) {
      const stripe = await getUncachableStripeClient();
      return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }

    try {
      return JSON.parse(payload.toString());
    } catch {
      return null;
    }
  }
}
