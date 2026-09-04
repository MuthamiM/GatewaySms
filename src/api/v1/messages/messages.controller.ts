import { Request, Response } from 'express';
import { MessageService } from '../../../core/services/message.service.js';

export class MessagesController {
  constructor(private messageService: MessageService) {}

  public sendMessage = async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const { to, text, from, preferredDeviceId, simIndex, scheduledAt } = req.body;

    const message = await this.messageService.createMessage({
      tenantId: tenant.id,
      to,
      text,
      from,
      preferredDeviceId,
      simIndex,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    });

    return res.status(202).json({
      success: true,
      message: 'Message enqueued for delivery',
      data: {
        id: message.id,
        to: message.to,
        from: message.from,
        text: message.text,
        encoding: message.encoding,
        segments: message.segments,
        creditsDeducted: message.creditsDeducted,
        status: message.status,
        createdAt: message.createdAt.toISOString(),
      },
    });
  };

  public getMessage = async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const messageId = req.params.id;

    const message = await this.messageService.getMessageById(tenant.id, messageId);

    return res.json({
      success: true,
      data: {
        id: message.id,
        to: message.to,
        from: message.from,
        text: message.text,
        encoding: message.encoding,
        segments: message.segments,
        status: message.status,
        deviceId: message.deviceId,
        simIndex: message.simIndex,
        gatewayMessageId: message.gatewayMessageId,
        sentAt: message.sentAt?.toISOString(),
        deliveredAt: message.deliveredAt?.toISOString(),
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        createdAt: message.createdAt.toISOString(),
      },
    });
  };

  public listMessages = async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const messages = await this.messageService.listMessages(tenant.id, limit, offset);

    return res.json({
      success: true,
      data: messages.map((m) => ({
        id: m.id,
        to: m.to,
        from: m.from,
        text: m.text,
        encoding: m.encoding,
        segments: m.segments,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
      })),
      pagination: {
        limit,
        offset,
        count: messages.length,
      },
    });
  };
}
