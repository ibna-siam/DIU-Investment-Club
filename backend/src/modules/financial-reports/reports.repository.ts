import { getDbAdmin } from '../../config/supabase';
import {
  IncomeStatementReport,
  BalanceSheetReport,
  CashFlowStatementReport,
  BudgetVsActualReport,
  EventFinancialReportsData,
  MemberRevenueReport,
  DonationReport,
  SponsorshipReport,
  FinancialAnalyticsSummary,
  ReportSnapshot,
} from '../../types';

export class FinancialReportsRepository {
  async getIncomeStatement(
    startDate?: string,
    endDate?: string,
    compStartDate?: string,
    compEndDate?: string
  ): Promise<IncomeStatementReport> {
    const { data, error } = await getDbAdmin().rpc('get_income_statement', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) throw error;
    const report = data as IncomeStatementReport;

    // Calculate comparison period if requested
    if (compStartDate && compEndDate) {
      const { data: compData, error: compErr } = await getDbAdmin().rpc('get_income_statement', {
        p_start_date: compStartDate,
        p_end_date: compEndDate,
      });

      if (!compErr && compData) {
        const comp = compData as IncomeStatementReport;
        const revChange = comp.total_revenue > 0
          ? ((report.total_revenue - comp.total_revenue) / comp.total_revenue) * 100
          : 0;
        const expChange = comp.total_expenses > 0
          ? ((report.total_expenses - comp.total_expenses) / comp.total_expenses) * 100
          : 0;
        const surChange = comp.net_surplus !== 0
          ? ((report.net_surplus - comp.net_surplus) / Math.abs(comp.net_surplus)) * 100
          : 0;

        report.comparison = {
          start_date: compStartDate,
          end_date: compEndDate,
          total_revenue: comp.total_revenue,
          total_expenses: comp.total_expenses,
          net_surplus: comp.net_surplus,
          revenue_change_percentage: Math.round(revChange * 100) / 100,
          expense_change_percentage: Math.round(expChange * 100) / 100,
          surplus_change_percentage: Math.round(surChange * 100) / 100,
        };
      }
    }

    return report;
  }

  async getBalanceSheet(asOfDate?: string): Promise<BalanceSheetReport> {
    const { data, error } = await getDbAdmin().rpc('get_balance_sheet', {
      p_as_of_date: asOfDate || null,
    });

    if (error) throw error;
    return data as BalanceSheetReport;
  }

  async getCashFlowStatement(startDate?: string, endDate?: string): Promise<CashFlowStatementReport> {
    const { data, error } = await getDbAdmin().rpc('get_cash_flow_statement', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) throw error;
    return data as CashFlowStatementReport;
  }

  async getBudgetVsActual(eventId?: string): Promise<BudgetVsActualReport> {
    const { data, error } = await getDbAdmin().rpc('get_budget_vs_actual', {
      p_event_id: eventId || null,
    });

    if (error) throw error;
    return data as BudgetVsActualReport;
  }

  async getEventFinancialReports(startDate?: string, endDate?: string): Promise<EventFinancialReportsData> {
    const { data, error } = await getDbAdmin().rpc('get_event_financial_reports', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) throw error;
    return data as EventFinancialReportsData;
  }

  async getMemberRevenueReport(startDate?: string, endDate?: string): Promise<MemberRevenueReport> {
    const { data, error } = await getDbAdmin().rpc('get_member_revenue_report', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) throw error;
    return data as MemberRevenueReport;
  }

  async getDonationReport(startDate?: string, endDate?: string): Promise<DonationReport> {
    const { data, error } = await getDbAdmin().rpc('get_donation_report', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) throw error;
    return data as DonationReport;
  }

  async getSponsorshipReport(startDate?: string, endDate?: string): Promise<SponsorshipReport> {
    const { data, error } = await getDbAdmin().rpc('get_sponsorship_report', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) throw error;
    return data as SponsorshipReport;
  }

  async getFinancialAnalyticsSummary(): Promise<FinancialAnalyticsSummary> {
    const { data, error } = await getDbAdmin().rpc('get_financial_analytics_summary');
    if (error) throw error;
    return data as FinancialAnalyticsSummary;
  }

  async createSnapshot(data: {
    report_type: string;
    title: string;
    parameters: Record<string, any>;
    data_summary: Record<string, any>;
    created_by?: string;
  }): Promise<ReportSnapshot> {
    const { data: snapshot, error } = await getDbAdmin()
      .from('report_snapshots')
      .insert([data])
      .select('*, creator:created_by(full_name)')
      .single();

    if (error) throw error;

    return {
      ...snapshot,
      creator_name: snapshot.creator?.full_name || 'System Admin',
    };
  }

  async getSnapshots(reportType?: string): Promise<ReportSnapshot[]> {
    let query = getDbAdmin()
      .from('report_snapshots')
      .select('*, creator:created_by(full_name)')
      .order('created_at', { ascending: false });

    if (reportType) {
      query = query.eq('report_type', reportType);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((s: any) => ({
      ...s,
      creator_name: s.creator?.full_name || 'System Admin',
    }));
  }
}

export const financialReportsRepository = new FinancialReportsRepository();
