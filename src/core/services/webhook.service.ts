import crypto from 'crypto';
import axios from 'axios';
import { WebhookEvent } from '../entities/webhook.entity.js';
import { logger } from '../../shared/logger/index.js';

export class WebhookService {
  /**
   * Dispatches an event to a tenant's webhook URL with HMAC-SHA256 signature verification headers.
   */
  public async dispatch<T>(webhookUrl: string, secret: string, event: WebhookEvent<T>): Promise<boolean> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payloadString = JSON.stringify(event);

    // Compute HMAC signature: HMAC-SHA256(timestamp + "." + payload, secret)
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payloadString}`)
      .digest('hex');

    try {
      logger.info({ webhookUrl, event: event.event, eventId: event.id }, 'Dispatching tenant webhook');

      await axios.post(webhookUrl, event, {
        headers: {
          'Content-Type': 'application/json',
          'X-SmsGate-Signature': signature,
          'X-SmsGate-Timestamp': timestamp,
          'User-Agent': 'SmsGate-Webhook-Dispatcher/1.0',
        },
        timeout: 5000,
      });

      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ webhookUrl, eventId: event.id, error: errorMsg }, 'Failed to deliver tenant webhook');
      return false;
    }
  }
}
