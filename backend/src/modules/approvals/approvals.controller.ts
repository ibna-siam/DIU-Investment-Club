import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { ApprovalsService } from './approvals.service';
import { emailEventBus } from '../email/email.events';
import { isValidEmail } from '../email/email.security';

const approvalsService = new ApprovalsService();

export class ApprovalsController {
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, request_type, page, limit } = req.query;

      const result = await approvalsService.list({
        status: status as any,
        request_type: request_type as any,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    } catch (e: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: e.message || 'Failed to fetch approval requests' },
      });
    }
  }

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const request = await approvalsService.getById(id);

      if (!request) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Approval request not found' },
        });
        return;
      }

      res.json({ success: true, data: request });
    } catch (e: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: e.message || 'Failed to fetch approval request' },
      });
    }
  }

  async processAction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { action, comment } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const result = await approvalsService.processAction({
        requestId: id,
        action,
        comment,
        userId,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: { code: 'APPROVAL_ERROR', message: result.error },
        });
        return;
      }

      // Emit domain events for EXPENSE_APPROVED or EXPENSE_REJECTED
      try {
        const approvalReq = await approvalsService.getById(id);
        const normAction = action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : action;
        if (approvalReq && approvalReq.request_type === 'EXPENSE') {
          const expenseRef = approvalReq.reference_data || {};
          const recipientEmail = approvalReq.requested_by_email || (approvalReq as any).requester?.email;
          const recipientName = approvalReq.requested_by_name || 'Club Member';

          if (!recipientEmail || !isValidEmail(recipientEmail)) {
            console.warn(`⚠️ [ApprovalsController] No valid requester email found for approval request ${approvalReq.id}. Skipping email dispatch.`);
          } else if (normAction === 'APPROVED') {
            emailEventBus.emitEvent({
              type: 'EXPENSE_APPROVED',
              payload: {
                expenseId: approvalReq.reference_id,
                expenseNumber: expenseRef.expense_number || approvalReq.reference_id,
                title: approvalReq.title,
                amount: Number(expenseRef.amount || 0),
                recipientEmail,
                recipientName,
                approverId: userId,
                approverName: req.user?.full_name || 'Board Approver',
                notes: comment,
                approvalDate: new Date().toLocaleDateString('en-US', { dateStyle: 'medium' }),
              },
            });
          } else if (normAction === 'REJECTED') {
            emailEventBus.emitEvent({
              type: 'EXPENSE_REJECTED',
              payload: {
                expenseId: approvalReq.reference_id,
                expenseNumber: expenseRef.expense_number || approvalReq.reference_id,
                title: approvalReq.title,
                amount: Number(expenseRef.amount || 0),
                recipientEmail,
                recipientName,
                approverId: userId,
                approverName: req.user?.full_name || 'Board Approver',
                reason: comment || 'Claim details require revision',
              },
            });
          }
        }
      } catch (eventErr) {
        console.warn('⚠️ [ApprovalsController] Could not emit approval event:', eventErr);
      }

      res.json({
        success: true,
        message: `Approval action ${action} executed successfully`,
        data: result.data,
      });
    } catch (e: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: e.message || 'Failed to process approval action' },
      });
    }
  }
}
