import { Request, Response } from 'express';
import { reconciliationRepository } from './reconciliation.repository';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class ReconciliationController {
  // Cash Reconciliations
  async getCashAccounts(req: Request, res: Response) {
    try {
      const accounts = await reconciliationRepository.getCashAccounts();
      return res.status(200).json({ success: true, data: accounts });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async createCashReconciliation(req: AuthenticatedRequest, res: Response) {
    try {
      const { account_id, reconciliation_date, physical_cash, notes } = req.body;
      if (!account_id || physical_cash === undefined) {
        return res.status(400).json({
          success: false,
          error: { message: 'account_id and physical_cash are required' },
        });
      }

      const rec = await reconciliationRepository.createCashReconciliation({
        account_id,
        reconciliation_date,
        physical_cash: Number(physical_cash),
        notes,
        created_by: req.user?.id,
        verified_by: req.user?.id,
      });

      if (!rec) {
        return res.status(500).json({ success: false, error: { message: 'Failed to record cash reconciliation' } });
      }

      return res.status(201).json({ success: true, data: rec });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async listCashReconciliations(req: Request, res: Response) {
    try {
      const { account_id, page, limit } = req.query;
      const data = await reconciliationRepository.listCashReconciliations({
        accountId: account_id as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      return res.status(200).json({ success: true, ...data });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  // Bank Reconciliations
  async getBankAccounts(req: Request, res: Response) {
    try {
      const accounts = await reconciliationRepository.getBankAccounts();
      return res.status(200).json({ success: true, data: accounts });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async createBankReconciliation(req: AuthenticatedRequest, res: Response) {
    try {
      const { account_id, period_start, period_end, statement_ending_balance, notes, items } = req.body;
      if (!account_id || !period_start || !period_end || statement_ending_balance === undefined) {
        return res.status(400).json({
          success: false,
          error: { message: 'account_id, period_start, period_end, and statement_ending_balance are required' },
        });
      }

      const rec = await reconciliationRepository.createBankReconciliation({
        account_id,
        period_start,
        period_end,
        statement_ending_balance: Number(statement_ending_balance),
        notes,
        items,
        created_by: req.user?.id,
      });

      if (!rec) {
        return res.status(500).json({ success: false, error: { message: 'Failed to initiate bank reconciliation' } });
      }

      return res.status(201).json({ success: true, data: rec });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async listBankReconciliations(req: Request, res: Response) {
    try {
      const { account_id, status, page, limit } = req.query;
      const data = await reconciliationRepository.listBankReconciliations({
        accountId: account_id as string,
        status: status as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      return res.status(200).json({ success: true, ...data });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async getBankReconciliationById(req: Request, res: Response) {
    try {
      const rec = await reconciliationRepository.getBankReconciliationById(req.params.id);
      if (!rec) {
        return res.status(404).json({ success: false, error: { message: 'Bank reconciliation session not found' } });
      }
      return res.status(200).json({ success: true, data: rec });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async matchItem(req: AuthenticatedRequest, res: Response) {
    try {
      const { itemId } = req.params;
      const { transaction_id } = req.body;
      if (!transaction_id) {
        return res.status(400).json({ success: false, error: { message: 'transaction_id is required' } });
      }

      const ok = await reconciliationRepository.confirmMatch(itemId, transaction_id, req.user?.id || '');
      return res.status(200).json({ success: ok });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async unmatchItem(req: Request, res: Response) {
    try {
      const { itemId } = req.params;
      const ok = await reconciliationRepository.unmatchItem(itemId);
      return res.status(200).json({ success: ok });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!['COMPLETED', 'APPROVED'].includes(status)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
      }

      const ok = await reconciliationRepository.updateReconciliationStatus(id, status, req.user?.id || '');
      return res.status(200).json({ success: ok });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }
}

export const reconciliationController = new ReconciliationController();
