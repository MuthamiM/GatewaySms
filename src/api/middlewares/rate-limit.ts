import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../../shared/errors/app-error.js';

// Simple in-memory sliding window rate limiter per tenant
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.tenant?.id || req.ip || 'anonymous';
    const limit = req.tenant?.rateLimitPerMinute || 60;
    const now = Date.now();

    const record = requestCounts.get(tenantId);

    if (!record || now > record.resetTime) {
      requestCounts.set(tenantId, { count: 1, resetTime: now + windowMs });
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', limit - 1);
      return next();
    }

    if (record.count >= limit) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return next(new RateLimitError(`Rate limit exceeded (${limit} req/min). Retry in ${retryAfter} seconds.`));
    }

    record.count++;
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - record.count));
    next();
  };
}
