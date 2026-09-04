export interface Tenant {
  id: string;
  name: string;
  apiKey: string; // e.g., ak_live_xxxx
  credits: number; // Balance of SMS segments available
  rateLimitPerMinute: number;
  status: 'ACTIVE' | 'SUSPENDED';
  webhookUrl?: string;
  webhookSecret?: string;
  createdAt: Date;
  updatedAt: Date;
}
