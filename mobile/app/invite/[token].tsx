// Invite · set password, opened from transitpro://invite/<token> (link in the invite SMS / email).
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { InviteScreen } from '@/modules/staff/components/InviteScreen';

export default function InviteRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  if (!token) return null;
  return <InviteScreen token={String(token)} />;
}
