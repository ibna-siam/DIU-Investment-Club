import { api } from '../lib/api';

export interface Department {
  id: string;
  official_name: string;
  faculty: string;
  code?: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// In-memory frontend cache for active departments to guarantee zero lag
let cachedActiveDepartments: Department[] | null = null;
let cachePromise: Promise<Department[]> | null = null;

export const departmentsService = {
  async getActiveDepartments(forceRefresh = false): Promise<Department[]> {
    if (!forceRefresh && cachedActiveDepartments) {
      return cachedActiveDepartments;
    }

    if (!forceRefresh && cachePromise) {
      return cachePromise;
    }

    cachePromise = api
      .get<any>('/departments')
      .then((res) => {
        const list = res.data || res || [];
        cachedActiveDepartments = list;
        cachePromise = null;
        return list;
      })
      .catch((err) => {
        cachePromise = null;
        throw err;
      });

    return cachePromise;
  },

  async getAllDepartments(): Promise<Department[]> {
    const res = await api.get<any>('/departments/all');
    return res.data || res || [];
  },

  async getDepartmentById(id: string): Promise<Department> {
    const res = await api.get<any>(`/departments/${id}`);
    return res.data;
  },

  async createDepartment(data: {
    official_name: string;
    faculty: string;
    code?: string;
    active?: boolean;
    sort_order?: number;
  }): Promise<Department> {
    const res = await api.post<any>('/departments', data);
    cachedActiveDepartments = null; // bust cache
    return res.data;
  },

  async updateDepartment(
    id: string,
    data: Partial<{
      official_name: string;
      faculty: string;
      code?: string | null;
      active: boolean;
      sort_order: number;
    }>
  ): Promise<Department> {
    const res = await api.put<any>(`/departments/${id}`, data);
    cachedActiveDepartments = null; // bust cache
    return res.data;
  },

  async deleteDepartment(id: string): Promise<void> {
    await api.delete<any>(`/departments/${id}`);
    cachedActiveDepartments = null; // bust cache
  },
};
