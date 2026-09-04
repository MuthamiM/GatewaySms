import { Request, Response } from 'express';
import { IDeviceRepository } from '../../../core/ports/repository.ports.js';
import { ISmsGatewayDriver } from '../../../core/ports/gateway.port.js';

export class DevicesController {
  constructor(
    private deviceRepo: IDeviceRepository,
    private gatewayDriver: ISmsGatewayDriver
  ) {}

  public listDevices = async (_req: Request, res: Response) => {
    const devices = await this.deviceRepo.findAll();

    return res.json({
      success: true,
      data: devices.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        batteryPercentage: d.batteryPercentage,
        isCharging: d.isCharging,
        appVersion: d.appVersion,
        simSlots: d.simSlots,
        lastHeartbeat: d.lastHeartbeat.toISOString(),
      })),
    });
  };

  public syncDevices = async (_req: Request, res: Response) => {
    const gatewayDevices = await this.gatewayDriver.getDevices();

    for (const device of gatewayDevices) {
      await this.deviceRepo.upsert(device);
    }

    const all = await this.deviceRepo.findAll();

    return res.json({
      success: true,
      message: `Synced ${gatewayDevices.length} device(s) from ${this.gatewayDriver.name}`,
      data: all.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        batteryPercentage: d.batteryPercentage,
        isCharging: d.isCharging,
        simSlots: d.simSlots,
        lastHeartbeat: d.lastHeartbeat.toISOString(),
      })),
    });
  };

  public registerHeartbeat = async (req: Request, res: Response) => {
    const deviceId = req.params.id;
    await this.deviceRepo.updateHeartbeat(deviceId);
    return res.json({ success: true, message: 'Heartbeat acknowledged' });
  };
}
