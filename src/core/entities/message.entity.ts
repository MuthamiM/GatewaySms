export type MessageStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED';

export interface Message {
  id: string; // msg_xxxx
  tenantId: string;
  to: string; // Recipient E.164
  from?: string; // Originator or assigned device phone number
  text: string;
  encoding: 'GSM-7' | 'UCS-2';
  segments: number;
  creditsDeducted: number;
  status: MessageStatus;
  deviceId?: string; // Assigned Android gateway device
  simIndex?: number; // Targeted SIM slot (0 or 1)
  gatewayMessageId?: string; // ID assigned by the downstream SMS Gateway
  errorCode?: string;
  errorMessage?: string;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
