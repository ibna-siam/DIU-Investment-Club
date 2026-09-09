import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Super Admin always passes
    const userRoles = user.roles || [];
    const isSuperAdmin = userRoles.some((r) => r.slug === 'SUPER_ADMIN');
    if (isSuperAdmin) {
      return next();
    }

    const hasAllowedRole = userRoles.some((r) => allowedRoles.includes(r.slug));
    if (!hasAllowedRole) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have the required role to access this resource',
          requiredRoles: allowedRoles,
        },
      });
      return;
    }

    next();
  };
};

export const requirePermission = (permOrModule: string, actionArg?: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const userRoles = user.roles || [];
    if (userRoles.some((r) => r.slug === 'SUPER_ADMIN')) {
      return next();
    }

    let moduleName: string;
    let actionName: string;
    let targetPerm: string;

    if (actionArg) {
      moduleName = permOrModule;
      actionName = actionArg;
      targetPerm = `${moduleName}.${actionName}`;
    } else {
      targetPerm = permOrModule;
      const parts = permOrModule.split('.');
      moduleName = parts[0];
      actionName = parts[1] || 'access';
    }

    const permissions = user.permissions || [];
    let hasPermission =
      permissions.includes('*') ||
      permissions.includes(targetPerm) ||
      permissions.includes(`${moduleName}.manage`) ||
      permissions.includes(`${moduleName}.admin`);

    // Normalize module singular/plural and key aliases (e.g. expense <-> expenses)
    if (!hasPermission) {
      const alternates: string[] = [];
      if (moduleName.endsWith('s')) {
        alternates.push(moduleName.slice(0, -1));
      } else {
        alternates.push(`${moduleName}s`);
      }
      if (moduleName === 'account' || moduleName === 'accounts') {
        alternates.push('financial_accounts');
      }
      if (moduleName === 'financial_accounts') {
        alternates.push('accounts', 'account');
      }

      for (const alt of alternates) {
        if (
          permissions.includes(`${alt}.${actionName}`) ||
          permissions.includes(`${alt}.manage`) ||
          permissions.includes(`${alt}.admin`)
        ) {
          hasPermission = true;
          break;
        }
      }
    }

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `You do not have permission to ${actionName} in ${moduleName.replace(/_/g, ' ')}`,
          requiredPermission: targetPerm,
        },
      });
      return;
    }

    next();
  };
};
