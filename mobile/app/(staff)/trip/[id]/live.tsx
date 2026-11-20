// Driver · On the road, opened after "Start trip" or from the "Sharing live location" card.
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useStaffMe } from '@/modules/staff/use-staff-me';
import { OnTheRoadScreen } from '@/modules/staff/components/OnTheRoadScreen';

export default function OnTheRoadRoute() {
  const me = useStaffMe();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!me || me.role !== 'DRIVER' || !id) return null;
  return <OnTheRoadScreen tripId={String(id)} />;
}
