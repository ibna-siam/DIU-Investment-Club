import { Router } from 'express';
import { membersController } from './members.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('members.read'), membersController.getMembers);
router.post('/', requirePermission('members.create'), membersController.createMember);
router.get('/:id/impact-summary', requirePermission('members.read'), membersController.getImpactSummary);
router.post('/:id/remove', requirePermission('members.delete'), membersController.removeMember);
router.get('/:id', requirePermission('members.read'), membersController.getMemberById);
router.put('/:id', requirePermission('members.update'), membersController.updateMember);
router.post('/:id/status', requirePermission('members.update'), membersController.updateStatus);
router.post('/:id/archive', requirePermission('members.archive'), membersController.archiveMember);
router.post('/:id/reactivate', requirePermission('members.archive'), membersController.reactivateMember);
router.post('/:id/restore', requirePermission('members.archive'), membersController.reactivateMember);
router.delete('/:id', requirePermission('members.delete'), membersController.deleteMember);

export default router;

