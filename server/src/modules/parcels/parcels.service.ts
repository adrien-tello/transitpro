import type { ParcelTracking } from '@contracts/api-types';
import { notImplemented } from '../../lib/http-error';
import type { DeliverInput, RegisterParcelInput, ScanInput } from './parcels.schemas';

// Owner: Lead (Fanyi Charllson). Structure only, not built yet.
//
// This module answers the lecturer's questions. The rules to build:
//   Tracking ............ every handover is a new ParcelEvent row (who, when, where). Never edit or delete events.
//   Delivery guy ........ Parcel.currentHolderId always names one employee. Only the holder can hand over or deliver.
//   Not tampered ........ photos + sealNumber + weightAtRegistrationKg saved at registration;
//                         on ARRIVED the parcel is weighed again, a difference > 0.1 kg puts it ON_HOLD.
//   Payment received .... cash on delivery is held in Escrow (Finance module) and released
//                         only when the receiver's 4-digit code is correct.
//   Delivery code ....... generated when the parcel is ready (arrived for pickup, or out for delivery),
//                         sent by SMS, only its sha256 hash is stored (lib/codes.ts), max 5 wrong tries.
//
// Use prisma.$transaction when one action writes several tables (parcel + event + payment).

interface StaffContext {
  agencyId: string;
  employeeId: string;
}

export async function registerParcel(_input: RegisterParcelInput, _ctx: StaffContext): Promise<unknown> {
  throw notImplemented('Register a parcel');
}

export async function track(_code: string): Promise<ParcelTracking> {
  throw notImplemented('Public tracking');
}

export async function getForAgency(_id: string, _agencyId: string): Promise<unknown> {
  throw notImplemented('Parcel detail for staff');
}

export async function scan(_id: string, _input: ScanInput, _ctx: StaffContext): Promise<unknown> {
  throw notImplemented('Scan a handover');
}

export async function deliver(_id: string, _input: DeliverInput, _ctx: StaffContext): Promise<unknown> {
  throw notImplemented('Deliver with the receiver code');
}

export async function refuse(_id: string, _reason: string, _ctx: StaffContext): Promise<unknown> {
  throw notImplemented('Receiver refuses the parcel');
}
