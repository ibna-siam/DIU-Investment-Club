import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import {
  CashFlowSummary,
  CashFlowTimelineItem,
  CashFlowTrendPoint,
  PaginatedResponse,
} from '../../types';

export class CashFlowRepository {
  async getSummary(params: {
    start_date?: string;
    end_date?: string;
    account_id?: string;
    account_type?: string;
  }): Promise<CashFlowSummary> {
    const defaultSummary: CashFlowSummary = {
      start_date: params.start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      end_date: params.end_date || new Date().toISOString().split('T')[0],
      opening_balance: 0,
      total_inflow: 0,
      total_outflow: 0,
      net_cash_flow: 0,
      closing_balance: 0,
    };

    if (!isSupabaseConfigured() || !supabaseClient) return defaultSummary;

    try {
      const { data, error } = await supabaseClient.rpc('get_cash_flow_summary', {
        p_start_date: params.start_date || null,
        p_end_date: params.end_date || null,
        p_account_id: params.account_id || null,
        p_account_type: params.account_type || null,
      });

      if (error || !data) return defaultSummary;

      return {
        start_date: data.start_date,
        end_date: data.end_date,
        opening_balance: parseFloat(data.opening_balance) || 0,
        total_inflow: parseFloat(data.total_inflow) || 0,
        total_outflow: parseFloat(data.total_outflow) || 0,
        net_cash_flow: parseFloat(data.net_cash_flow) || 0,
        closing_balance: parseFloat(data.closing_balance) || 0,
      };
    } catch (e) {
      return defaultSummary;
    }
  }

  async getTimeline(params: {
    start_date?: string;
    end_date?: string;
    account_id?: string;
    account_type?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<CashFlowTimelineItem>> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 50;

    if (!isSupabaseConfigured() || !supabaseClient) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    try {
      // 1. Get summary to get initial opening balance
      const summary = await this.getSummary(params);

      // 2. Fetch all transactions in period chronologically
      let query = supabaseClient
        .from('financial_transactions')
        .select(`
          *,
          account:financial_accounts!financial_transactions_financial_account_id_fkey(name, account_type)
        `)
        .order('transaction_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (params.start_date) {
        query = query.gte('transaction_date', params.start_date);
      }
      if (params.end_date) {
        query = query.lte('transaction_date', params.end_date);
      }
      if (params.account_id) {
        query = query.eq('financial_account_id', params.account_id);
      }

      const { data, error } = await query;

      if (error || !data) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }

      // Filter by account_type if specified
      let filteredData = data;
      if (params.account_type) {
        filteredData = data.filter((t: any) => t.account?.account_type === params.account_type);
      }

      // Calculate running balance chronologically
      let currentRunningBalance = summary.opening_balance;
      const allTimelineItems: CashFlowTimelineItem[] = filteredData.map((t: any) => {
        const isCredit = t.direction === 'CREDIT';
        const inflow = isCredit ? parseFloat(t.amount) : 0;
        const outflow = !isCredit ? parseFloat(t.amount) : 0;

        currentRunningBalance += inflow - outflow;

        return {
          id: t.id,
          date: t.transaction_date,
          transaction_number: t.transaction_number,
          description: t.description || 'Transaction',
          category: t.transaction_type,
          transaction_type: t.transaction_type,
          direction: t.direction,
          account_name: t.account?.name || 'Unknown Account',
          account_type: t.account?.account_type || 'BANK',
          inflow,
          outflow,
          running_balance: currentRunningBalance,
        };
      });

      // Reverse so newest appears first for display, with accurate running balances intact
      const displayItems = [...allTimelineItems].reverse();

      const total = displayItems.length;
      const offset = (page - 1) * limit;
      const paginated = displayItems.slice(offset, offset + limit);

      return {
        data: paginated,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (e) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }
  }

  async getTrend(params: {
    start_date?: string;
    end_date?: string;
    account_id?: string;
    account_type?: string;
  }): Promise<CashFlowTrendPoint[]> {
    if (!isSupabaseConfigured() || !supabaseClient) return [];

    try {
      let query = supabaseClient
        .from('financial_transactions')
        .select(`
          transaction_date,
          amount,
          direction,
          account:financial_accounts!financial_transactions_financial_account_id_fkey(account_type)
        `)
        .order('transaction_date', { ascending: true });

      if (params.start_date) {
        query = query.gte('transaction_date', params.start_date);
      }
      if (params.end_date) {
        query = query.lte('transaction_date', params.end_date);
      }
      if (params.account_id) {
        query = query.eq('financial_account_id', params.account_id);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      let filtered = data;
      if (params.account_type) {
        filtered = data.filter((t: any) => t.account?.account_type === params.account_type);
      }

      // Group by date
      const map = new Map<string, { inflow: number; outflow: number }>();
      for (const row of filtered) {
        const d = row.transaction_date;
        const amt = parseFloat(row.amount);
        const curr = map.get(d) || { inflow: 0, outflow: 0 };
        if (row.direction === 'CREDIT') {
          curr.inflow += amt;
        } else {
          curr.outflow += amt;
        }
        map.set(d, curr);
      }

      const points: CashFlowTrendPoint[] = Array.from(map.entries()).map(([date, vals]) => ({
        date,
        inflow: vals.inflow,
        outflow: vals.outflow,
        net: vals.inflow - vals.outflow,
      }));

      return points.sort((a, b) => a.date.localeCompare(b.date));
    } catch (e) {
      return [];
    }
  }
}
