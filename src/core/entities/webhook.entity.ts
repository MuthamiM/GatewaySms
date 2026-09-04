export type WebhookEventType =
  | 'message.sent'
  | 'message.delivered'
  | 'message.failed'
  | 'sms.received';

export interface WebhookEvent<T = unknown> {
  id: string; // evt_xxxx
  event: WebhookEventType;
  createdAt: string;
  data: T;
}

export interface SmsReceivedPayload {
  messageId: string;
  from: string;
  to: string;
  text: string;
  receivedAt: string;
  deviceId: string;
  simSlot: number;
}

export interface MessageStatusPayload {
  messageId: string;
  to: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  segments: number;
  timestamp: string;
  errorCode?: string;
}
