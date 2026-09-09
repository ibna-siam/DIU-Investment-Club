import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { committeesRepository } from './committees.repository';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class CommitteesController {
  async getCommittees(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.query as { status?: string };
      const data = await committeesRepository.getCommittees({ status });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getCommitteeById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await committeesRepository.getCommitteeById(id);
      if (!data) {
        res.status(404).json({ success: false, error: { message: 'Committee not found' } });
        return;
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createCommittee(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const committee = await committeesRepository.createCommittee(req.body);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'COMMITTEE_CREATED',
        module: 'committee',
        record_id: committee.id,
        new_data: committee,
      });
      res.status(201).json({ success: true, data: committee });
    } catch (error) {
      next(error);
    }
  }

  async updateCommittee(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const committee = await committeesRepository.updateCommittee(id, req.body);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'COMMITTEE_UPDATED',
        module: 'committee',
        record_id: id,
        new_data: committee,
      });
      res.status(200).json({ success: true, data: committee });
    } catch (error) {
      next(error);
    }
  }

  async getPositions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const includeInactive = req.query.include_inactive === 'true';
      const data = await committeesRepository.getPositions({ include_inactive: includeInactive });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createPosition(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const position = await committeesRepository.createPosition(req.body);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'GOVERNANCE_POSITION_CREATED',
        module: 'governance',
        record_id: position.id,
        new_data: position,
      });
      res.status(201).json({ success: true, data: position });
    } catch (error) {
      next(error);
    }
  }

  async updatePosition(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const position = await committeesRepository.updatePosition(id, req.body);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'GOVERNANCE_POSITION_UPDATED',
        module: 'governance',
        record_id: id,
        new_data: position,
      });
      res.status(200).json({ success: true, data: position });
    } catch (error) {
      next(error);
    }
  }

  async togglePositionStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      const position = await committeesRepository.togglePositionStatus(id, Boolean(is_active));
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: is_active ? 'GOVERNANCE_POSITION_ACTIVATED' : 'GOVERNANCE_POSITION_ARCHIVED',
        module: 'governance',
        record_id: id,
        new_data: { is_active },
      });
      res.status(200).json({ success: true, data: position });
    } catch (error) {
      next(error);
    }
  }

  async deletePosition(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await committeesRepository.deletePosition(id);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'GOVERNANCE_POSITION_DELETED',
        module: 'governance',
        record_id: id,
      });
      res.status(200).json({ success: true, message: 'Position deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async assignMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const assignment = await committeesRepository.assignMember({
        ...req.body,
        committee_id: id,
      });
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'COMMITTEE_MEMBER_ASSIGNED',
        module: 'committee',
        record_id: assignment.id,
        new_data: assignment,
      });
      res.status(201).json({ success: true, data: assignment });
    } catch (error) {
      next(error);
    }
  }

  async removeMemberAssignment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { memberId } = req.params;
      const permanent = req.query.permanent === 'true';
      await committeesRepository.removeMemberAssignment(memberId, permanent);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'OFFICER_REMOVED',
        module: 'committee',
        record_id: memberId,
        new_data: { permanent },
      });
      res.status(200).json({ success: true, message: 'Officer assignment concluded/removed successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const committeesController = new CommitteesController();
