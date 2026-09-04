import axios, { AxiosInstance } from 'axios';
import { ISmsGatewayDriver, GatewaySendParams, GatewaySendResult } from '../../core/ports/gateway.port.js';
import { AndroidDevice } from '../../core/entities/device.entity.js';
import { config } from '../../config/index.js';
import { logger } from '../../shared/logger/index.js';

export class SmsGateServerAdapter implements ISmsGatewayDriver {
  public readonly name = 'SMSGatePrivateServer';
  private client: AxiosInstance;

  constructor() {
    const baseURL = config.smsgateServerUrl.replace(/\/+$/, '');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.smsgatePrivateToken) {
      headers['X-Private-Token'] = config.smsgatePrivateToken;
    }

    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers,
      auth:
        config.smsgateApiUser && config.smsgateApiPassword
          ? {
              username: config.smsgateApiUser,
              password: config.smsgateApiPassword,
            }
          : undefined,
    });
  }

  public async sendSms(params: GatewaySendParams): Promise<GatewaySendResult> {
    try {
      // Determine API path: private server requires /api/3rdparty/v1/messages
      const endpoint = '/api/3rdparty/v1/messages';

      const payload = {
        phoneNumbers: [params.to],
        textMessage: {
          text: params.text,
        },
        simNumber: params.simSlot !== undefined ? params.simSlot + 1 : undefined, // SMSGate uses 1-based SIM index
      };

      logger.info(
        { endpoint, to: params.to, simSlot: params.simSlot },
        'Dispatching to SMS Gateway for Android private server'
      );

      const response = await this.client.post(endpoint, payload);

      const data = response.data;
      const messageId = Array.isArray(data) && data[0]?.id ? data[0].id : data?.id || 'smsgate_accepted';

      return {
        success: true,
        gatewayMessageId: messageId,
        status: 'SENT',
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ error: errorMsg, to: params.to }, 'Failed to dispatch via SMSGate server');
      return {
        success: false,
        gatewayMessageId: '',
        status: 'FAILED',
        error: errorMsg,
      };
    }
  }

  public async getDevices(): Promise<AndroidDevice[]> {
    try {
      const response = await this.client.get('/api/3rdparty/v1/devices');
      if (Array.isArray(response.data)) {
        return response.data.map((d: any) => ({
          id: d.id || d.name,
          name: d.name || 'Android Device',
          status: d.online ? 'ONLINE' : 'OFFLINE',
          batteryPercentage: d.battery || 100,
          isCharging: d.charging ?? true,
          appVersion: d.version || '1.74.0',
          simSlots: (d.sims || []).map((s: any, idx: number) => ({
            slotIndex: idx,
            carrier: s.carrier || 'Cellular Carrier',
            phoneNumber: s.number,
            status: 'READY',
          })),
          lastHeartbeat: new Date(d.updatedAt || Date.now()),
          createdAt: new Date(d.createdAt || Date.now()),
        }));
      }
      return [];
    } catch (err: unknown) {
      logger.warn('Could not fetch devices from SMSGate server, using fallback');
      return [];
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const res = await this.client.get('/health');
      return res.status === 200;
    } catch {
      return false;
    }
  }
}
