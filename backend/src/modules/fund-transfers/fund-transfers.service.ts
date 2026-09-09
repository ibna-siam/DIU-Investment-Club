import { FundTransfersRepository } from './fund-transfers.repository';
import { FundTransfer, PaginatedResponse } from '../../types';

export class FundTransfersService {
  private repo: FundTransfersRepository;

  constructor() {
    this.repo = new FundTransfersRepository();
  }

  async list(params: {
    from_account_id?: string;
    to_account_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<FundTransfer>> {
    return this.repo.findAll(params);
  }

  async getById(id: string): Promise<FundTransfer | null> {
    return this.repo.findById(id);
  }

  async transfer(params: {
    from_account_id: string;
    to_account_id: string;
    amount: number;
    transfer_date?: string;
    description?: string;
    reference_number?: string;
    user_id: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!params.from_account_id || !params.to_account_id) {
      return { success: false, error: 'Source and destination accounts are required' };
    }

    if (params.from_account_id === params.to_account_id) {
      return { success: false, error: 'Source and destination accounts cannot be identical' };
    }

    if (!params.amount || params.amount <= 0) {
      return { success: false, error: 'Transfer amount must be greater than zero' };
    }

    return this.repo.executeTransfer(params);
  }
}
