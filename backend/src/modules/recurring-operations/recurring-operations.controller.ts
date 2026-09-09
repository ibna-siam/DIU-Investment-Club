import { Request, Response } from 'express';
import { recurringOperationsRepository } from './recurring-operations.repository';
import { RecurringTransactionStatus, RecurringTaskStatus } from '../../types';

export class RecurringOperationsController {
  // Transactions
  async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      const data = await recurringOperationsRepository.getRecurringTransactions({
        status: status as string,
      });
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getTransactionById(req: Request, res: Response): Promise<void> {
    try {
      const data = await recurringOperationsRepository.getRecurringTransactionById(req.params.id);
      if (!data) {
        res.status(404).json({ success: false, message: 'Recurring transaction not found' });
        return;
      }
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const data = await recurringOperationsRepository.createRecurringTransaction(req.body, userId);
      res.status(201).json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateTransaction(req: Request, res: Response): Promise<void> {
    try {
      const data = await recurringOperationsRepository.updateRecurringTransaction(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async setTransactionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.body;
      const data = await recurringOperationsRepository.setRecurringTransactionStatus(
        req.params.id,
        status as RecurringTransactionStatus
      );
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async processDueTransactions(req: Request, res: Response): Promise<void> {
    try {
      const result = await recurringOperationsRepository.processDueRecurringTransactions();
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Tasks
  async getTasks(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      const data = await recurringOperationsRepository.getRecurringTasks({
        status: status as string,
      });
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getTaskById(req: Request, res: Response): Promise<void> {
    try {
      const data = await recurringOperationsRepository.getRecurringTaskById(req.params.id);
      if (!data) {
        res.status(404).json({ success: false, message: 'Recurring task not found' });
        return;
      }
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const data = await recurringOperationsRepository.createRecurringTask(req.body, userId);
      res.status(201).json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const data = await recurringOperationsRepository.updateRecurringTask(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async setTaskStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.body;
      const data = await recurringOperationsRepository.setRecurringTaskStatus(
        req.params.id,
        status as RecurringTaskStatus
      );
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async processDueTasks(req: Request, res: Response): Promise<void> {
    try {
      const result = await recurringOperationsRepository.processDueRecurringTasks();
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const recurringOperationsController = new RecurringOperationsController();
