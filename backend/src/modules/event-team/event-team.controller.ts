import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { eventTeamService } from './event-team.service';

export class EventTeamController {
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const includeRemoved = req.query.includeRemoved === 'true';
      const members = await eventTeamService.listMembers(eventId, includeRemoved);

      res.json({
        success: true,
        data: members,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to list event team members' },
      });
    }
  }

  async addMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { eventId } = req.params;
      const { user_id, event_role, role, responsibility, responsibilities } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      if (!user_id) {
        res.status(400).json({ success: false, error: { message: 'user_id is required' } });
        return;
      }

      const member = await eventTeamService.addMember({
        event_id: eventId,
        user_id,
        event_role: event_role || role || 'TEAM_MEMBER',
        responsibility: responsibility || responsibilities,
        assigned_by: userId,
      });

      res.status(201).json({
        success: true,
        data: member,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to add event team member' },
      });
    }
  }

  async updateMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { memberId } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const member = await eventTeamService.updateMember(memberId, req.body, userId);
      res.json({
        success: true,
        data: member,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to update member' },
      });
    }
  }

  async removeMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { memberId } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      await eventTeamService.removeMember(memberId, userId);
      res.json({
        success: true,
        message: 'Member removed from event team',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to remove member' },
      });
    }
  }
}

export const eventTeamController = new EventTeamController();
