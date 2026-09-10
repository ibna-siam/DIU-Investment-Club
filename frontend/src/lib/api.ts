const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export class ApiError extends Error {
  code: string;
  details?: any;
  status: number;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', status: number = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// In-flight GET request deduplication map to prevent redundant concurrent queries
const inFlightGetRequests = new Map<string, Promise<any>>();

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('diu_auth_token') : null;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  // If FormData, remove any accidentally supplied application/json header
  if (isFormData && headers['Content-Type'] === 'application/json') {
    delete headers['Content-Type'];
  }

  // Request timeout safety (15 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('diu_auth_token');
        localStorage.removeItem('diu_auth_user');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?session_expired=true';
        }
      }

      const errorData = data.error || {};
      let message = errorData.message || data.message;
      if (!message) {
        if (response.status === 401) {
          message = 'Session expired. Please log in again.';
        } else if (response.status === 403) {
          message = 'You do not have permission for this action.';
        } else if (response.status === 404) {
          message = 'Requested resource not found.';
        } else if (response.status >= 502 && response.status <= 504) {
          message = 'Server temporarily unavailable. Please try again later.';
        } else if (response.status >= 500) {
          message = 'Server or database operation failed. Please try again.';
        } else {
          message = 'An error occurred while processing request';
        }
      }

      throw new ApiError(
        message,
        errorData.code || data.code || `HTTP_${response.status}`,
        response.status,
        errorData.details || data.details
      );
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  get: <T>(endpoint: string): Promise<T> => {
    // Deduplicate concurrent in-flight GET requests for the same endpoint
    if (inFlightGetRequests.has(endpoint)) {
      return inFlightGetRequests.get(endpoint) as Promise<T>;
    }

    const promise = request<T>(endpoint, { method: 'GET' }).finally(() => {
      inFlightGetRequests.delete(endpoint);
    });

    inFlightGetRequests.set(endpoint, promise);
    return promise;
  },
  post: <T>(endpoint: string, body?: any, options?: { idempotencyKey?: string }) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers: Record<string, string> = {};
    if (options?.idempotencyKey) {
      headers['X-Idempotency-Key'] = options.idempotencyKey;
    }

    return request<T>(endpoint, {
      method: 'POST',
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },
  put: <T>(endpoint: string, body?: any) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>(endpoint, {
      method: 'PUT',
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },
  patch: <T>(endpoint: string, body?: any) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>(endpoint, {
      method: 'PATCH',
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },
  delete: <T>(endpoint: string, options?: { body?: any }) =>
    request<T>(endpoint, {
      method: 'DELETE',
      body: options?.body ? JSON.stringify(options.body) : undefined,
    }),
};
