// Courier · Delivery, opened from Today ("Start delivery") or by scanning a parcel label.
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useStaffMe } from '@/modules/staff/use-staff-me';
import { DeliveryScreen } from '@/modules/staff/components/DeliveryScreen';

export default function DeliverRoute() {
  const me = useStaffMe();
  const { code, scanned } = useLocalSearchParams<{ code: string; scanned?: string }>();
  // Couriers only. The server also refuses anyone who is not the parcel's current holder.
  if (!me || me.role !== 'COURIER' || !code) return null;
  return <DeliveryScreen code={String(code).toUpperCase()} scanned={scanned === '1'} />;
}
