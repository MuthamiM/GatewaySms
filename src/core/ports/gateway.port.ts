import { AndroidDevice } from '../entities/device.entity.js';

export interface GatewaySendParams {
  to: string;
  text: string;
  simSlot?: number;
  deviceId?: string;
  messageId: string;
}

export interface GatewaySendResult {
  success: boolean;
  gatewayMessageId: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  error?: string;
}

export interface ISmsGatewayDriver {
  readonly name: string;
  sendSms(params: GatewaySendParams): Promise<GatewaySendResult>;
  getDevices(): Promise<AndroidDevice[]>;
  healthCheck(): Promise<boolean>;
}
