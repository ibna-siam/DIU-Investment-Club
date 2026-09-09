import { Router } from 'express';
import { rolesController } from './roles.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission, requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('roles', 'read'), (req, res, next) =>
  rolesController.getRoles(req, res, next)
);

router.post('/', requireRole('SUPER_ADMIN'), (req, res, next) =>
  rolesController.createRole(req, res, next)
);

router.get('/:id', requirePermission('roles', 'read'), (req, res, next) =>
  rolesController.getRoleById(req, res, next)
);

router.patch('/:id', requireRole('SUPER_ADMIN'), (req, res, next) =>
  rolesController.updateRole(req, res, next)
);

router.delete('/:id', requireRole('SUPER_ADMIN'), (req, res, next) =>
  rolesController.deleteRole(req, res, next)
);

router.get('/:id/permissions', requirePermission('roles', 'read'), (req, res, next) =>
  rolesController.getRolePermissions(req, res, next)
);

router.post('/:id/permissions', requireRole('SUPER_ADMIN'), (req, res, next) =>
  rolesController.updateRolePermissions(req, res, next)
);

router.patch('/:id/permissions', requireRole('SUPER_ADMIN'), (req, res, next) =>
  rolesController.updateRolePermissions(req, res, next)
);

export default router;
