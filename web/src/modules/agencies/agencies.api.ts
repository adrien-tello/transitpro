import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AgencyRegistered, BranchRow, PendingAgency, PlatformOverview } from '@contracts/api-types';
import { api } from '../../lib/api';
import { keys } from '../../lib/queryClient';

// Branches change rarely: cached 10 minutes (destination lists, sidebar, filters)
export function useBranches(enabled = true) {
  return useQuery({ queryKey: keys.branches, queryFn: () => api.get<BranchRow[]>('/agencies/me/branches'), staleTime: 10 * 60_000, enabled });
}

export function useAddBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; city: string; address: string }) => api.post<BranchRow>('/agencies/me/branches', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.branches }),
  });
}

// ─── TransitPro team ───
export function usePendingAgencies(enabled = true) {
  return useQuery({ queryKey: keys.pendingAgencies, queryFn: () => api.get<PendingAgency[]>('/agencies/admin/pending'), enabled });
}

// Platform numbers for the TransitPro team's overview
export function usePlatformOverview() {
  return useQuery({ queryKey: keys.overview, queryFn: () => api.get<PlatformOverview>('/agencies/admin/overview'), refetchInterval: 60_000 });
}

export function useDecideAgency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; approve: boolean; reason?: string }) =>
      v.approve
        ? api.post<AgencyRegistered['agency']>(`/agencies/admin/${v.id}/approve`)
        : api.post<AgencyRegistered['agency']>(`/agencies/admin/${v.id}/reject`, { reason: v.reason }),
    // Remove it from the list at once (optimistic), then refresh from the server
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: keys.pendingAgencies });
      const before = qc.getQueryData<PendingAgency[]>(keys.pendingAgencies);
      qc.setQueryData<PendingAgency[]>(keys.pendingAgencies, (list) => list?.filter((a) => a.id !== v.id));
      return { before };
    },
    onError: (_e, _v, ctx) => ctx?.before && qc.setQueryData(keys.pendingAgencies, ctx.before),
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin'] }), // the list and the overview counters
  });
}
