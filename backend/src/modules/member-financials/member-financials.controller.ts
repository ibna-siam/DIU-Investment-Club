import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';

export class MemberFinancialsController {
  async getMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (isSupabaseConfigured() && supabaseClient) {
        const { data, error } = await supabaseClient.rpc('get_member_financial_metrics');
        if (error) throw new Error(error.message);
        res.status(200).json({ success: true, data });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          total_members: 0,
          active_members: 0,
          total_outstanding_dues: 0,
          collected_this_month: 0,
          total_membership_revenue: 0,
          overdue_amount: 0,
          overdue_dues_count: 0,
          payment_methods: [],
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getRevenueOverview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (isSupabaseConfigured() && supabaseClient) {
        const { data, error } = await supabaseClient.rpc('get_club_revenue_overview');
        if (error) throw new Error(error.message);
        res.status(200).json({ success: true, data });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          membership_revenue: 0,
          donation_revenue: 0,
          sponsorship_revenue: 0,
          event_ticket_revenue: 0,
          other_revenue: 0,
          total_club_revenue: 0,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const memberFinancialsController = new MemberFinancialsController();
