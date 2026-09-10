import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('API Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });

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

  if (
    err.name === 'MulterError' ||
    err.message?.toLowerCase().includes('file type') ||
    err.message?.toLowerCase().includes('file extension') ||
    err.message?.toLowerCase().includes('unsupported file') ||
    err.message?.toLowerCase().includes('magic bytes')
  ) {
    res.status(400).json({
      success: false,
      error: {
        code: 'FILE_VALIDATION_ERROR',
        message: err.message,
      },
    });
    return;
  }

  let statusCode = err.statusCode || err.status || 500;
  let errorCode = err.code || 'SERVER_ERROR';
  let message = err.message || 'Internal Server Error';

  // Handle Postgres constraint violations cleanly
  if (err.code === '23505') {
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = 'A record with this identifier already exists.';
  } else if (err.code === '23503') {
    statusCode = 409;
    errorCode = 'DEPENDENCY_CONFLICT';
    message = 'Operation cannot be completed because related records depend on this resource.';
  }

  // Map known status codes to clean codes
  if (statusCode === 401 && errorCode === 'SERVER_ERROR') errorCode = 'UNAUTHORIZED';
  if (statusCode === 403 && errorCode === 'SERVER_ERROR') errorCode = 'FORBIDDEN';
  if (statusCode === 404 && errorCode === 'SERVER_ERROR') errorCode = 'NOT_FOUND';
  if (statusCode === 409 && errorCode === 'SERVER_ERROR') errorCode = 'CONFLICT';
  if (statusCode === 422 && errorCode === 'SERVER_ERROR') errorCode = 'UNPROCESSABLE_ENTITY';
  if ([502, 503, 504].includes(statusCode) && errorCode === 'SERVER_ERROR') errorCode = 'SERVICE_UNAVAILABLE';

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
