import { v4 as uuidv4 } from 'uuid';
import { ISmsGatewayDriver, GatewaySendParams, GatewaySendResult } from '../../core/ports/gateway.port.js';
import { AndroidDevice } from '../../core/entities/device.entity.js';
import { logger } from '../../shared/logger/index.js';

export class MockGatewayAdapter implements ISmsGatewayDriver {
  public readonly name = 'MockAndroidGateway';

  private mockDevices: AndroidDevice[] = [
    {
      id: 'dev_mock_pixel8_pro',
      name: 'Google Pixel 8 Pro (Simulated Android Gateway)',
      status: 'ONLINE',
      batteryPercentage: 94,
      isCharging: true,
      appVersion: '1.74.0',
      simSlots: [
        {
          slotIndex: 0,
          carrier: 'T-Mobile US',
          phoneNumber: '+15551234567',
          countryCode: 'US',
          status: 'READY',
        },
        {
          slotIndex: 1,
          carrier: 'Verizon',
          phoneNumber: '+15559876543',
          countryCode: 'US',
          status: 'READY',
        },
      ],
      lastHeartbeat: new Date(),
      createdAt: new Date(),
    },
  ];

  public async sendSms(params: GatewaySendParams): Promise<GatewaySendResult> {
    logger.info(
      {
        driver: this.name,
        messageId: params.messageId,
        to: params.to,
        text: params.text,
        simSlot: params.simSlot ?? 0,
      },
      'Mock Gateway: Simulating GSM cellular dispatch'
    );

    // Simulate GSM network transmission latency
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      gatewayMessageId: `gw_mock_${uuidv4().substring(0, 8)}`,
      status: 'SENT',
    };
  }

  public async getDevices(): Promise<AndroidDevice[]> {
    return this.mockDevices;
  }

  public async healthCheck(): Promise<boolean> {
    return true;
  }
}
