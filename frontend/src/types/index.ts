export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_system: boolean;
  created_at: string;
  permissionsCount?: number;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  name: string;
  description: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  student_id?: string | null;
  profile_image?: string | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  roles?: Role[];
  permissions?: string[];
}

export interface DashboardStats {
  overview: {
    activeUsers: number;
    totalUsers: number;
    totalRoles: number;
    systemStatus: string;
  };
  roleDistribution: Record<string, number>;
  currentUser: {
    id: string;
    name: string;
    email: string;
    roles: { id: string; name: string; slug: string }[];
    permissionsCount: number;
  };
  systemHealth: {
    database: string;
    auth: string;
    version: string;
    lastChecked: string;
  };
  recentActivity: any[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
