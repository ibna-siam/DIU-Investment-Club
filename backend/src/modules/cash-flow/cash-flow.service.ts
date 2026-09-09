import { CashFlowRepository } from './cash-flow.repository';
import { CashFlowSummary, CashFlowTimelineItem, CashFlowTrendPoint, PaginatedResponse } from '../../types';

export class CashFlowService {
  private repo: CashFlowRepository;

  constructor() {
    this.repo = new CashFlowRepository();
  }

  async getSummary(params: {
    start_date?: string;
    end_date?: string;
    account_id?: string;
    account_type?: string;
  }): Promise<CashFlowSummary> {
    return this.repo.getSummary(params);
  }

  async getTimeline(params: {
    start_date?: string;
    end_date?: string;
    account_id?: string;
    account_type?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<CashFlowTimelineItem>> {
    return this.repo.getTimeline(params);
  }

  async getTrend(params: {
    start_date?: string;
    end_date?: string;
    account_id?: string;
    account_type?: string;
  }): Promise<CashFlowTrendPoint[]> {
    return this.repo.getTrend(params);
  }
}
