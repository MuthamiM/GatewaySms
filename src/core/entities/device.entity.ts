export interface SimSlot {
  slotIndex: number; // 0 or 1 for Dual SIM phones
  carrier: string; // e.g., "Verizon", "T-Mobile", "Vodafone"
  phoneNumber?: string;
  countryCode?: string; // e.g., "US", "KE", "GB"
  status: 'READY' | 'BUSY' | 'ERROR';
}

export interface AndroidDevice {
  id: string; // Unique device identifier (or assigned token in SMS Gateway)
  name: string; // e.g. "Pixel 8 Pro - Rack 1"
  tenantId?: string; // Optional: If dedicated to a tenant, or null if part of shared pool
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  batteryPercentage: number;
  isCharging: boolean;
  appVersion: string;
  simSlots: SimSlot[];
  lastHeartbeat: Date;
  createdAt: Date;
}
