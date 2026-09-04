import { Request, Response, NextFunction } from 'express';
import { ITenantRepository } from '../../core/ports/repository.ports.js';
import { Tenant } from '../../core/entities/tenant.entity.js';
import { UnauthorizedError } from '../../shared/errors/app-error.js';

declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
    }
  }
}

export function createAuthMiddleware(tenantRepo: ITenantRepository) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers['authorization'];
      const apiKeyHeader = req.headers['x-api-key'];

      let token: string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      } else if (typeof apiKeyHeader === 'string') {
        token = apiKeyHeader.trim();
      }

      if (!token) {
        throw new UnauthorizedError('Missing API key. Provide "Authorization: Bearer <api_key>" or "X-API-Key" header.');
      }

      const tenant = await tenantRepo.findByApiKey(token);
      if (!tenant) {
        throw new UnauthorizedError('Invalid API key provided.');
      }

      if (tenant.status !== 'ACTIVE') {
        throw new UnauthorizedError('Tenant account is suspended.');
      }

      req.tenant = tenant;
      next();
    } catch (err) {
      next(err);
    }
  };
}
