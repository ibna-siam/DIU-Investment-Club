import { Router } from 'express';
import { permissionsController } from './permissions.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('roles', 'read'), (req, res, next) =>
  permissionsController.getAllPermissions(req, res, next)
);

router.get('/modules', requirePermission('roles', 'read'), (req, res, next) =>
  permissionsController.getPermissionsGroupedByModule(req, res, next)
);

export default router;
