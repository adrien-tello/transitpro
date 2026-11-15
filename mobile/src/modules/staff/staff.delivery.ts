// Courier · Delivery data (design 3.12 to 3.14). All these endpoints work on the server today.
//   GET  /parcels/:code                 → ParcelDetail (only for the courier holding it)
//   POST /parcels/:code/cod-payment     { method, payerPhone? } → ParcelDetail
//   POST /parcels/:code/deliver         { otp, photoUrl, lat, lng } → ParcelDetail
//   POST /parcels/:code/refuse          { reason } → ParcelDetail
//   POST /uploads?purpose=delivery      raw JPEG body → { url }
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_URL, ApiError, api } from '@/lib/api';
import type { ParcelDetail, PaymentMethod, PaymentView } from '@contracts/api-types';
import { USE_MOCKS, mockCourierParcels, mockDelay, mockStopDetail } from './staff.mock';
import { staffKeys } from './staff.queries';

export const deliveryKeys = {
  parcel: (code: string) => ['staff', 'parcels', 'detail', code] as const,
};

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // server limit (uploads.routes.ts)
const POLL_MS = 3000; // Mobile Money: the receiver approves on their phone

// The cash-on-delivery payment, if any (the parcel fee is a different payment).
export function codPayment(p: ParcelDetail): PaymentView | undefined {
  return [...p.payments].reverse().find((x) => x.purpose === 'COD_COLLECTION');
}

export function codSettled(p: ParcelDetail): boolean {
  return !p.codAmount || codPayment(p)?.status === 'SUCCEEDED';
}

// ── Queries and actions ───────────────────────────────────────────────────────

export function useParcelDetail(code: string) {
  return useQuery<ParcelDetail, ApiError>({
    queryKey: deliveryKeys.parcel(code),
    enabled: !!code,
    queryFn: () =>
      USE_MOCKS ? mockDelay(mockDetail(code)) : api<ParcelDetail>(`/parcels/${encodeURIComponent(code)}`),
    // While a Mobile Money payment waits for the receiver's approval, ask again every 3 s.
    refetchInterval: (q) => (q.state.data && codPayment(q.state.data)?.status === 'PENDING' ? POLL_MS : false),
  });
}

function useParcelAction<V>(code: string, send: (v: V) => Promise<ParcelDetail>) {
  const qc = useQueryClient();
  return useMutation<ParcelDetail, ApiError, V>({
    mutationFn: send,
    onSuccess: (p) => {
      qc.setQueryData(deliveryKeys.parcel(code), p);
      qc.invalidateQueries({ queryKey: staffKeys.myParcels });
      qc.invalidateQueries({ queryKey: staffKeys.courierDay });
    },
  });
}

export function useCodPayment(code: string) {
  return useParcelAction<{ method: PaymentMethod; payerPhone?: string }>(code, (body) =>
    USE_MOCKS
      ? mockDelay(mockCod(code, body.method))
      : api<ParcelDetail>(`/parcels/${encodeURIComponent(code)}/cod-payment`, { method: 'POST', body }),
  );
}

export function useDeliver(code: string) {
  return useParcelAction<{ otp: string; photoUrl: string; lat: number; lng: number }>(code, (body) =>
    USE_MOCKS
      ? mockDelay(mockDeliver(code, body.otp))
      : api<ParcelDetail>(`/parcels/${encodeURIComponent(code)}/deliver`, { method: 'POST', body }),
  );
}

export function useRefuse(code: string) {
  return useParcelAction<{ reason: string }>(code, (body) =>
    USE_MOCKS
      ? mockDelay(mockRefuse(code))
      : api<ParcelDetail>(`/parcels/${encodeURIComponent(code)}/refuse`, { method: 'POST', body }),
  );
}

// The handover photo goes up as raw bytes, which api() (JSON only) cannot send. Same rules as
// api(): the httpOnly session cookie (credentials: 'include'), no token anywhere, same error shape.
export async function uploadDeliveryPhoto(uri: string): Promise<string> {
  if (USE_MOCKS) return mockDelay('https://example.com/delivery-photo.jpg', 900);
  const blob = await (await fetch(uri)).blob();
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(413, 'TOO_LARGE', 'The photo is too big. Take it again, a little further away.');
  }
  const res = await fetch(`${API_URL}/uploads?purpose=delivery`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json.error ?? {};
    throw new ApiError(res.status, err.code ?? 'UNKNOWN', err.message ?? 'The photo could not be sent', err.details);
  }
  return (json.data as { url: string }).url;
}

// ── Mocks (EXPO_PUBLIC_STAFF_MOCKS=1) ─────────────────────────────────────────
// The receiver's code is 1234 for every mock parcel. 5 wrong codes put it ON_HOLD, like the server.

const MOCK_OTP = '1234';
const mockStore: Record<string, ParcelDetail> = {};

function mockDetail(code: string): ParcelDetail {
  if (mockStore[code]) return mockStore[code];
  const item = mockCourierParcels.find((p) => p.trackingCode === code);
  if (!item) throw new ApiError(403, 'FORBIDDEN', 'Only the courier holding this parcel can open it');
  const extra = mockStopDetail[code];
  const staff = { id: 'emp_agent', name: 'Alice Ngo', jobTitle: 'Counter agent' };
  const at = item.createdAt;
  const detail: ParcelDetail = {
    ...item,
    sender: { name: item.senderName, phone: '+237677000001', email: null },
    receiver: { name: item.receiverName, phone: '+237690003312', email: null },
    declaredContents: 'Clothes',
    declaredValue: 25000,
    deliveryAddress: extra?.deliveryAddress ?? null,
    insured: false,
    price: { fee: 2500, insuranceFee: 0, total: 2500 },
    security: {
      sealNumber: extra?.sealNumber ?? 'S-0000',
      photoUrls: [],
      weightAtRegistrationKg: item.weightKg,
      weightAtArrivalKg: item.weightKg,
      weightDifferenceKg: 0,
      weightOk: true,
      deliveryAttempts: 0,
      maxAttempts: 5,
      codeExpiresAt: null,
    },
    trip: null,
    courier: item.currentHolder,
    registeredBy: staff,
    delivery: { deliveredAt: null, photoUrl: null, lat: null, lng: null },
    events: [],
    payments: [
      {
        id: `pay_fee_${code}`,
        purpose: 'PARCEL_FEE',
        method: 'MTN_MOMO',
        status: 'SUCCEEDED',
        amount: 2500,
        platformFee: 125,
        payerPhone: '+237677000001',
        failureReason: null,
        createdAt: at,
        settledAt: at,
      },
    ],
    escrow: null,
    claims: [],
  };
  mockStore[code] = detail;
  return detail;
}

function save(code: string, next: ParcelDetail): ParcelDetail {
  mockStore[code] = next;
  return next;
}

function mockCod(code: string, method: PaymentMethod): ParcelDetail {
  const p = mockDetail(code);
  if (!p.codAmount) throw new ApiError(400, 'BAD_REQUEST', 'Nothing to collect on this parcel');
  const now = new Date().toISOString();
  const pay: PaymentView = {
    id: `pay_cod_${code}`,
    purpose: 'COD_COLLECTION',
    method,
    status: 'SUCCEEDED', // mocks approve Mobile Money at once
    amount: p.codAmount,
    platformFee: 0,
    payerPhone: null,
    failureReason: null,
    createdAt: now,
    settledAt: now,
  };
  return save(code, {
    ...p,
    payments: [...p.payments, pay],
    escrow: { amount: p.codAmount, status: 'HELD', beneficiaryPhone: p.sender.phone, releasedAt: null },
  });
}

function mockDeliver(code: string, otp: string): ParcelDetail {
  const p = mockDetail(code);
  if (p.status === 'ON_HOLD') throw new ApiError(400, 'BAD_REQUEST', 'This parcel is on hold');
  if (!codSettled(p)) throw new ApiError(400, 'BAD_REQUEST', `The receiver must first pay the cash on delivery (${p.codAmount} FCFA)`);
  if (otp !== MOCK_OTP) {
    const attempts = p.security.deliveryAttempts + 1;
    const locked = attempts >= p.security.maxAttempts;
    save(code, { ...p, status: locked ? 'ON_HOLD' : p.status, security: { ...p.security, deliveryAttempts: attempts } });
    throw new ApiError(
      400,
      'BAD_REQUEST',
      locked
        ? 'Wrong code. 5 wrong codes: the parcel is now ON HOLD for the branch manager'
        : `Wrong code. ${p.security.maxAttempts - attempts} tries left`,
    );
  }
  const now = new Date().toISOString();
  return save(code, {
    ...p,
    status: 'DELIVERED',
    currentHolder: null,
    delivery: { ...p.delivery, deliveredAt: now },
  });
}

function mockRefuse(code: string): ParcelDetail {
  const p = mockDetail(code);
  return save(code, { ...p, status: 'REFUSED' });
}
