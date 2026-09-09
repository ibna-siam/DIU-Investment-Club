import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { tasksRepository } from './tasks.repository';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';
import { notificationsRepository } from '../notifications/notifications.repository';
import { emailEventBus } from '../email/email.events';

export class TasksController {
  async getTasks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, priority, assigned_to, related_event_id, related_meeting_id, search } =
        req.query as Record<string, string>;

      const user = req.user;
      const userRoles = user?.roles?.map((r) => r.slug) || [];
      const isSuperAdmin = userRoles.includes('SUPER_ADMIN');
      const hasManageAll =
        isSuperAdmin ||
        user?.permissions?.includes('tasks.manage') ||
        user?.permissions?.includes('tasks.admin') ||
        user?.permissions?.includes('*') ||
        userRoles.includes('PRESIDENT') ||
        userRoles.includes('GENERAL_SECRETARY') ||
        userRoles.includes('EVENT_MANAGER');

      // General and Executive members only see their own assigned tasks unless explicitly authorized with tasks.manage
      let filterAssignedTo: string | undefined = typeof assigned_to === 'string' ? assigned_to : undefined;
      if (!hasManageAll) {
        filterAssignedTo = user?.id;
      }

      const data = await tasksRepository.getTasks({
        status: typeof status === 'string' ? status : undefined,
        priority: typeof priority === 'string' ? priority : undefined,
        assigned_to: filterAssignedTo,
        related_event_id: typeof related_event_id === 'string' ? related_event_id : undefined,
        related_meeting_id: typeof related_meeting_id === 'string' ? related_meeting_id : undefined,
        search: typeof search === 'string' ? search : undefined,
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getTaskById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await tasksRepository.getTaskById(id);
      if (!data) {
        res.status(404).json({ success: false, error: { message: 'Task not found' } });
        return;
      }

      const user = req.user;
      const userRoles = user?.roles?.map((r) => r.slug) || [];
      const hasManageAll =
        userRoles.includes('SUPER_ADMIN') ||
        user?.permissions?.includes('tasks.manage') ||
        user?.permissions?.includes('tasks.admin') ||
        user?.permissions?.includes('*') ||
        userRoles.includes('PRESIDENT') ||
        userRoles.includes('GENERAL_SECRETARY') ||
        userRoles.includes('EVENT_MANAGER');

      if (!hasManageAll && data.assigned_to !== user?.id && data.created_by !== user?.id) {
        res.status(403).json({
          success: false,
          error: { message: 'You are only authorized to view your own assigned tasks.' },
        });
        return;
      }

      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await tasksRepository.createTask({
        ...req.body,
        created_by: req.user?.id,
      });

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'TASK_CREATED',
        module: 'tasks',
        record_id: task.id,
        new_data: { title: task.title, priority: task.priority },
      });

      // Notify assignee if assigned
      if (task.assigned_to && task.assigned_to !== req.user?.id) {
        await notificationsRepository.dispatchNotification({
          user_id: task.assigned_to,
          title: 'New Task Assigned',
          message: `You were assigned a new task: "${task.title}" with priority ${task.priority}`,
          type: 'INFO',
          category: 'TASK',
          priority: task.priority === 'URGENT' ? 'URGENT' : 'NORMAL',
          link: `/tasks/${task.id}`,
        });

        // Emit TASK_ASSIGNED domain event after assignment is saved
        try {
          const { usersRepository } = await import('../users/users.repository');
          const assignee = await usersRepository.findById(task.assigned_to);
          if (assignee) {
            emailEventBus.emitEvent({
              type: 'TASK_ASSIGNED',
              payload: {
                taskId: task.id,
                title: task.title,
                assigneeId: assignee.id,
                assigneeName: assignee.full_name,
                assigneeEmail: assignee.email,
                assignedByName: req.user?.full_name || 'Club Administration',
                dueDate: task.due_date,
                priority: task.priority,
                description: task.description,
              },
            });
          }
        } catch (eventErr) {
          console.warn('⚠️ [TasksController] Could not emit TASK_ASSIGNED event:', eventErr);
        }
      }

      res.status(201).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const oldTask = await tasksRepository.getTaskById(id);
      if (!oldTask) {
        res.status(404).json({ success: false, error: { message: 'Task not found' } });
        return;
      }

      const user = req.user;
      const userRoles = user?.roles?.map((r) => r.slug) || [];
      const hasManageAll =
        userRoles.includes('SUPER_ADMIN') ||
        user?.permissions?.includes('tasks.manage') ||
        user?.permissions?.includes('tasks.admin') ||
        user?.permissions?.includes('*') ||
        userRoles.includes('PRESIDENT') ||
        userRoles.includes('GENERAL_SECRETARY') ||
        userRoles.includes('EVENT_MANAGER');

      if (!hasManageAll && oldTask.assigned_to !== user?.id && oldTask.created_by !== user?.id) {
        res.status(403).json({
          success: false,
          error: { message: 'You can only update tasks assigned to or created by you.' },
        });
        return;
      }

      // If reassigning, user must have tasks.assign or manage
      if (req.body.assigned_to && req.body.assigned_to !== oldTask.assigned_to) {
        const canAssign = hasManageAll || user?.permissions?.includes('tasks.assign');
        if (!canAssign) {
          res.status(403).json({
            success: false,
            error: { message: 'You do not have permission to reassign tasks to other members.' },
          });
          return;
        }
      }

      const updated = await tasksRepository.updateTask(id, req.body);

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'TASK_UPDATED',
        module: 'tasks',
        record_id: id,
        old_data: { status: oldTask?.status, priority: oldTask?.priority },
        new_data: { status: updated.status, priority: updated.priority },
      });

      // If assigned to a new person
      if (req.body.assigned_to && req.body.assigned_to !== oldTask?.assigned_to) {
        await notificationsRepository.dispatchNotification({
          user_id: req.body.assigned_to,
          title: 'Task Assigned',
          message: `Task "${updated.title}" has been reassigned to you.`,
          type: 'INFO',
          category: 'TASK',
          link: `/tasks/${updated.id}`,
        });

        try {
          const { usersRepository } = await import('../users/users.repository');
          const newAssignee = await usersRepository.findById(req.body.assigned_to);
          if (newAssignee) {
            emailEventBus.emitEvent({
              type: 'TASK_ASSIGNED',
              payload: {
                taskId: updated.id,
                title: updated.title,
                assigneeId: newAssignee.id,
                assigneeName: newAssignee.full_name,
                assigneeEmail: newAssignee.email,
                assignedByName: req.user?.full_name || 'Club Administration',
                dueDate: updated.due_date,
                priority: updated.priority,
                description: updated.description,
              },
            });
          }
        } catch (eventErr) {
          console.warn('⚠️ [TasksController] Could not emit TASK_ASSIGNED event on reassignment:', eventErr);
        }
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const comment = await tasksRepository.addComment(id, {
        user_id: req.user?.id || '',
        comment: req.body.comment,
      });

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'COMMENT_ADDED',
        module: 'tasks',
        record_id: id,
      });

      res.status(201).json({ success: true, data: comment });
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const oldTask = await tasksRepository.getTaskById(id);
      if (!oldTask) {
        res.status(404).json({ success: false, error: { message: 'Task not found' } });
        return;
      }

      const user = req.user;
      const userRoles = user?.roles?.map((r) => r.slug) || [];
      const isSuperAdmin = userRoles.includes('SUPER_ADMIN');
      const canDelete =
        isSuperAdmin ||
        user?.permissions?.includes('tasks.delete') ||
        user?.permissions?.includes('tasks.manage');

      if (!canDelete && oldTask.created_by !== user?.id) {
        res.status(403).json({
          success: false,
          error: { message: 'You do not have permission to delete or cancel this task.' },
        });
        return;
      }

      const { action = 'CANCEL', reason } = req.body || {};
      const result = await tasksRepository.deleteTask(id, action, reason);

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: action === 'HARD_DELETE' ? 'TASK_DELETED' : 'TASK_CANCELLED',
        module: 'tasks',
        record_id: id,
        new_data: { action, reason, result },
      });

      res.status(200).json({ success: true, message: result.message, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }
}

export const tasksController = new TasksController();

