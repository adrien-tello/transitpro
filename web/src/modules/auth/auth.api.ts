import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AgencyRegistered, Me, OkResponse, SessionResponse } from '@contracts/api-types';
import { ApiError, api } from '../../lib/api';
import { keys } from '../../lib/queryClient';

// The session lives in an httpOnly cookie: the only way to know who is logged in is GET /auth/me.
// null = not logged in (401), so screens can redirect without treating it as an error.
export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: async (): Promise<Me | null> => {
      try {
        return await api.get<Me>('/auth/me');
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => api.post<SessionResponse>('/auth/login', body),
    // The cookie is set: read the full profile (role, agency status) before routing
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<OkResponse>('/auth/logout'),
    onSettled: () => {
      qc.clear(); // nothing of the previous user stays in the cache
      qc.setQueryData(keys.me, null);
    },
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (body: { email: string }) => api.post<OkResponse>('/auth/password/forgot', body) });
}

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; code: string; password: string }) => api.post<SessionResponse>('/auth/password/reset', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

export interface RegisterAgencyBody {
  agency: { name: string; headOffice: string; phone: string; email: string; rccmNumber?: string; niuNumber?: string };
  owner: { fullName: string; email: string; phone: string; password: string };
}

export function useRegisterAgency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RegisterAgencyBody) => api.post<AgencyRegistered>('/agencies/register', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}
