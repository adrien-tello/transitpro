import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Paginated,
  ParcelDetail,
  ParcelHoldReleased,
  ParcelListItem,
  ParcelRegistered,
  ParcelStatus,
  PaymentMethod,
  UploadResult,
} from '@contracts/api-types';
import { api, http } from '../../lib/api';
import { keys } from '../../lib/queryClient';

export interface ParcelFilters {
  status?: ParcelStatus;
  q?: string;
  page: number;
  limit?: number;
}

// The list keeps the previous page on screen while the next one loads (no flicker when paging / filtering)
export function useParcels(filters: ParcelFilters) {
  return useQuery({
    queryKey: keys.parcels(filters),
    queryFn: () => api.get<Paginated<ParcelListItem>>('/parcels', { ...filters, limit: filters.limit ?? 20 }),
    placeholderData: keepPreviousData,
  });
}

// Only the total, for counters (dashboard, sidebar)
export function useParcelCount(status: ParcelStatus) {
  return useQuery({
    queryKey: keys.parcels({ count: status }),
    queryFn: async () => (await api.get<Paginated<ParcelListItem>>('/parcels', { status, limit: 1, page: 1 })).total,
  });
}

// While a Mobile Money payment is PENDING, the detail refreshes every 3 s by itself
// (the server asks Notch Pay), then stops as soon as it is settled.
export function useParcel(id: string) {
  return useQuery({
    queryKey: keys.parcel(id),
    queryFn: () => api.get<ParcelDetail>(`/parcels/${encodeURIComponent(id)}`),
    refetchInterval: (q) => (q.state.data?.payments.some((p) => p.status === 'PENDING') ? 3000 : false),
  });
}

// Every action answers the full parcel: put it in the cache, refresh the lists
function useParcelAction<V>(fn: (v: V) => Promise<ParcelDetail>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (parcel) => {
      qc.setQueryData(keys.parcel(parcel.id), parcel);
      qc.setQueryData(keys.parcel(parcel.trackingCode), parcel);
      qc.invalidateQueries({ queryKey: keys.parcels() });
    },
  });
}

export interface RegisterParcelBody {
  destinationBranchId: string;
  originBranchId?: string;
  senderName: string;
  senderPhone: string;
  senderEmail?: string;
  receiverName: string;
  receiverPhone: string;
  receiverEmail?: string;
  declaredContents: string;
  declaredValue: number;
  weightKg: number;
  sealNumber: string;
  photoUrls: string[];
  homeDelivery: boolean;
  deliveryAddress?: string;
  insured: boolean;
  codAmount?: number;
  paymentMethod: PaymentMethod;
  payerPhone?: string;
}

export function useRegisterParcel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RegisterParcelBody) => api.post<ParcelRegistered>('/parcels', body),
    onSuccess: (r) => {
      qc.setQueryData(keys.parcel(r.parcel.id), r.parcel);
      qc.invalidateQueries({ queryKey: keys.parcels() });
    },
  });
}

export const useScan = (id: string) =>
  useParcelAction((body: { type: 'ARRIVED'; weightKg: number } | { type: 'DEPARTED' } | { type: 'LOADED'; tripId: string } | { type: 'HANDED_TO_COURIER'; courierId: string }) =>
    api.post<ParcelDetail>(`/parcels/${id}/scan`, body),
  );
export const useFeePayment = (id: string) =>
  useParcelAction((body: { method: PaymentMethod; payerPhone?: string }) => api.post<ParcelDetail>(`/parcels/${id}/fee-payment`, body));
export const useCodPayment = (id: string) =>
  useParcelAction((body: { method: PaymentMethod; payerPhone?: string }) => api.post<ParcelDetail>(`/parcels/${id}/cod-payment`, body));
export const useDeliver = (id: string) => useParcelAction((body: { otp: string }) => api.post<ParcelDetail>(`/parcels/${id}/deliver`, body));
export const useRefuse = (id: string) => useParcelAction((body: { reason: string }) => api.post<ParcelDetail>(`/parcels/${id}/refuse`, body));

export function useReleaseHold(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { note: string }) => api.post<ParcelHoldReleased>(`/parcels/${id}/release-hold`, body),
    onSuccess: (r) => {
      qc.setQueryData(keys.parcel(r.parcel.id), r.parcel);
      qc.invalidateQueries({ queryKey: keys.parcels() });
    },
  });
}

// Photos: shrink in the browser (max 1600 px, JPEG ~80%) before sending, so uploads stay fast on 3G
export async function uploadPhoto(file: File): Promise<string> {
  const blob = await shrink(file);
  const res = await http.post<{ data: UploadResult }>('/uploads', blob, { headers: { 'Content-Type': 'image/jpeg' } });
  return res.data.data.url;
}

async function shrink(file: File, max = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read the photo'))), 'image/jpeg', 0.8));
}
