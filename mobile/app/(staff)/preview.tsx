// Developer shortcut: open /preview to land on the staff app.
// Preview mode (EXPO_PUBLIC_STAFF_MOCKS=1 + EXPO_PUBLIC_STAFF_PREVIEW=DRIVER|COURIER, never in a release):
// the fake staff user is put in the /auth/me cache, so the normal gate in app/_layout.tsx opens the
// staff screens without a server. Without preview mode this page only redirects (the login gate applies).
import React, { useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/modules/auth/auth.queries';
import { previewMe } from '@/modules/staff/use-staff-me';

export default function StaffPreview() {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  // Optional ?as=DRIVER|COURIER picks the role, ?next=/deliver/TP-DLA-48230 opens one screen directly.
  const { next, as } = useLocalSearchParams<{ next?: string; as?: string }>();

  useEffect(() => {
    const me = previewMe(as);
    if (!me) return setReady(true);
    // Stop the real /auth/me call first, so its network error cannot replace the preview user.
    qc.cancelQueries({ queryKey: authKeys.me }).finally(() => {
      qc.setQueryData(authKeys.me, me);
      setReady(true);
    });
  }, [qc, as]);

  const target = typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/(staff)/(tabs)';

  if (!ready) return null;
  return <Redirect href={target as never} />;
}
