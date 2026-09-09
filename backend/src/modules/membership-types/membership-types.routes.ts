import { Router } from 'express';
import { membershipTypesController } from './membership-types.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('members.read'), membershipTypesController.getTypes);
router.get('/:id', requirePermission('members.read'), membershipTypesController.getTypeById);
router.post('/', requirePermission('membership_types.manage'), membershipTypesController.createType);
router.put('/:id', requirePermission('membership_types.manage'), membershipTypesController.updateType);
router.delete('/:id', requirePermission('membership_types.delete'), membershipTypesController.deleteType);

export default router;
