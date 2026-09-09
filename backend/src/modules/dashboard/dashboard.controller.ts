import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { usersRepository } from '../users/users.repository';
import { financialEngineService } from '../financial-engine/financial-engine.service';

export class DashboardController {
  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const [stats, financialMetrics] = await Promise.all([
        usersRepository.getStats(),
        financialEngineService.getDashboardMetrics(),
      ]);
      const user = req.user;

      res.status(200).json({
        success: true,
        data: {
          financial: financialMetrics,
          overview: {
            activeUsers: stats.activeUsers,
            totalUsers: stats.totalUsers,
            totalRoles: stats.totalRoles,
            systemStatus: stats.systemStatus,
          },
          roleDistribution: stats.roleDistribution,
          currentUser: {
            id: user?.id,
            name: user?.full_name,
            email: user?.email,
            roles: user?.roles?.map((r) => ({ id: r.id, name: r.name, slug: r.slug })),
            permissionsCount: user?.permissions?.length || 0,
          },
          systemHealth: {
            database: 'Connected',
            auth: 'Supabase RBAC Ready',
            version: '2.0.0',
            lastChecked: new Date().toISOString(),
          },
          recentActivity: financialMetrics.recent_transactions || [],
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const dashboardController = new DashboardController();
