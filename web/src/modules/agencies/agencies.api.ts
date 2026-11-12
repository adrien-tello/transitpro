import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminAgencyDetail,
  AdminAgencyRow,
  AdminPaymentRow,
  AdminPayoutAgencyRow,
  AgencyDocumentView,
  AgencyPayouts,
  AgencyRegistered,
  AgencyStatus,
  BranchRow,
  DocumentType,
  Paginated,
  PayoutAccount,
  PayoutView,
  PendingAgency,
  PlatformOverview,
} from '@contracts/api-types';
import { ApiError, api, http } from '../../lib/api';
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

// ─── Documents (owner) ───
export function useMyDocuments(enabled = true) {
  return useQuery({ queryKey: keys.myDocuments, queryFn: () => api.get<AgencyDocumentView[]>('/agencies/me/documents'), enabled });
}

// Photos are made smaller before upload (a phone photo is 4-8 MB); PDFs are sent as they are (max 5 MB)
export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, file }: { type: DocumentType; file: File }) => {
      const isPdf = file.type === 'application/pdf';
      if (!isPdf && !file.type.startsWith('image/')) throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Choose a photo or a PDF');
      if (isPdf && file.size > 5 * 1024 * 1024) throw new ApiError(413, 'TOO_LARGE', 'This PDF is bigger than 5 MB');
      const body = isPdf ? file : await shrinkImage(file);
      const res = await http.put<{ data: AgencyDocumentView }>(`/agencies/me/documents/${type}`, body, {
        headers: { 'Content-Type': isPdf ? 'application/pdf' : 'image/jpeg' },
      });
      return res.data.data;
    },
    onSuccess: (doc) => {
      qc.setQueryData<AgencyDocumentView[]>(keys.myDocuments, (list) => [...(list ?? []).filter((d) => d.type !== doc.type), doc]);
    },
  });
}

async function shrinkImage(file: File, max = 2000): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read the photo'))), 'image/jpeg', 0.85));
}

// The file opens in a new tab, through the server (owner or TransitPro team only)
export const documentFileUrl = (id: string) => `/api/agencies/documents/${encodeURIComponent(id)}/file`;

export function useResubmit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/agencies/me/resubmit'),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

// ─── Payouts: agency side ───
export function useMyPayouts(enabled = true) {
  return useQuery({
    queryKey: keys.myPayouts,
    queryFn: () => api.get<AgencyPayouts>('/payouts/mine'),
    enabled,
    refetchInterval: (q) => (q.state.data?.payouts.some((p) => p.status === 'PENDING' || p.status === 'PROCESSING') ? 4000 : false),
  });
}

export function useSetPayoutAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PayoutAccount) => api.put<PayoutAccount>('/agencies/me/payout-account', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.myPayouts }),
  });
}

// ─── TransitPro team ───
export interface AdminAgencyFilters {
  status?: AgencyStatus;
  q?: string;
  page: number;
}
export function useAdminAgencies(filters: AdminAgencyFilters) {
  return useQuery({
    queryKey: keys.adminAgencies(filters),
    queryFn: () => api.get<Paginated<AdminAgencyRow>>('/agencies/admin/list', { ...filters }),
    placeholderData: keepPreviousData,
  });
}

export function useAdminAgency(id: string | null) {
  return useQuery({ queryKey: keys.adminAgency(id ?? ''), queryFn: () => api.get<AdminAgencyDetail>(`/agencies/admin/${id}`), enabled: !!id });
}

export function useSuspendAgency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; suspend: boolean; reason?: string }) =>
      v.suspend ? api.post(`/agencies/admin/${v.id}/suspend`, { reason: v.reason }) : api.post(`/agencies/admin/${v.id}/reactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export interface AdminPaymentFilters {
  status?: AdminPaymentRow['status'];
  method?: AdminPaymentRow['method'];
  purpose?: AdminPaymentRow['purpose'];
  q?: string;
  page: number;
}
export function useAdminPayments(filters: AdminPaymentFilters) {
  return useQuery({
    queryKey: keys.adminPayments(filters),
    queryFn: () => api.get<Paginated<AdminPaymentRow>>('/agencies/admin/payments', { ...filters }),
    placeholderData: keepPreviousData,
    refetchInterval: (q) => (q.state.data?.items.some((p) => p.status === 'PENDING') ? 5000 : false),
  });
}

export function usePayoutAgencies() {
  return useQuery({ queryKey: keys.payoutAgencies, queryFn: () => api.get<AdminPayoutAgencyRow[]>('/payouts/admin/agencies') });
}

export function usePayoutHistory(filters: { kind?: PayoutView['kind']; page: number }) {
  return useQuery({
    queryKey: keys.payoutHistory(filters),
    queryFn: () => api.get<Paginated<PayoutView>>('/payouts/admin/history', { ...filters }),
    placeholderData: keepPreviousData,
    // While a transfer is on its way, follow it: the row turns Sent or Failed by itself
    refetchInterval: (q) => (q.state.data?.items.some((p) => p.status === 'PENDING' || p.status === 'PROCESSING') ? 4000 : false),
  });
}

export function usePayAgency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { agencyId: string; amount?: number }) => api.post<PayoutView>(`/payouts/admin/agencies/${v.agencyId}`, v.amount ? { amount: v.amount } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'payouts'] }),
  });
}

// The owner withdraws (whole balance by default). The list then follows the transfer by itself.
export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount?: number) => api.post<PayoutView>('/payouts/mine/withdraw', amount ? { amount } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.myPayouts }),
  });
}
