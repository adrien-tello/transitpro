import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { CashCollectedRow, RemittanceRow } from '@contracts/api-types';
import { cashCollectedToday as mockCashCollected, myRemittances as mockMyRemittances, remittances as mockRemittances } from '@contracts/mocks';

export const financeKeys = {
  remittances: ['finance', 'remittances'] as const,
  cashCollected: ['finance', 'cashCollected'] as const,
};

// ── GET /finance/remittances (ACCOUNTANT, BRANCH_MANAGER, COURIER) ────────────
// A courier only sees their own rows. Screen: Staff · Cash "Handed to the branch".
export function useRemittances(enabled = true) {
  return useQuery<RemittanceRow[]>({
    queryKey: financeKeys.remittances,
    queryFn: async () => {
      try {
        return await api<RemittanceRow[]>('/finance/remittances');
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return mockMyRemittances.length ? mockMyRemittances : mockRemittances;
        throw e;
      }
    },
    enabled,
    staleTime: 30_000,
  });
}

// ── GET /parcels/mine/cash-collected (COURIER) ─────────────────────────────────
export function useCashCollected(enabled = true) {
  return useQuery<CashCollectedRow[]>({
    queryKey: financeKeys.cashCollected,
    queryFn: async () => {
      try {
        return await api<CashCollectedRow[]>('/parcels/mine/cash-collected');
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return mockCashCollected;
        throw e;
      }
    },
    enabled,
    staleTime: 15_000,
  });
}
