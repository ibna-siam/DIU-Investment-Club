import { Request, Response, NextFunction } from 'express';
import { operationsRepository } from './operations.repository';

export class OperationsController {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await operationsRepository.getOperationsSummary();
      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const operationsController = new OperationsController();
