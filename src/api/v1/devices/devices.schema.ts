import { z } from 'zod';

export const registerDeviceSchema = {
  body: z.object({
    id: z.string().min(1, 'Device ID is required'),
    name: z.string().min(1, 'Device name is required'),
    batteryPercentage: z.number().min(0).max(100).default(100),
    isCharging: z.boolean().default(true),
    appVersion: z.string().default('1.74.0'),
    simSlots: z
      .array(
        z.object({
          slotIndex: z.number().int().min(0).max(1),
          carrier: z.string(),
          phoneNumber: z.string().optional(),
          status: z.enum(['READY', 'BUSY', 'ERROR']).default('READY'),
        })
      )
      .default([]),
  }),
};
