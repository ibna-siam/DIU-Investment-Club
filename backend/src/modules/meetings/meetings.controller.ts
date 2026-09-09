import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { meetingsRepository } from './meetings.repository';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';
import { emailEventBus } from '../email/email.events';

export class MeetingsController {
  async getMeetings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, meeting_type, start_date, end_date } = req.query as Record<string, string>;
      const data = await meetingsRepository.getMeetings({
        status,
        meeting_type,
        start_date,
        end_date,
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getMeetingById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await meetingsRepository.getMeetingById(id);
      if (!data) {
        res.status(404).json({ success: false, error: { message: 'Meeting not found' } });
        return;
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createMeeting(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const meeting = await meetingsRepository.createMeeting({
        ...req.body,
        created_by: req.user?.id,
      });
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'MEETING_CREATED',
        module: 'meetings',
        record_id: meeting.id,
        new_data: { title: meeting.title, date: meeting.meeting_date },
      });

      // Emit MEETING_SCHEDULED domain event after meeting is saved
      try {
        emailEventBus.emitEvent({
          type: 'MEETING_SCHEDULED',
          payload: {
            meetingId: meeting.id,
            title: meeting.title,
            meetingDate: meeting.meeting_date || new Date().toISOString().split('T')[0],
            startTime: meeting.start_time || '10:00 AM',
            endTime: meeting.end_time,
            location: meeting.location || 'DIU Investment Club Office',
            meetingLink: meeting.meeting_link,
            agendaSummary: meeting.description || 'General Agenda Discussion',
            participantEmails: Array.isArray(req.body.participant_emails) ? req.body.participant_emails : [],
            createdBy: req.user?.id,
          },
        });
      } catch (eventErr) {
        console.warn('⚠️ [MeetingsController] Could not emit MEETING_SCHEDULED event:', eventErr);
      }

      res.status(201).json({ success: true, data: meeting });
    } catch (error) {
      next(error);
    }
  }

  async updateMeeting(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const meeting = await meetingsRepository.updateMeeting(id, req.body);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'MEETING_UPDATED',
        module: 'meetings',
        record_id: id,
        new_data: meeting,
      });
      res.status(200).json({ success: true, data: meeting });
    } catch (error) {
      next(error);
    }
  }

  async addAgenda(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const agenda = await meetingsRepository.addAgenda(id, req.body);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'AGENDA_ADDED',
        module: 'meetings',
        record_id: agenda.id,
        new_data: agenda,
      });
      res.status(201).json({ success: true, data: agenda });
    } catch (error) {
      next(error);
    }
  }

  async updateAgenda(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { agendaId } = req.params;
      const agenda = await meetingsRepository.updateAgenda(agendaId, req.body);
      res.status(200).json({ success: true, data: agenda });
    } catch (error) {
      next(error);
    }
  }

  async deleteAgenda(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { agendaId } = req.params;
      await meetingsRepository.deleteAgenda(agendaId);
      res.status(200).json({ success: true, message: 'Agenda item deleted' });
    } catch (error) {
      next(error);
    }
  }

  async recordAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { attendance } = req.body;
      await meetingsRepository.recordAttendance(id, attendance || [], req.user?.id);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'ATTENDANCE_RECORDED',
        module: 'meetings',
        record_id: id,
        new_data: { count: attendance?.length || 0 },
      });
      res.status(200).json({ success: true, message: 'Attendance recorded successfully' });
    } catch (error) {
      next(error);
    }
  }

  async saveMinutes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const minutes = await meetingsRepository.saveMinutes(id, {
        ...req.body,
        prepared_by: req.user?.id,
      });
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'MINUTES_CREATED',
        module: 'meetings',
        record_id: minutes.id,
      });
      res.status(201).json({ success: true, data: minutes });
    } catch (error) {
      next(error);
    }
  }

  async getMeetingImpact(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await meetingsRepository.getMeetingImpact(id);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }

  async deleteMeeting(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { action = 'CANCEL', reason } = req.body || {};

      const result = await meetingsRepository.deleteMeeting(id, action, reason);

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: action === 'HARD_DELETE' ? 'MEETING_DELETED' : 'MEETING_CANCELLED',
        module: 'meetings',
        record_id: id,
        new_data: { action, reason, result },
      });

      res.status(200).json({ success: true, message: result.message, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }

  async approveMinutes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { minutesId } = req.params;
      const minutes = await meetingsRepository.approveMinutes(minutesId, req.user?.id || '');
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'MINUTES_APPROVED',
        module: 'meetings',
        record_id: minutesId,
      });
      res.status(200).json({ success: true, data: minutes });
    } catch (error) {
      next(error);
    }
  }
}

export const meetingsController = new MeetingsController();

