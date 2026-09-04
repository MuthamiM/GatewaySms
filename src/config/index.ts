import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  port: z.coerce.number().default(4000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Redis
  redisHost: z.string().default('localhost'),
  redisPort: z.coerce.number().default(6379),
  redisPassword: z.string().optional().default(''),

  // Gateway Driver Mode: "mock" (offline test) or "smsgate" (Android SMS Gate Server)
  gatewayMode: z.enum(['mock', 'smsgate']).default('mock'),

  // SMS Gateway for Android Private Server Settings
  smsgateServerUrl: z.string().default('http://localhost:3000'),
  smsgatePrivateToken: z.string().default('secret_gateway_token_2026'),
  smsgateApiUser: z.string().optional().default(''),
  smsgateApiPassword: z.string().optional().default(''),

  // Carrier protection: Maximum SMS dispatched per minute per SIM card
  maxSmsPerSimPerMinute: z.coerce.number().default(20),
});

const parsed = configSchema.safeParse({
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  logLevel: process.env.LOG_LEVEL,
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT,
  redisPassword: process.env.REDIS_PASSWORD,
  gatewayMode: process.env.GATEWAY_MODE,
  smsgateServerUrl: process.env.SMSGATE_SERVER_URL,
  smsgatePrivateToken: process.env.SMSGATE_PRIVATE_TOKEN,
  smsgateApiUser: process.env.SMSGATE_API_USER,
  smsgateApiPassword: process.env.SMSGATE_API_PASSWORD,
  maxSmsPerSimPerMinute: process.env.MAX_SMS_PER_SIM_PER_MINUTE,
});

if (!parsed.success) {
  console.error('Invalid configuration options:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
export type AppConfig = typeof config;
