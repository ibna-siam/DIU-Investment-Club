import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { eventsService } from './events.service';

import { eventTeamRepository } from '../event-team/event-team.repository';
import { emailEventBus } from '../email/email.events';

export class EventsController {
  constructor() {
    this.list = this.list.bind(this);
    this.getById = this.getById.bind(this);
    this.getBySlug = this.getBySlug.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
    this.close = this.close.bind(this);
    this.reopen = this.reopen.bind(this);
    this.delete = this.delete.bind(this);
    this.canManageEvent = this.canManageEvent.bind(this);
  }

  private async canManageEvent(userId: string, userRoles?: any[], eventId?: string, event?: any): Promise<boolean> {
    const roleList = (userRoles || []).map((r: any) =>
      (typeof r === 'string' ? r : r?.name || r?.slug || '').toUpperCase()
    );
    const isSuperAdmin =
      roleList.includes('SUPER ADMIN') ||
      roleList.includes('SUPER_ADMIN') ||
      roleList.includes('PRESIDENT') ||
      roleList.includes('GENERAL SECRETARY') ||
      roleList.includes('GENERAL_SECRETARY');
    if (isSuperAdmin) {
      return true;
    }
    const evt = event || (eventId ? await eventsService.getEventById(eventId) : null);
    if (!evt) return false;
    if (evt.created_by === userId) return true;

    try {
      const members = await eventTeamRepository.list(evt.id, false);
      return members.some((m: any) => m.user_id === userId);
    } catch {
      return false;
    }
  }

  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { page, limit, status, event_type, search } = req.query;
      const result = await eventsService.listEvents({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
        status: status as string,
        event_type: event_type as string,
        search: search as string,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to list events' },
      });
    }
  }

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const event = await eventsService.getEventById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          error: { message: 'Event not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to get event' },
      });
    }
  }

  async getBySlug(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const event = await eventsService.getEventBySlug(slug);
      if (!event) {
        res.status(404).json({
          success: false,
          error: { message: 'Event not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to get event by slug' },
      });
    }
  }

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const event = await eventsService.createEvent(req.body, userId);

      // Emit EVENT_CREATED domain event after database creation succeeds
      const shouldNotify = req.body.notify_members !== false && req.body.target_audience !== 'NONE';
      if (shouldNotify) {
        try {
          emailEventBus.emitEvent({
            type: 'EVENT_CREATED',
            payload: {
              eventId: event.id,
              title: event.title,
              startDate: event.start_date || new Date().toISOString(),
              endDate: event.end_date || undefined,
              location: event.location || 'DIU Auditorium, Daffodil Smart City',
              summary: event.short_description || event.description || undefined,
              bannerUrl: (event as any).banner_image || (event as any).banner_url || undefined,
              targetAudience: req.body.target_audience || 'ALL',
              targetEmails: req.body.target_emails || undefined,
              createdBy: userId,
            },
          });
        } catch (eventErr) {
          console.warn('⚠️ [EventsController] Could not emit EVENT_CREATED event:', eventErr);
        }
      }

      res.status(201).json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to create event' },
      });
    }
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const existing = await eventsService.getEventById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: { message: 'Event not found' } });
        return;
      }

      const canManage = await this.canManageEvent(userId, req.user?.roles, id, existing);
      if (!canManage) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: You do not have permission to modify this event' },
        });
        return;
      }

      const event = await eventsService.updateEvent(id, req.body, userId);
      res.json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to update event' },
      });
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { status, reason } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      if (!status) {
        res.status(400).json({ success: false, error: { message: 'Status is required' } });
        return;
      }

      const existing = await eventsService.getEventById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: { message: 'Event not found' } });
        return;
      }

      const canManage = await this.canManageEvent(userId, req.user?.roles, id, existing);
      if (!canManage) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: You do not have permission to change this event status' },
        });
        return;
      }

      const event = await eventsService.updateEventStatus(id, status, userId, reason);
      res.json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to update event status' },
      });
    }
  }

  async close(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const existing = await eventsService.getEventById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: { message: 'Event not found' } });
        return;
      }

      const canManage = await this.canManageEvent(userId, req.user?.roles, id, existing);
      if (!canManage) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: You do not have permission to close this event' },
        });
        return;
      }

      const event = await eventsService.updateEventStatus(id, 'CLOSED', userId);
      res.json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to close event' },
      });
    }
  }

  async reopen(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { reason } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const existing = await eventsService.getEventById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: { message: 'Event not found' } });
        return;
      }

      const canManage = await this.canManageEvent(userId, req.user?.roles, id, existing);
      if (!canManage) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: You do not have permission to reopen this event' },
        });
        return;
      }

      const event = await eventsService.updateEventStatus(id, 'FINANCIAL_REVIEW', userId, reason);
      res.json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to reopen event' },
      });
    }
  }

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const existing = await eventsService.getEventById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: { message: 'Event not found' } });
        return;
      }

      const roleList = (req.user?.roles || []).map((r: any) =>
        (typeof r === 'string' ? r : r?.name || r?.slug || '').toUpperCase()
      );
      const isSuperAdmin =
        roleList.includes('SUPER ADMIN') ||
        roleList.includes('SUPER_ADMIN') ||
        roleList.includes('PRESIDENT');
      if (!isSuperAdmin && existing.created_by !== userId) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Only administrators or the creator can delete this event' },
        });
        return;
      }

      await eventsService.deleteEvent(id, userId);
      res.json({
        success: true,
        message: 'Event deleted successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to delete event' },
      });
    }
  }
}

export const eventsController = new EventsController();
