import { Request, Response } from 'express';
import { IMessageRepository, ITenantRepository } from '../../../core/ports/repository.ports.js';
import { WebhookService } from '../../../core/services/webhook.service.js';
import { logger } from '../../../shared/logger/index.js';

/**
 * Handles inbound webhook callbacks from the Android SMS Gateway server
 * (delivery reports, incoming SMS) and forwards to tenant webhook URLs.
 */
export class WebhooksController {
  constructor(
    private messageRepo: IMessageRepository,
    private tenantRepo: ITenantRepository,
    private webhookService: WebhookService
  ) {}

  /**
   * Receives delivery status updates from the SMS Gateway for Android private server
   * POST /v1/webhooks/gateway/status
   */
  public gatewayStatusCallback = async (req: Request, res: Response) => {
    const payload = req.body;

    logger.info({ payload }, 'Received gateway status callback');

    // Try to match by gateway message ID
    if (payload?.id || payload?.messageId) {
      const gatewayId = payload.id || payload.messageId;
      // For now, acknowledge — in production you'd look up by gatewayMessageId
      logger.info({ gatewayId, status: payload.status }, 'Gateway delivery status received');
    }

    return res.json({ success: true, message: 'Status callback acknowledged' });
  };

  /**
   * Receives incoming SMS from the SMS Gateway for Android
   * POST /v1/webhooks/gateway/incoming
   */
  public gatewayIncomingCallback = async (req: Request, res: Response) => {
    const { from, text, deviceId, simSlot, receivedAt } = req.body;

    logger.info({ from, text: text?.substring(0, 50), deviceId }, 'Incoming SMS received via gateway webhook');

    // In production, forward this to all tenants who have configured a webhook for 'sms.received'
    // For now, log and acknowledge
    return res.json({
      success: true,
      message: 'Incoming SMS webhook processed',
      data: {
        from,
        preview: text?.substring(0, 50),
        deviceId,
        simSlot,
        receivedAt,
      },
    });
  };

  /**
   * Test endpoint to verify webhook forwarding to a tenant's URL
   * POST /v1/webhooks/test
   */
  public testWebhook = async (req: Request, res: Response) => {
    const tenant = req.tenant!;

    if (!tenant.webhookUrl || !tenant.webhookSecret) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_WEBHOOK_CONFIGURED',
          message: 'No webhook URL or secret configured for this tenant.',
        },
      });
    }

    const testEvent = {
      id: `evt_test_${Date.now()}`,
      event: 'message.sent' as const,
      createdAt: new Date().toISOString(),
      data: {
        messageId: 'msg_test_000000000000',
        to: '+10000000000',
        status: 'SENT',
        segments: 1,
        timestamp: new Date().toISOString(),
      },
    };

    const delivered = await this.webhookService.dispatch(tenant.webhookUrl, tenant.webhookSecret, testEvent);

    return res.json({
      success: true,
      data: {
        webhookUrl: tenant.webhookUrl,
        delivered,
        testEvent,
      },
    });
  };
}
