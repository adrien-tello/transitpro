import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Google from 'expo-auth-session/providers/google';
import { api, ApiError } from '@/lib/api';
import type { Me, OkResponse, SessionResponse } from '@contracts/api-types';

export const authKeys = {
  me: ['auth', 'me'] as const,
};

// ── GET /auth/me ──────────────────────────────────────────────────────────────
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

// ── POST /auth/google ─────────────────────────────────────────────────────────
export function useGoogleSignIn() {
  const qc = useQueryClient();
  return useMutation<SessionResponse, ApiError, { idToken: string }>({
    mutationFn: (body) =>
      api<SessionResponse>('/auth/google', { method: 'POST', body }),
    onSuccess: (data) => {
      qc.setQueryData(authKeys.me, data.user);
    },
  });
}

// ── Google Sign-In (Expo) ──────────────────────────────────────────────────────
// Opens the Google consent screen in a browser/WebView, gets an ID token,
// then sends it to POST /auth/google. The server verifies the token with Google
// and sets the session cookie — same as the web app.
export function useGoogleAuth() {
  const googleSignIn = useGoogleSignIn();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
  });

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.idToken) {
      googleSignIn.mutate({ idToken: response.authentication.idToken });
    }
  }, [response]);

  return {
    promptAsync: () => promptAsync(),
    isPending: googleSignIn.isPending,
    error: googleSignIn.error,
    ready: !!request,
  };
}

// ── POST /auth/password/forgot ────────────────────────────────────────────────
export function useForgotPassword() {
  return useMutation<OkResponse, ApiError, { email: string }>({
    mutationFn: (body) =>
      api<OkResponse>('/auth/password/forgot', { method: 'POST', body }),
  });
}

// ── POST /auth/password/reset ─────────────────────────────────────────────────
export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation<SessionResponse, ApiError, { email: string; code: string; password: string }>({
    mutationFn: (body) =>
      api<SessionResponse>('/auth/password/reset', { method: 'POST', body }),
    onSuccess: (data) => {
      qc.setQueryData(authKeys.me, data.user);
    },
  });
}

// ── POST /auth/password/change ────────────────────────────────────────────────
export function useChangePassword() {
  const qc = useQueryClient();
  return useMutation<SessionResponse, ApiError, { currentPassword?: string; newPassword: string }>({
    mutationFn: (body) =>
      api<SessionResponse>('/auth/password/change', { method: 'POST', body }),
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

// ── POST /auth/logout-all ─────────────────────────────────────────────────────
export function useLogoutAll() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: () => api<void>('/auth/logout-all', { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData(authKeys.me, null);
      qc.clear();
    },
  });
}
