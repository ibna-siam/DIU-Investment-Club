import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { assetsRepository } from './assets.repository';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class AssetsController {
  async getAssets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, status, condition, search } = req.query as Record<string, string>;
      const data = await assetsRepository.getAssets({
        category,
        status,
        condition,
        search,
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAssetById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await assetsRepository.getAssetById(id);
      if (!data) {
        res.status(404).json({ success: false, error: { message: 'Asset not found' } });
        return;
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createAsset(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const asset = await assetsRepository.createAsset(req.body);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'ASSET_CREATED',
        module: 'assets',
        record_id: asset.id,
        new_data: { asset_code: asset.asset_code, name: asset.asset_name },
      });
      res.status(201).json({ success: true, data: asset });
    } catch (error) {
      next(error);
    }
  }

  async updateAsset(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const asset = await assetsRepository.updateAsset(id, req.body);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'ASSET_STATUS_CHANGED',
        module: 'assets',
        record_id: id,
        new_data: asset,
      });
      res.status(200).json({ success: true, data: asset });
    } catch (error) {
      next(error);
    }
  }

  async assignAsset(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const assignment = await assetsRepository.assignAsset(id, {
        ...req.body,
        assigned_by: req.user?.id,
      });
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'ASSET_ASSIGNED',
        module: 'assets',
        record_id: id,
        new_data: assignment,
      });
      res.status(201).json({ success: true, data: assignment });
    } catch (error) {
      next(error);
    }
  }

  async returnAsset(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assignmentId } = req.params;
      await assetsRepository.returnAsset(assignmentId, req.body);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'ASSET_RETURNED',
        module: 'assets',
        record_id: assignmentId,
        new_data: req.body,
      });
      res.status(200).json({ success: true, message: 'Asset successfully returned to inventory' });
    } catch (error) {
      next(error);
    }
  }

  async addMaintenance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const log = await assetsRepository.addMaintenanceLog(id, {
        ...req.body,
        recorded_by: req.user?.id,
      });
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'ASSET_MAINTENANCE_LOGGED',
        module: 'assets',
        record_id: id,
        new_data: log,
      });
      res.status(201).json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  }
}

export const assetsController = new AssetsController();
