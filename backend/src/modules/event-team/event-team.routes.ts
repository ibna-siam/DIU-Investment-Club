import { Router } from 'express';
import { eventTeamController } from './event-team.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', requirePermission('events', 'read'), eventTeamController.list);
router.post('/', requirePermission('events', 'manage'), eventTeamController.addMember);
router.patch('/:memberId', requirePermission('events', 'manage'), eventTeamController.updateMember);
router.delete('/:memberId', requirePermission('events', 'manage'), eventTeamController.removeMember);

export default router;
