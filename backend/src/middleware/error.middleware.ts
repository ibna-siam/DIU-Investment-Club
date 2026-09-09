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

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'An unexpected error occurred. Please try again later.'
        : message,
    },
  });
};
