import { z } from 'zod';

export const createMessageSchema = {
  body: z.object({
    to: z
      .string()
      .min(7, 'Phone number too short')
      .max(20, 'Phone number too long')
      .describe('Recipient phone number in E.164 format (+1234567890)'),
    text: z
      .string()
      .min(1, 'Message text cannot be empty')
      .max(1600, 'Message cannot exceed 1600 characters')
      .describe('SMS content'),
    from: z.string().optional().describe('Custom Sender ID or phone number'),
    preferredDeviceId: z.string().optional().describe('Direct to a specific Android gateway device ID'),
    simIndex: z.number().int().min(0).max(1).optional().describe('SIM card slot index (0 or 1)'),
    scheduledAt: z.string().datetime().optional().describe('ISO-8601 timestamp for scheduled delivery'),
  }),
};

export const getMessageSchema = {
  params: z.object({
    id: z.string().min(1, 'Message ID is required'),
  }),
};

export const listMessagesSchema = {
  query: z.object({
    limit: z.coerce.number().min(1).max(100).default(50),
    offset: z.coerce.number().min(0).default(0),
  }),
};
