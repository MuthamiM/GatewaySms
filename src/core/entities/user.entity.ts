export interface User {
  id: string;
  email: string;
  passwordHash: string;
  phoneNumber: string; // E.164 format, e.g., "+254748329410"
  role: 'ADMIN' | 'USER';
  tenantId: string;
  activeOtp?: {
    code: string;
    expiresAt: Date;
    attempts: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
