import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { Me, SessionResponse } from '@contracts/api-types';

// ── Keys ──────────────────────────────────────────────────────────────────────
export const authKeys = {
  me: ['auth', 'me'] as const,
};

// ── GET /auth/me ──────────────────────────────────────────────────────────────
// Returns null (instead of throwing) when the user is not logged in (401).
export function useMe() {
  return useQuery<Me | null>({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        return await api<Me>('/auth/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

// ── POST /auth/login ──────────────────────────────────────────────────────────
export function useLogin() {
  const qc = useQueryClient();
  return useMutation<SessionResponse, ApiError, { email: string; password: string }>({
    mutationFn: ({ email, password }) =>
      api<SessionResponse>('/auth/login', { method: 'POST', body: { email, password } }),
    onSuccess: (data) => {
      qc.setQueryData(authKeys.me, data.user);
    },
  });
}

// ── POST /auth/register ───────────────────────────────────────────────────────
export function useRegister() {
  const qc = useQueryClient();
  return useMutation<
    SessionResponse,
    ApiError,
    { fullName: string; email: string; phone: string; password: string }
  >({
    mutationFn: (body) =>
      api<SessionResponse>('/auth/register', { method: 'POST', body }),
    onSuccess: (data) => {
      qc.setQueryData(authKeys.me, data.user);
    },
  });
}

// ── POST /auth/logout ─────────────────────────────────────────────────────────
export function useLogout() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData(authKeys.me, null);
      qc.clear();
    },
  });
}
