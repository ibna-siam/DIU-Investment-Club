import { Router } from 'express';
import { meetingsController } from './meetings.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Agendas
router.put('/agendas/:agendaId', requirePermission('meetings.update'), meetingsController.updateAgenda);
router.delete('/agendas/:agendaId', requirePermission('meetings.update'), meetingsController.deleteAgenda);

// Minutes Approval
router.put('/minutes/:minutesId/approve', requirePermission('meeting_minutes.approve'), meetingsController.approveMinutes);

// Meetings CRUD & Nested Operations
router.get('/', requirePermission('meetings.read'), meetingsController.getMeetings);
router.post('/', requirePermission('meetings.create'), meetingsController.createMeeting);
router.get('/:id/impact', requirePermission('meetings.read'), meetingsController.getMeetingImpact);
router.get('/:id', requirePermission('meetings.read'), meetingsController.getMeetingById);
router.put('/:id', requirePermission('meetings.update'), meetingsController.updateMeeting);
router.delete('/:id', requirePermission('meetings.delete'), meetingsController.deleteMeeting);
router.post('/:id/agendas', requirePermission('meetings.update'), meetingsController.addAgenda);
router.post('/:id/attendance', requirePermission('meetings.update'), meetingsController.recordAttendance);
router.post('/:id/minutes', requirePermission('meeting_minutes.create'), meetingsController.saveMinutes);

export default router;

