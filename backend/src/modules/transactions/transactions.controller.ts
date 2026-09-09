import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { transactionsRepository } from './transactions.repository';

export class TransactionsController {
  async getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        search,
        account_id,
        transaction_type,
        start_date,
        end_date,
        page,
        limit,
      } = req.query;

      const result = await transactionsRepository.findAll({
        search: search as string | undefined,
        account_id: account_id as string | undefined,
        transaction_type: transaction_type as string | undefined,
        start_date: start_date as string | undefined,
        end_date: end_date as string | undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 15,
      });

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getTransactionById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const transaction = await transactionsRepository.findById(id);

      if (!transaction) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Transaction record not found' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: transaction,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const transactionsController = new TransactionsController();
