import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

interface TelemetryErrorRecord {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  errorCode: string;
  message: string;
  ip: string;
}

// Bounded in-memory telemetry buffer (preserves last 50 production failures)
const MAX_TELEMETRY_LOGS = 50;
const errorRingBuffer: TelemetryErrorRecord[] = [];
const errorCountsByCategory: Record<string, number> = {
  DATABASE_FAILURE: 0,
  AUTH_FAILURE: 0,
  VALIDATION_ERROR: 0,
  SERVER_ERROR: 0,
  RATE_LIMIT_EXCEEDED: 0,
  OTHER: 0,
};

export const getTelemetryMetrics = () => {
  return {
    totalRecorded: errorRingBuffer.length,
    countsByCategory: { ...errorCountsByCategory },
    lastErrorAt: errorRingBuffer.length > 0 ? errorRingBuffer[0].timestamp : null,
  };
};

export const getRecentErrors = (limit = 20): TelemetryErrorRecord[] => {
  return errorRingBuffer.slice(0, limit);
};

// Safe redaction helper to ensure credentials, tokens, and secrets are never logged
const redactSensitiveData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'cookie', 'api_key', 'apikey', 'jwt', 'key'];
  const sanitized: any = Array.isArray(data) ? [] : {};
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED_SECURE]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const timestamp = new Date().toISOString();
  const reqPath = req.originalUrl || req.url;
  const method = req.method;
  const ip = (req.ip || req.socket.remoteAddress || '127.0.0.1').toString();

  let statusCode = err.statusCode || err.status || 500;
  let errorCode = err.code || 'SERVER_ERROR';
  let message = err.message || 'Internal Server Error';

  if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Invalid request input data';
    errorCountsByCategory.VALIDATION_ERROR++;
  } else if (
    err.name === 'MulterError' ||
    err.message?.toLowerCase().includes('file type') ||
    err.message?.toLowerCase().includes('file extension') ||
    err.message?.toLowerCase().includes('unsupported file') ||
    err.message?.toLowerCase().includes('magic bytes')
  ) {
    statusCode = 400;
    errorCode = 'FILE_VALIDATION_ERROR';
    message = err.message;
  } else if (err.code === '23505') {
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = 'A record with this identifier already exists.';
    errorCountsByCategory.DATABASE_FAILURE++;
  } else if (err.code === '23503') {
    statusCode = 409;
    errorCode = 'DEPENDENCY_CONFLICT';
    message = 'Operation cannot be completed because related records depend on this resource.';
    errorCountsByCategory.DATABASE_FAILURE++;
  } else if (err.message?.includes('database') || err.message?.includes('connection') || err.code?.startsWith?.('PGRST')) {
    errorCode = 'DATABASE_FAILURE';
    errorCountsByCategory.DATABASE_FAILURE++;
  } else if (statusCode === 401 || statusCode === 403) {
    errorCode = statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN';
    errorCountsByCategory.AUTH_FAILURE++;
  } else if (statusCode === 429) {
    errorCode = 'RATE_LIMIT_EXCEEDED';
    errorCountsByCategory.RATE_LIMIT_EXCEEDED++;
  } else if (statusCode >= 500) {
    errorCountsByCategory.SERVER_ERROR++;
  } else {
    errorCountsByCategory.OTHER++;
  }

  // Structured server-side error log (safe from leaking credentials)
  const structuredError = {
    timestamp,
    method,
    path: reqPath,
    statusCode,
    errorCode,
    message: String(message).slice(0, 300),
    ip,
    userAgent: req.headers['user-agent']?.slice(0, 100),
  };

  // Keep in bounded telemetry buffer (newest first)
  errorRingBuffer.unshift({
    id: `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...structuredError,
  });
  if (errorRingBuffer.length > MAX_TELEMETRY_LOGS) {
    errorRingBuffer.pop();
  }

  // Safe console log in server output
  if (process.env.NODE_ENV !== 'test') {
    console.error(`🚨 [API Error] ${method} ${reqPath} [${statusCode}] ${errorCode}: ${structuredError.message}`);
  }

  // Handle specific response payload formatting
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request input data',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Clean production message for 500 errors to avoid leaking database internals or secrets
  const cleanMessage =
    process.env.NODE_ENV === 'production' && statusCode >= 500
      ? 'An unexpected error occurred. Please try again later.'
      : message;

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: cleanMessage,
    },
  });
};
