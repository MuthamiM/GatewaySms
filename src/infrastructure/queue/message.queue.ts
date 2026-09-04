import { Queue } from 'bullmq';
import { IMessageQueueProducer } from '../../core/services/message.service.js';
import { config } from '../../config/index.js';
import { logger } from '../../shared/logger/index.js';

export class MessageQueueService implements IMessageQueueProducer {
  private queue?: Queue;
  private memoryQueue: string[] = [];
  private onMemoryJobCallback?: (messageId: string) => Promise<void>;
  private isRedisAvailable = false;

  constructor() {
    this.initQueue();
  }

  private async initQueue() {
    try {
      this.queue = new Queue('sms-dispatch', {
        connection: {
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword || undefined,
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      });

      // Test Redis connection
      await this.queue.waitUntilReady();
      this.isRedisAvailable = true;
      logger.info('Connected to Redis BullMQ for message queueing');
    } catch (err) {
      this.isRedisAvailable = false;
      logger.warn('Redis not available. Using high-performance in-memory async fallback queue');
    }
  }

  public registerMemoryWorker(callback: (messageId: string) => Promise<void>) {
    this.onMemoryJobCallback = callback;
  }

  public async enqueueMessage(messageId: string): Promise<void> {
    if (this.isRedisAvailable && this.queue) {
      try {
        await this.queue.add('dispatch-sms', { messageId }, { jobId: messageId });
        logger.info({ messageId }, 'Enqueued message in Redis BullMQ');
        return;
      } catch (err) {
        logger.warn({ messageId }, 'Falling back to in-memory queue dispatch');
      }
    }

    // In-memory queue fallback
    this.memoryQueue.push(messageId);
    setImmediate(async () => {
      const nextId = this.memoryQueue.shift();
      if (nextId && this.onMemoryJobCallback) {
        try {
          await this.onMemoryJobCallback(nextId);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error({ messageId: nextId, error: msg }, 'In-memory job processing failed');
        }
      }
    });
  }

  public async close() {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
