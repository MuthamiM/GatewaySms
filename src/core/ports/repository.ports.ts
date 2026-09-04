import { Message } from '../entities/message.entity.js';
import { AndroidDevice } from '../entities/device.entity.js';
import { Tenant } from '../entities/tenant.entity.js';

export interface IMessageRepository {
  create(message: Message): Promise<Message>;
  findById(id: string): Promise<Message | null>;
  findByTenantId(tenantId: string, limit?: number, offset?: number): Promise<Message[]>;
  update(id: string, updates: Partial<Message>): Promise<Message | null>;
}

export interface IDeviceRepository {
  upsert(device: AndroidDevice): Promise<AndroidDevice>;
  findById(id: string): Promise<AndroidDevice | null>;
  findAll(): Promise<AndroidDevice[]>;
  findOnlineDevices(tenantId?: string): Promise<AndroidDevice[]>;
  updateHeartbeat(id: string): Promise<void>;
}

export interface ITenantRepository {
  findByApiKey(apiKey: string): Promise<Tenant | null>;
  findById(id: string): Promise<Tenant | null>;
  deductCredits(tenantId: string, amount: number): Promise<boolean>;
  refundCredits(tenantId: string, amount: number): Promise<void>;
  update(id: string, updates: Partial<Tenant>): Promise<Tenant | null>;
}
