import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { FundTransfersService } from './fund-transfers.service';

const transfersService = new FundTransfersService();

export class FundTransfersController {
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { from_account_id, to_account_id, status, start_date, end_date, page, limit } = req.query;

      const result = await transfersService.list({
        from_account_id: from_account_id as string,
        to_account_id: to_account_id as string,
        status: status as string,
        start_date: start_date as string,
        end_date: end_date as string,
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
        error: { code: 'INTERNAL_ERROR', message: e.message || 'Failed to fetch fund transfers' },
      });
    }
  }

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const transfer = await transfersService.getById(id);

      if (!transfer) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Fund transfer record not found' },
        });
        return;
      }

      res.json({ success: true, data: transfer });
    } catch (e: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: e.message || 'Failed to fetch fund transfer' },
      });
    }
  }

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { from_account_id, to_account_id, amount, transfer_date, description, reference_number } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const result = await transfersService.transfer({
        from_account_id,
        to_account_id,
        amount: parseFloat(amount),
        transfer_date,
        description,
        reference_number,
        user_id: userId,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: { code: 'TRANSFER_ERROR', message: result.error },
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Fund transfer executed successfully',
        data: result.data,
      });
    } catch (e: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: e.message || 'Failed to execute fund transfer' },
      });
    }
  }
}
