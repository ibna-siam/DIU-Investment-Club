import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { rolesRepository } from './roles.repository';

const createRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters'),
  description: z.string().default(''),
});

const updateRoleSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
});

const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid('Invalid permission ID format')),
});

export class RolesController {
  async getRoles(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await rolesRepository.findAll();
      // Hydrate with permission counts
      const hydrated = await Promise.all(
        roles.map(async (r) => {
          const perms = await rolesRepository.getPermissionsForRole(r.id);
          return {
            ...r,
            permissionsCount: perms.length,
          };
        })
      );
      res.status(200).json({
        success: true,
        data: hydrated,
      });
    } catch (err) {
      next(err);
    }
  }

  async getRoleById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const role = await rolesRepository.findById(id);
      if (!role) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Role not found' },
        });
        return;
      }
      const permissions = await rolesRepository.getPermissionsForRole(id);
      res.status(200).json({
        success: true,
        data: {
          ...role,
          permissions,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async createRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createRoleSchema.parse(req.body);
      const existing = await rolesRepository.findBySlug(data.slug);
      if (existing) {
        res.status(400).json({
          success: false,
          error: { code: 'ROLE_EXISTS', message: 'A role with this slug already exists' },
        });
        return;
      }

      const role = await rolesRepository.create(data);
      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: role,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateRoleSchema.parse(req.body);

      const updated = await rolesRepository.update(id, data);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Role not found' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Role updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await rolesRepository.delete(id);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: { code: 'DELETE_REJECTED', message: result.message },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Role deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async getRolePermissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const permissions = await rolesRepository.getPermissionsForRole(id);
      res.status(200).json({
        success: true,
        data: permissions,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateRolePermissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { permissionIds } = updateRolePermissionsSchema.parse(req.body);

      const role = await rolesRepository.findById(id);
      if (!role) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Role not found' },
        });
        return;
      }

      const updatedPermissions = await rolesRepository.updateRolePermissions(id, permissionIds);
      res.status(200).json({
        success: true,
        message: `Updated permissions for ${role.name}`,
        data: updatedPermissions,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const rolesController = new RolesController();
