import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { InvitePreview, SessionResponse } from '@contracts/api-types';
import { invitePreview as mockInvitePreview } from '@contracts/mocks';
import { authKeys } from '@/modules/auth/auth.queries';

// ── GET /hr/invites/:token (public) ────────────────────────────────────────────
export function useInvitePreview(token: string) {
  return useQuery<InvitePreview>({
    queryKey: ['hr', 'invites', token],
    queryFn: async () => {
      try {
        return await api<InvitePreview>(`/hr/invites/${encodeURIComponent(token)}`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return mockInvitePreview;
        throw e;
      }
    },
    enabled: !!token,
    retry: false,
  });
}

// ── POST /hr/invites/:token/accept { password } ────────────────────────────────
export function useAcceptInvite(token: string) {
  const qc = useQueryClient();
  return useMutation<SessionResponse, ApiError, { password: string }>({
    mutationFn: (body) => api<SessionResponse>(`/hr/invites/${encodeURIComponent(token)}/accept`, { method: 'POST', body }),
    onSuccess: (data) => qc.setQueryData(authKeys.me, data.user),
  });
}
