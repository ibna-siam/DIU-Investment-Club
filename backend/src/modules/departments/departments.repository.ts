import { getDbAdmin, supabaseClient, isSupabaseConfigured } from '../../config/supabase';

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

// In-memory cache for ultra-fast response without DB load
let cachedDepartments: Department[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class DepartmentsRepository {
  private invalidateCache() {
    cachedDepartments = null;
    cacheTimestamp = 0;
  }

  async findAll(options?: { activeOnly?: boolean; faculty?: string; search?: string }): Promise<Department[]> {
    const now = Date.now();
    let departments: Department[];

    // Check memory cache
    if (cachedDepartments && now - cacheTimestamp < CACHE_TTL_MS) {
      departments = cachedDepartments;
    } else {
      const client = isSupabaseConfigured() && supabaseClient ? supabaseClient : getDbAdmin();
      const { data, error } = await client
        .from('departments')
        .select('*')
        .order('faculty', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('official_name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch departments: ${error.message}`);
      }

      departments = (data || []) as Department[];
      cachedDepartments = departments;
      cacheTimestamp = now;
    }

    // Filter in-memory for instant speed
    let result = departments;

    if (options?.activeOnly !== false) {
      result = result.filter((d) => d.active);
    }

    if (options?.faculty) {
      const facultyLower = options.faculty.toLowerCase();
      result = result.filter((d) => d.faculty.toLowerCase().includes(facultyLower));
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.official_name.toLowerCase().includes(q) ||
          d.faculty.toLowerCase().includes(q) ||
          (d.code && d.code.toLowerCase().includes(q))
      );
    }

    return result;
  }

  async findById(id: string): Promise<Department | null> {
    const client = isSupabaseConfigured() && supabaseClient ? supabaseClient : getDbAdmin();
    const { data, error } = await client
      .from('departments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as Department | null;
  }

  async findByOfficialName(name: string): Promise<Department | null> {
    const trimmed = name.trim();
    // Fast path from cache if available
    if (cachedDepartments) {
      const match = cachedDepartments.find(
        (d) => d.official_name.toLowerCase() === trimmed.toLowerCase()
      );
      if (match) return match;
    }

    const client = isSupabaseConfigured() && supabaseClient ? supabaseClient : getDbAdmin();
    const { data, error } = await client
      .from('departments')
      .select('*')
      .ilike('official_name', trimmed)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as Department | null;
  }

  async create(data: {
    official_name: string;
    faculty: string;
    code?: string;
    active?: boolean;
    sort_order?: number;
  }): Promise<Department> {
    const admin = getDbAdmin();
    const { data: created, error } = await admin
      .from('departments')
      .insert({
        official_name: data.official_name.trim(),
        faculty: data.faculty.trim(),
        code: data.code?.trim() || null,
        active: data.active !== undefined ? data.active : true,
        sort_order: data.sort_order !== undefined ? data.sort_order : 0,
      })
      .select('*')
      .single();

    if (error) throw new Error(`Failed to create department: ${error.message}`);
    this.invalidateCache();
    return created as Department;
  }

  async update(
    id: string,
    data: Partial<{
      official_name: string;
      faculty: string;
      code?: string | null;
      active: boolean;
      sort_order: number;
    }>
  ): Promise<Department> {
    const admin = getDbAdmin();
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.official_name !== undefined) payload.official_name = data.official_name.trim();
    if (data.faculty !== undefined) payload.faculty = data.faculty.trim();
    if (data.code !== undefined) payload.code = data.code ? data.code.trim() : null;
    if (data.active !== undefined) payload.active = data.active;
    if (data.sort_order !== undefined) payload.sort_order = data.sort_order;

    const { data: updated, error } = await admin
      .from('departments')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(`Failed to update department: ${error.message}`);
    this.invalidateCache();
    return updated as Department;
  }

  async delete(id: string): Promise<void> {
    const admin = getDbAdmin();
    const { error } = await admin.from('departments').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete department: ${error.message}`);
    this.invalidateCache();
  }
}

export const departmentsRepository = new DepartmentsRepository();
