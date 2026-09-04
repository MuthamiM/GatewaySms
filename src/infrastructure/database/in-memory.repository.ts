import { Message } from '../../core/entities/message.entity.js';
import { AndroidDevice } from '../../core/entities/device.entity.js';
import { Tenant } from '../../core/entities/tenant.entity.js';
import { IMessageRepository, IDeviceRepository, ITenantRepository } from '../../core/ports/repository.ports.js';

/**
 * Separate concrete classes to avoid TypeScript duplicate-method conflicts
 * when a single class implements 3 interfaces that each define findById/update.
 */
export class MessageRepository implements IMessageRepository {
  private messages = new Map<string, Message>();

  public async create(message: Message): Promise<Message> {
    this.messages.set(message.id, { ...message });
    return message;
  }

  public async findById(id: string): Promise<Message | null> {
    const msg = this.messages.get(id);
    return msg ? { ...msg } : null;
  }

  public async findByTenantId(tenantId: string, limit = 50, offset = 0): Promise<Message[]> {
    const all = Array.from(this.messages.values())
      .filter((m) => m.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return all.slice(offset, offset + limit);
  }

  public async update(id: string, updates: Partial<Message>): Promise<Message | null> {
    const existing = this.messages.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.messages.set(id, updated);
    return updated;
  }
}

export class DeviceRepository implements IDeviceRepository {
  private devices = new Map<string, AndroidDevice>();

  constructor() {
    this.seedDevice();
  }

  private seedDevice() {
    const demoDevice: AndroidDevice = {
      id: 'dev_mock_pixel8_pro',
      name: 'Google Pixel 8 Pro (Gateway Rack)',
      status: 'ONLINE',
      batteryPercentage: 98,
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
          carrier: 'AT&T',
          phoneNumber: '+15559876543',
          countryCode: 'US',
          status: 'READY',
        },
      ],
      lastHeartbeat: new Date(),
      createdAt: new Date(),
    };
    this.devices.set(demoDevice.id, demoDevice);
  }

  public async upsert(device: AndroidDevice): Promise<AndroidDevice> {
    this.devices.set(device.id, { ...device });
    return device;
  }

  public async findById(id: string): Promise<AndroidDevice | null> {
    const dev = this.devices.get(id);
    return dev ? { ...dev } : null;
  }

  public async findAll(): Promise<AndroidDevice[]> {
    return Array.from(this.devices.values());
  }

  public async findOnlineDevices(tenantId?: string): Promise<AndroidDevice[]> {
    return Array.from(this.devices.values()).filter((d) => {
      const isOnline = d.status === 'ONLINE';
      const matchesTenant = !d.tenantId || d.tenantId === tenantId;
      return isOnline && matchesTenant;
    });
  }

  public async updateHeartbeat(id: string): Promise<void> {
    const dev = this.devices.get(id);
    if (dev) {
      dev.lastHeartbeat = new Date();
      dev.status = 'ONLINE';
      this.devices.set(id, dev);
    }
  }
}

export class TenantRepository implements ITenantRepository {
  private tenants = new Map<string, Tenant>();

  constructor() {
    this.seedTenant();
  }

  private seedTenant() {
    const demoTenant: Tenant = {
      id: 'tenant_demo_001',
      name: 'Acme SaaS Production',
      apiKey: 'ak_live_demo123',
      credits: 1000,
      rateLimitPerMinute: 120,
      status: 'ACTIVE',
      webhookUrl: 'https://webhook.site/demo-endpoint',
      webhookSecret: 'whsec_demo_secret_2026',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tenants.set(demoTenant.id, demoTenant);
  }

  public async findByApiKey(apiKey: string): Promise<Tenant | null> {
    for (const tenant of this.tenants.values()) {
      if (tenant.apiKey === apiKey) {
        return { ...tenant };
      }
    }
    return null;
  }

  public async findById(id: string): Promise<Tenant | null> {
    const t = this.tenants.get(id);
    return t ? { ...t } : null;
  }

  public async deductCredits(tenantId: string, amount: number): Promise<boolean> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;
    if (tenant.credits < amount) return false;
    tenant.credits -= amount;
    tenant.updatedAt = new Date();
    this.tenants.set(tenantId, tenant);
    return true;
  }

  public async refundCredits(tenantId: string, amount: number): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (tenant) {
      tenant.credits += amount;
      tenant.updatedAt = new Date();
      this.tenants.set(tenantId, tenant);
    }
  }

  public async update(id: string, updates: Partial<Tenant>): Promise<Tenant | null> {
    const t = this.tenants.get(id);
    if (!t) return null;
    const updated = { ...t, ...updates, updatedAt: new Date() };
    this.tenants.set(id, updated);
    return updated;
  }
}
