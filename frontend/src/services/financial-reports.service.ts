import { api } from '../lib/api';
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
} from '../types/financial-reports';

function toQuery(params?: Record<string, any>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}

export const financialReportsService = {
  // Income Statement
  async getIncomeStatement(params?: {
    start_date?: string;
    end_date?: string;
    comp_start_date?: string;
    comp_end_date?: string;
  }): Promise<IncomeStatementReport> {
    const res = await api.get<any>(`/financial-reports/income-statement${toQuery(params)}`);
    return res.data;
  },

  // Balance Sheet
  async getBalanceSheet(params?: { as_of_date?: string }): Promise<BalanceSheetReport> {
    const res = await api.get<any>(`/financial-reports/balance-sheet${toQuery(params)}`);
    return res.data;
  },

  // Cash Flow Statement
  async getCashFlowStatement(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<CashFlowStatementReport> {
    const res = await api.get<any>(`/financial-reports/cash-flow-statement${toQuery(params)}`);
    return res.data;
  },

  // Budget vs Actual
  async getBudgetVsActual(params?: { event_id?: string }): Promise<BudgetVsActualReport> {
    const res = await api.get<any>(`/financial-reports/budget-vs-actual${toQuery(params)}`);
    return res.data;
  },

  // Event Financial Reports
  async getEventReports(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<EventFinancialReportsData> {
    const res = await api.get<any>(`/financial-reports/event-reports${toQuery(params)}`);
    return res.data;
  },

  // Member Revenue Reports
  async getMemberRevenue(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<MemberRevenueReport> {
    const res = await api.get<any>(`/financial-reports/member-revenue${toQuery(params)}`);
    return res.data;
  },

  // Donation Reports
  async getDonationReports(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<DonationReport> {
    const res = await api.get<any>(`/financial-reports/donations${toQuery(params)}`);
    return res.data;
  },

  // Sponsorship Reports
  async getSponsorshipReports(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<SponsorshipReport> {
    const res = await api.get<any>(`/financial-reports/sponsorships${toQuery(params)}`);
    return res.data;
  },

  // Financial Analytics Intelligence
  async getFinancialAnalytics(): Promise<FinancialAnalyticsSummary> {
    const res = await api.get<any>('/financial-reports/analytics');
    return res.data;
  },

  // Report Snapshots
  async createSnapshot(payload: {
    report_type: string;
    title: string;
    parameters: Record<string, any>;
    data_summary: Record<string, any>;
  }): Promise<ReportSnapshot> {
    const res = await api.post<any>('/financial-reports/snapshots', payload);
    return res.data;
  },

  async getSnapshots(reportType?: string): Promise<ReportSnapshot[]> {
    const res = await api.get<any>(`/financial-reports/snapshots${toQuery({ report_type: reportType })}`);
    return res.data || [];
  },
};
