import { v4 as uuidv4 } from 'uuid';
import { Message } from '../entities/message.entity.js';
import { IMessageRepository, ITenantRepository } from '../ports/repository.ports.js';
import { analyzeSms } from '../../shared/utils/gsm.js';
import { normalizePhoneNumber } from '../../shared/utils/phone.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { logger } from '../../shared/logger/index.js';

export interface CreateMessageInput {
  tenantId: string;
  to: string;
  text: string;
  from?: string;
  preferredDeviceId?: string;
  simIndex?: number;
  scheduledAt?: Date;
}

export interface IMessageQueueProducer {
  enqueueMessage(messageId: string): Promise<void>;
}

export class MessageService {
  constructor(
    private messageRepo: IMessageRepository,
    private tenantRepo: ITenantRepository,
    private queueProducer: IMessageQueueProducer
  ) {}

  /**
   * Validates, checks credit balance, creates message entity, and enqueues for delivery.
   */
  public async createMessage(input: CreateMessageInput): Promise<Message> {
    const formattedTo = normalizePhoneNumber(input.to);

    // 1. Analyze text encoding and calculate parts
    const analysis = analyzeSms(input.text);
    const requiredCredits = Math.max(1, analysis.segments);

    // 2. Check and deduct tenant credits
    const creditDeducted = await this.tenantRepo.deductCredits(input.tenantId, requiredCredits);
    if (!creditDeducted) {
      throw new ForbiddenError(
        `Insufficient SMS credits. Required: ${requiredCredits} segment(s). Please top up your account balance.`
      );
    }

    // 3. Create message record
    const messageId = `msg_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    const now = new Date();

    const message: Message = {
      id: messageId,
      tenantId: input.tenantId,
      to: formattedTo,
      from: input.from,
      text: input.text,
      encoding: analysis.encoding,
      segments: analysis.segments,
      creditsDeducted: requiredCredits,
      status: 'QUEUED',
      deviceId: input.preferredDeviceId,
      simIndex: input.simIndex,
      scheduledAt: input.scheduledAt,
      createdAt: now,
      updatedAt: now,
    };

    const savedMessage = await this.messageRepo.create(message);
    logger.info(
      { messageId: savedMessage.id, tenantId: input.tenantId, to: formattedTo, segments: analysis.segments },
      'Message created and queued'
    );

    // 4. Push to async queue
    await this.queueProducer.enqueueMessage(savedMessage.id);

    return savedMessage;
  }

  /**
   * Retrieves message by ID scoped to tenant
   */
  public async getMessageById(tenantId: string, messageId: string): Promise<Message> {
    const message = await this.messageRepo.findById(messageId);
    if (!message || message.tenantId !== tenantId) {
      throw new NotFoundError(`Message with ID "${messageId}" not found`);
    }
    return message;
  }

  /**
   * Lists messages for tenant
   */
  public async listMessages(tenantId: string, limit = 50, offset = 0): Promise<Message[]> {
    return this.messageRepo.findByTenantId(tenantId, limit, offset);
  }
}
