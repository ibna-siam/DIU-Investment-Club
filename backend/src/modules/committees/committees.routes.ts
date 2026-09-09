import { Router } from 'express';
import { committeesController } from './committees.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Positions
router.get('/positions', requirePermission('committee.read'), committeesController.getPositions);
router.post('/positions', requirePermission('committee.manage'), committeesController.createPosition);
router.put('/positions/:id', requirePermission('committee.manage'), committeesController.updatePosition);
router.patch('/positions/:id/status', requirePermission('committee.manage'), committeesController.togglePositionStatus);
router.delete('/positions/:id', requirePermission('committee.manage'), committeesController.deletePosition);

// Committees
router.get('/', requirePermission('committee.read'), committeesController.getCommittees);
router.post('/', requirePermission('committee.manage'), committeesController.createCommittee);
router.get('/:id', requirePermission('committee.read'), committeesController.getCommitteeById);
router.put('/:id', requirePermission('committee.manage'), committeesController.updateCommittee);

// Committee Members
router.post('/:id/members', requirePermission('committee.manage'), committeesController.assignMember);
router.delete('/members/:memberId', requirePermission('committee.manage'), committeesController.removeMemberAssignment);

export default router;
