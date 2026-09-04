export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Invalid or missing API key', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions or depleted credits', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class ValidationError extends AppError {
  public readonly details: unknown;

  constructor(message = 'Validation error', details?: unknown, code = 'VALIDATION_ERROR') {
    super(message, 400, code);
    this.details = details;
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded. Please throttle your requests.', code = 'RATE_LIMITED') {
    super(message, 429, code);
  }
}

export class GatewayError extends AppError {
  constructor(message = 'Downstream SMS Gateway error', code = 'GATEWAY_ERROR') {
    super(message, 502, code);
  }
}
