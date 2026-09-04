import { Request, Response } from 'express';
import { AuthService } from '../../../core/services/auth.service.js';
import { ITenantRepository } from '../../../core/ports/repository.ports.js';
import { ValidationError } from '../../../shared/errors/app-error.js';

export class AuthController {
  constructor(
    private authService: AuthService,
    private tenantRepo: ITenantRepository
  ) {}

  public login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const result = await this.authService.initiateLogin(email, password);

    return res.json({
      success: true,
      message: `Verification code sent via SMS to ${result.phoneMasked}`,
      data: result,
    });
  };

  public verifyOtp = async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new ValidationError('Email and OTP code are required');
    }

    const authResult = await this.authService.verifyOtp(email, otp);
    const tenant = await this.tenantRepo.findById(authResult.user.tenantId);

    return res.json({
      success: true,
      message: 'Authentication successful',
      data: {
        ...authResult,
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              apiKey: tenant.apiKey,
              credits: tenant.credits,
            }
          : undefined,
      },
    });
  };
}
