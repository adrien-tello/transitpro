import axios, { AxiosError } from 'axios';

// The ONLY way the dashboard talks to the server.
// - withCredentials sends the httpOnly session cookie. Never store a token in localStorage.
// - In development Vite forwards /api to the server on :4000, so the cookie is same-origin.
// - Every answer is { data } or { error: { code, message, details } }: callers get `data` directly,
//   or an ApiError they can show (error.message is already a sentence for the user).

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: { code?: string; message?: string; details?: Record<string, string[]> } }>) => {
    if (err.response) {
      const e = err.response.data?.error ?? {};
      return Promise.reject(new ApiError(err.response.status, e.code ?? 'UNKNOWN', e.message ?? 'Something went wrong', e.details));
    }
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    return Promise.reject(
      new ApiError(0, offline ? 'OFFLINE' : 'NETWORK', offline ? 'No internet connection' : 'The server cannot be reached, try again'),
    );
  },
);

export const api = {
  get: async <T>(url: string, params?: Record<string, unknown>) => (await http.get<{ data: T }>(url, { params })).data.data,
  post: async <T>(url: string, body?: unknown) => (await http.post<{ data: T }>(url, body ?? {})).data.data,
  patch: async <T>(url: string, body?: unknown) => (await http.patch<{ data: T }>(url, body ?? {})).data.data,
  put: async <T>(url: string, body?: unknown) => (await http.put<{ data: T }>(url, body ?? {})).data.data,
};

// First message of a field from a 400 VALIDATION_ERROR, to show under the input
export function fieldError(error: unknown, field: string): string | undefined {
  return error instanceof ApiError ? error.details?.[field]?.[0] : undefined;
}

export const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Something went wrong, try again';
