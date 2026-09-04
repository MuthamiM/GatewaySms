import { AndroidDevice } from '../entities/device.entity.js';
import { IDeviceRepository } from '../ports/repository.ports.js';
import { logger } from '../../shared/logger/index.js';

export class DeviceRouterService {
  private roundRobinIndex = 0;

  constructor(private deviceRepo: IDeviceRepository) {}

  /**
   * Selects the optimal Android device and SIM slot for an outgoing message.
   * Balances load across available devices and SIM cards to avoid carrier throttling.
   */
  public async selectDevice(tenantId?: string, preferredDeviceId?: string): Promise<{ device: AndroidDevice; simSlot: number } | null> {
    const devices = await this.deviceRepo.findOnlineDevices(tenantId);

    if (devices.length === 0) {
      logger.warn({ tenantId }, 'No online Android devices available in device pool');
      return null;
    }

    // If tenant requested a specific device
    if (preferredDeviceId) {
      const match = devices.find((d) => d.id === preferredDeviceId);
      if (match) {
        return { device: match, simSlot: 0 };
      }
    }

    // Prioritize devices with healthy battery levels (> 15%)
    const healthyDevices = devices.filter((d) => d.batteryPercentage > 15 || d.isCharging);
    const candidatePool = healthyDevices.length > 0 ? healthyDevices : devices;

    // Round-Robin selection
    const selectedDevice = candidatePool[this.roundRobinIndex % candidatePool.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % candidatePool.length;

    // Choose SIM slot (default to slot 0 or slot that is READY)
    let selectedSlot = 0;
    if (selectedDevice.simSlots && selectedDevice.simSlots.length > 0) {
      const readySlot = selectedDevice.simSlots.find((s) => s.status === 'READY');
      selectedSlot = readySlot ? readySlot.slotIndex : selectedDevice.simSlots[0].slotIndex;
    }

    return {
      device: selectedDevice,
      simSlot: selectedSlot,
    };
  }
}
