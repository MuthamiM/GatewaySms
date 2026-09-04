import crypto from 'crypto';
import { User } from '../entities/user.entity.js';
import { MessageService } from './message.service.js';
import { UnauthorizedError, ValidationError } from '../../shared/errors/app-error.js';
import { logger } from '../../shared/logger/index.js';

export interface LoginResult {
  requiresOtp: true;
  phoneMasked: string;
  expiresInSeconds: number;
  // Included in development/testing mode so user can see it right away if phone is not yet plugged in
  previewOtp?: string;
}

export interface VerifyOtpResult {
  token: string;
  user: {
    id: string;
    email: string;
    phoneNumber: string;
    tenantId: string;
    role: string;
  };
}

export class AuthService {
  private users = new Map<string, User>();

  constructor(private messageService: MessageService) {
    this.seedUsers();
  }

  private seedUsers() {
    // Primary account requested by user
    const primaryUser: User = {
      id: 'usr_musa_mwange',
      email: 'musamwange2@gmail.com',
      passwordHash: '23748124', // Stored password
      phoneNumber: '+254748329410', // 0748329410 normalized to Kenyan E.164
      role: 'ADMIN',
      tenantId: 'tenant_demo_001',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(primaryUser.email.toLowerCase(), primaryUser);
  }

  public async initiateLogin(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.users.get(normalizedEmail);

    if (!user || user.passwordHash !== password) {
      throw new UnauthorizedError('Invalid email or password. Please check your credentials.');
    }

    // Generate secure 6-digit OTP code
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.activeOtp = {
      code: otpCode,
      expiresAt,
      attempts: 0,
    };
    user.updatedAt = new Date();
    this.users.set(normalizedEmail, user);

    logger.info(
      { email: normalizedEmail, phone: user.phoneNumber, otp: otpCode },
      'Generated login OTP code'
    );

    // Send the OTP via the SMS Gateway
    const smsText = `Your SMS Gateway verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code.`;

    try {
      await this.messageService.createMessage({
        tenantId: user.tenantId,
        to: user.phoneNumber,
        text: smsText,
        from: 'SmsGateAuth',
      });
      logger.info({ to: user.phoneNumber }, 'Dispatched OTP SMS via SMS Gateway');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ error: msg }, 'SMS dispatch warning (OTP recorded in session)');
    }

    // Mask phone number for display: +254748329410 -> +254 748 *** 410
    const rawPhone = user.phoneNumber;
    const masked = rawPhone.length > 7
      ? `${rawPhone.substring(0, rawPhone.length - 6)}***${rawPhone.substring(rawPhone.length - 3)}`
      : rawPhone;

    return {
      requiresOtp: true,
      phoneMasked: masked,
      expiresInSeconds: 300,
    };
  }

  public async verifyOtp(email: string, enteredCode: string): Promise<VerifyOtpResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.users.get(normalizedEmail);

    if (!user || !user.activeOtp) {
      throw new UnauthorizedError('No active OTP session found. Please login again.');
    }

    if (new Date() > user.activeOtp.expiresAt) {
      user.activeOtp = undefined;
      throw new ValidationError('OTP code has expired. Please request a new code.');
    }

    if (user.activeOtp.code !== enteredCode.trim()) {
      user.activeOtp.attempts++;
      if (user.activeOtp.attempts >= 5) {
        user.activeOtp = undefined;
        throw new ValidationError('Too many failed attempts. OTP has been invalidated.');
      }
      throw new ValidationError('Incorrect verification code. Please try again.');
    }

    // Clear OTP on successful verification
    user.activeOtp = undefined;
    user.updatedAt = new Date();
    this.users.set(normalizedEmail, user);

    // Generate session token (e.g. Bearer token)
    const sessionToken = `sess_${crypto.randomBytes(24).toString('hex')}`;

    logger.info({ email: normalizedEmail }, 'User successfully authenticated via SMS OTP');

    return {
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        tenantId: user.tenantId,
        role: user.role,
      },
    };
  }

  public getUserByEmail(email: string): User | undefined {
    return this.users.get(email.trim().toLowerCase());
  }
}
