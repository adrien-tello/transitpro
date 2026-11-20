// Driver · Passengers, from Today ("Passengers scanned"), the checklist and the scanner.
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useStaffMe } from '@/modules/staff/use-staff-me';
import { PassengersScreen } from '@/modules/staff/components/PassengersScreen';

export default function PassengersRoute() {
  const me = useStaffMe();
  const { id } = useLocalSearchParams<{ id: string }>();
  // Drivers only. The server also checks the driver is assigned to this trip.
  if (!me || me.role !== 'DRIVER' || !id) return null;
  return <PassengersScreen tripId={String(id)} />;
}
