import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { permissionsRepository } from './permissions.repository';

export class PermissionsController {
  async getAllPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const permissions = await permissionsRepository.findAll();
      res.status(200).json({
        success: true,
        data: permissions,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPermissionsGroupedByModule(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const grouped = await permissionsRepository.findModules();
      res.status(200).json({
        success: true,
        data: grouped,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const permissionsController = new PermissionsController();
