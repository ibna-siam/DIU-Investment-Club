import { Request, Response } from 'express';
import { auditLogsRepository } from './audit-logs.repository';

export class AuditLogsController {
  async getLogs(req: Request, res: Response) {
    try {
      const { module, action, user_id, category, startDate, endDate, search, page, limit } = req.query;
      const logs = await auditLogsRepository.findAll({
        module: module as string,
        action: action as string,
        user_id: user_id as string,
        category: category as string,
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      return res.status(200).json({
        success: true,
        data: logs.data,
        pagination: {
          total: logs.total,
          page: logs.page,
          limit: logs.limit,
          totalPages: logs.totalPages,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message || 'Failed to fetch audit logs' },
      });
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const stats = await auditLogsRepository.getStats();
      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message || 'Failed to fetch audit statistics' },
      });
    }
  }

  async getReports(req: Request, res: Response) {
    try {
      const { type, startDate, endDate, userId, limit } = req.query;
      const validTypes = ['USER_ACTIVITY', 'FINANCIAL_CHANGES', 'APPROVAL_HISTORY', 'SYSTEM_EVENTS'];
      const reportType = validTypes.includes(type as string) ? (type as any) : 'FINANCIAL_CHANGES';

      const data = await auditLogsRepository.getReports(reportType, {
        startDate: startDate as string,
        endDate: endDate as string,
        userId: userId as string,
        limit: limit ? Number(limit) : 500,
      });

      return res.status(200).json({
        success: true,
        reportType,
        totalRecords: data.length,
        data,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message || 'Failed to generate audit report' },
      });
    }
  }
}

export const auditLogsController = new AuditLogsController();
