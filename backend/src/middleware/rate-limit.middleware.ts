/**
 * DIU Investment Club - API Rate Limiting & Abuse Prevention Middleware
 *
 * Implements sliding-window in-memory rate limiting to protect sensitive
 * authentication, registration, and recovery endpoints from brute-force attacks.
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

interface RateLimitOptions {
  windowMs: number; // e.g. 15 * 60 * 1000 (15 minutes)
  max: number; // e.g. 5 requests
  keyGenerator?: (req: Request) => string;
  message?: string;
  code?: string;
}

export class MemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private readonly cleanupIntervalMs = 60 * 1000;

  constructor() {
    // Periodically clean up expired entries
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        record.timestamps = record.timestamps.filter((ts) => now - ts < 3600000); // 1 hour max age
        if (record.timestamps.length === 0) {
          this.store.delete(key);
        }
      }
    }, this.cleanupIntervalMs);

    if (timer.unref) {
      timer.unref();
    }
  }

  createMiddleware(options: RateLimitOptions) {
    const {
      windowMs,
      max,
      keyGenerator = (req: Request) => {
        const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
        const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
        return email ? `${ip}:${email}` : ip;
      },
      message = 'Too many requests. Please wait a few minutes before trying again.',
      code = 'RATE_LIMIT_EXCEEDED',
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
      const key = keyGenerator(req);
      const now = Date.now();

      let record = this.store.get(key);
      if (!record) {
        record = { timestamps: [] };
        this.store.set(key, record);
      }

      // Filter timestamps within current sliding window
      record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

      if (record.timestamps.length >= max) {
        const oldestTimestamp = record.timestamps[0];
        const retryAfterSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

        res.set('Retry-After', String(Math.max(1, retryAfterSeconds)));
        res.status(429).json({
          success: false,
          error: {
            code,
            message,
            retryAfterSeconds: Math.max(1, retryAfterSeconds),
          },
        });
        return;
      }

      // Record this request timestamp
      record.timestamps.push(now);
      next();
    };
  }

  // Helper for test suites to reset limiters
  resetAll(): void {
    this.store.clear();
  }
}

export const rateLimiterManager = new MemoryRateLimiter();

/**
 * Pre-configured rate limiters for authentication endpoints:
 */

// 1. Password Reset: max 3 requests per 15 minutes per email/IP
export const passwordResetLimiter = rateLimiterManager.createMiddleware({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many password reset requests for this account. Please wait 15 minutes before requesting again.',
  code: 'PASSWORD_RESET_RATE_LIMIT',
});

// 2. Login: max 5 failed attempts per 15 minutes
export const loginLimiter = rateLimiterManager.createMiddleware({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again after 15 minutes.',
  code: 'LOGIN_RATE_LIMIT',
});

// 3. User Invitation: max 5 invitations per 10 minutes per admin
export const userInviteLimiter = rateLimiterManager.createMiddleware({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Invitation rate limit reached. Please wait a few minutes before inviting more users.',
  code: 'INVITE_RATE_LIMIT',
});

// 4. Public Digital Receipts: max 60 requests per 15 minutes per IP
export const publicReceiptLimiter = rateLimiterManager.createMiddleware({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || '127.0.0.1',
  message: 'Too many receipt access attempts. Please wait a few minutes before trying again.',
  code: 'RECEIPT_RATE_LIMIT',
});

