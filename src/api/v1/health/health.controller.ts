import { Request, Response } from 'express';
import { ISmsGatewayDriver } from '../../../core/ports/gateway.port.js';

export class HealthController {
  constructor(private gatewayDriver: ISmsGatewayDriver) {}

  public getHealth = async (_req: Request, res: Response) => {
    return res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  };

  public getReadiness = async (_req: Request, res: Response) => {
    const gatewayOk = await this.gatewayDriver.healthCheck();

    return res.json({
      status: gatewayOk ? 'ready' : 'degraded',
      services: {
        api: 'up',
        gatewayDriver: {
          name: this.gatewayDriver.name,
          status: gatewayOk ? 'connected' : 'unreachable',
        },
      },
    });
  };
}
