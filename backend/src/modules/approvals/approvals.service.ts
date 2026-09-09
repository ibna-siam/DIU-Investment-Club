import { ApprovalsRepository } from './approvals.repository';
import {
  ApprovalRequest,
  ApprovalStatus,
  ApprovalRequestType,
  PaginatedResponse,
} from '../../types';

export class ApprovalsService {
  private repo: ApprovalsRepository;

  constructor() {
    this.repo = new ApprovalsRepository();
  }

  async list(params: {
    status?: ApprovalStatus;
    request_type?: ApprovalRequestType;
    user_id?: string;
    pending_for_role?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ApprovalRequest>> {
    return this.repo.findAll(params);
  }

  async getById(id: string): Promise<ApprovalRequest | null> {
    return this.repo.findById(id);
  }

  async processAction(params: {
    requestId: string;
    action: any;
    comment?: string;
    comments?: string;
    userId: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    let normAction = params.action;
    if (normAction === 'APPROVE') normAction = 'APPROVED';
    if (normAction === 'REJECT') normAction = 'REJECTED';
    const comment = params.comment || params.comments;

    if (!['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'].includes(normAction)) {
      return { success: false, error: 'Invalid approval action' };
    }

    if (['REJECTED', 'CHANGES_REQUESTED'].includes(normAction) && (!comment || !comment.trim())) {
      return { success: false, error: `A comment explaining the decision is required for ${normAction}` };
    }

    return this.repo.processAction({
      request_id: params.requestId,
      action: normAction,
      comment,
      user_id: params.userId,
    });
  }
}
