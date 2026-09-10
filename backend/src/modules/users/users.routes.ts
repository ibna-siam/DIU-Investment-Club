import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission, requireRole } from '../../middleware/rbac.middleware';

const router = Router();

// All user management routes require authentication
router.use(authenticate);

router.get('/', requirePermission('users', 'read'), (req, res, next) =>
  usersController.getUsers(req, res, next)
);

router.get('/:id', requirePermission('users', 'read'), (req, res, next) =>
  usersController.getUserById(req, res, next)
);

router.post('/', requireRole('SUPER_ADMIN'), (req, res, next) =>
  usersController.createUser(req, res, next)
);

router.patch('/:id', requirePermission('users', 'update'), (req, res, next) =>
  usersController.updateUser(req, res, next)
);

router.patch('/:id/status', requirePermission('users', 'manage'), (req, res, next) =>
  usersController.updateStatus(req, res, next)
);

router.post('/:id/roles', requireRole('SUPER_ADMIN'), (req, res, next) =>
  usersController.assignRole(req, res, next)
);

router.delete('/:id/roles/:roleId', requireRole('SUPER_ADMIN'), (req, res, next) =>
  usersController.removeRole(req, res, next)
);

router.get('/:id/permissions', requirePermission('users', 'read'), (req, res, next) =>
  usersController.getUserPermissions(req, res, next)
);

router.post('/:id/permissions', requireRole('SUPER_ADMIN'), (req, res, next) =>
  usersController.assignUserPermission(req, res, next)
);

router.delete('/:id/permissions/:permissionId', requireRole('SUPER_ADMIN'), (req, res, next) =>
  usersController.removeUserPermission(req, res, next)
);

router.delete('/:id', requireRole('SUPER_ADMIN'), (req, res, next) =>
  usersController.deleteUser(req, res, next)
);

export default router;

