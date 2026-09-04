import { Worker, Job } from 'bullmq';
import { IMessageRepository, ITenantRepository } from '../../core/ports/repository.ports.js';
import { ISmsGatewayDriver } from '../../core/ports/gateway.port.js';
import { DeviceRouterService } from '../../core/services/router.service.js';
import { WebhookService } from '../../core/services/webhook.service.js';
import { MessageQueueService } from './message.queue.js';
import { config } from '../../config/index.js';
import { logger } from '../../shared/logger/index.js';

export class MessageWorkerService {
  private worker?: Worker;

  constructor(
    private messageRepo: IMessageRepository,
    private tenantRepo: ITenantRepository,
    private gatewayDriver: ISmsGatewayDriver,
    private routerService: DeviceRouterService,
    private webhookService: WebhookService,
    private queueService: MessageQueueService
  ) {
    this.init();
  }

  private init() {
    // 1. Register for in-memory queue fallback
    this.queueService.registerMemoryWorker(async (messageId) => {
      await this.processMessage(messageId);
    });

    // 2. Register BullMQ Worker for Redis
    try {
      this.worker = new Worker(
        'sms-dispatch',
        async (job: Job<{ messageId: string }>) => {
          await this.processMessage(job.data.messageId);
        },
        {
          connection: {
            host: config.redisHost,
            port: config.redisPort,
            password: config.redisPassword || undefined,
            maxRetriesPerRequest: 1,
          },
          concurrency: 5,
        }
      );

      this.worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, error: err.message }, 'BullMQ Worker Job Failed');
      });
    } catch {
      logger.info('BullMQ worker deferred; running in-memory queue processor');
    }
  }

  public async processMessage(messageId: string): Promise<void> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      logger.error({ messageId }, 'Worker could not find message in database');
      return;
    }

    // Update status to PROCESSING
    await this.messageRepo.update(messageId, { status: 'PROCESSING' });

    // 1. Select device and SIM slot from pool
    const route = await this.routerService.selectDevice(message.tenantId, message.deviceId);
    if (!route) {
      const errorMsg = 'No active Android gateway devices online in pool to deliver message';
      logger.error({ messageId }, errorMsg);

      await this.messageRepo.update(messageId, {
        status: 'FAILED',
        errorCode: 'NO_ONLINE_DEVICES',
        errorMessage: errorMsg,
      });

      // Refund deducted credits
      await this.tenantRepo.refundCredits(message.tenantId, message.creditsDeducted);

      // Notify tenant
      await this.notifyTenant(message.tenantId, {
        id: `evt_${Date.now()}`,
        event: 'message.failed',
        createdAt: new Date().toISOString(),
        data: {
          messageId: message.id,
          to: message.to,
          status: 'FAILED',
          segments: message.segments,
          errorCode: 'NO_ONLINE_DEVICES',
          timestamp: new Date().toISOString(),
        },
      });

      return;
    }

    // 2. Dispatch via Gateway Driver
    logger.info(
      { messageId, deviceId: route.device.id, simSlot: route.simSlot },
      'Dispatching SMS through Android Gateway'
    );

    const result = await this.gatewayDriver.sendSms({
      messageId: message.id,
      to: message.to,
      text: message.text,
      deviceId: route.device.id,
      simSlot: route.simSlot,
    });

    if (result.success) {
      const sentAt = new Date();
      await this.messageRepo.update(messageId, {
        status: 'SENT',
        deviceId: route.device.id,
        simIndex: route.simSlot,
        gatewayMessageId: result.gatewayMessageId,
        sentAt,
      });

      logger.info({ messageId, gatewayMessageId: result.gatewayMessageId }, 'SMS successfully dispatched to cellular network');

      await this.notifyTenant(message.tenantId, {
        id: `evt_${Date.now()}`,
        event: 'message.sent',
        createdAt: sentAt.toISOString(),
        data: {
          messageId: message.id,
          to: message.to,
          status: 'SENT',
          segments: message.segments,
          timestamp: sentAt.toISOString(),
        },
      });
    } else {
      await this.messageRepo.update(messageId, {
        status: 'FAILED',
        errorCode: 'GATEWAY_DELIVERY_FAILURE',
        errorMessage: result.error || 'Failed to dispatch via gateway driver',
      });

      // Refund credits
      await this.tenantRepo.refundCredits(message.tenantId, message.creditsDeducted);

      await this.notifyTenant(message.tenantId, {
        id: `evt_${Date.now()}`,
        event: 'message.failed',
        createdAt: new Date().toISOString(),
        data: {
          messageId: message.id,
          to: message.to,
          status: 'FAILED',
          segments: message.segments,
          errorCode: 'GATEWAY_DELIVERY_FAILURE',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  private async notifyTenant(tenantId: string, event: any) {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (tenant?.webhookUrl && tenant?.webhookSecret) {
      await this.webhookService.dispatch(tenant.webhookUrl, tenant.webhookSecret, event);
    }
  }

  public async close() {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
