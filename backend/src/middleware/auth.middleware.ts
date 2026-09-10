import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { supabaseAdmin, supabaseClient, isSupabaseConfigured } from '../config/supabase';
import { usersRepository } from '../modules/users/users.repository';
import { UserProfile } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

// High-performance in-memory cache for resolved auth sessions (60s TTL)
interface CachedAuthSession {
  user: UserProfile;
  cachedAt: number;
}

const AUTH_CACHE_TTL_MS = 60 * 1000; // 60s TTL
const authSessionCache = new Map<string, CachedAuthSession>();

export const invalidateAuthCache = (userIdOrToken?: string) => {
  if (!userIdOrToken) {
    authSessionCache.clear();
    return;
  }
  for (const [token, session] of authSessionCache.entries()) {
    if (token === userIdOrToken || session.user.id === userIdOrToken) {
      authSessionCache.delete(token);
    }
  }
};

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or malformed authorization token',
        },
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Fast-path: Check in-memory auth session cache
    const cached = authSessionCache.get(token);
    if (cached && Date.now() - cached.cachedAt < AUTH_CACHE_TTL_MS) {
      if (cached.user.status !== 'active') {
        authSessionCache.delete(token);
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: `Your account is currently ${cached.user.status}. Please contact administration.`,
          },
        });
        return;
      }
      req.user = cached.user;
      next();
      return;
    }

    let userId: string | null = null;
    let userEmail: string | null = null;

    // 1. Instant local JWT verification (avoids outbound HTTP network latency on every request)
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        id?: string;
        sub?: string;
        email?: string;
      };
      userId = decoded.id || decoded.sub || null;
      userEmail = decoded.email || null;
    } catch (jwtErr) {
      // 2. Fallback: Check if token was issued directly by Supabase Auth
      const client = supabaseAdmin || supabaseClient;
      if (isSupabaseConfigured() && client) {
        try {
          const { data, error } = await client.auth.getUser(token);
          if (!error && data?.user) {
            userId = data.user.id;
            userEmail = data.user.email || null;
          }
        } catch (err) {
          // Supabase token verification failed
        }
      }
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Session has expired or token is invalid. Please log in again.',
        },
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Could not resolve user from token',
        },
      });
      return;
    }

    // Fetch user profile from database/store
    let profile = await usersRepository.findById(userId);

    // If profile not yet created in public.profiles, create it on-the-fly
    if (!profile && userEmail) {
      profile = await usersRepository.createProfile({
        id: userId,
        full_name: userEmail.split('@')[0],
        email: userEmail,
        status: 'active',
      });
    }

    if (!profile) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User profile does not exist in the system',
        },
      });
      return;
    }

    if (profile.status !== 'active') {
      res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: `Your account is currently ${profile.status}. Please contact the DIU Investment Club administration.`,
        },
      });
      return;
    }

    // Store in fast auth cache for 60s
    authSessionCache.set(token, { user: profile, cachedAt: Date.now() });

    req.user = profile;
    next();
  } catch (error) {
    console.error('Authentication Middleware Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected authentication error occurred',
      },
    });
  }
};

export { requireRole, requirePermission } from './rbac.middleware';
