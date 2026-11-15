// Types for staff endpoints that are NOT in contracts/api-types.d.ts yet.
import type { ParcelStatus, PaymentMethod } from '@contracts/api-types';
// Copied exactly from the proposal in docs/tasks/fidel-staff-app.md (section 5).
// When the Lead adds them to contracts/, delete this file and import from '@contracts/api-types'.

// GET /booking/trips/driver   Staff · Driver Today, Trips
export type DriverTripStatus = 'SCHEDULED' | 'BOARDING' | 'DEPARTED' | 'ARRIVED' | 'CANCELLED';

export interface DriverTrip {
  id: string;
  code: string; // "TR-0802"
  status: DriverTripStatus;
  originCity: string;
  originBranch: string;
  destinationCity: string;
  destinationBranch: string;
  departureAt: string;
  arrivalEta: string;
  busPlate: string;
  passengers: { boarded: number; sold: number };
  parcels: { loaded: number; total: number };
}

// What Courier · Today needs from GET /parcels/:code (ParcelDetail).
// ParcelListItem has no address or seal, so each stop loads its detail.
export interface StopDetail {
  deliveryAddress: string | null;
  sealNumber: string;
}

// Courier · Today stat tiles. No endpoint gives these yet (to ask: Lead / Finance).
// null = unknown, shown as "–".
export interface CourierDay {
  delivered: number | null;
  refused: number | null;
  cashToRemit: number | null;
}

// ── Boarding (docs/tasks/fidel-staff-app.md 4.4, proposed contract for Joy) ──────────

// One row of GET /booking/trips/:id/manifest
export interface ManifestPassenger {
  ticketCode: string; // "TK-58104"
  passengerName: string;
  seatNumber: number;
  status: 'PAID' | 'BOARDED';
  boardedAt: string | null;
}

export type BoardingRefusal = 'NOT_FOUND' | 'WRONG_TRIP' | 'ALREADY_BOARDED' | 'NOT_PAID' | 'CANCELLED';

// GET /booking/tickets/:code/check?tripId=
export type BoardingCheck =
  | {
      ok: true;
      ticket: ManifestPassenger & { originCity: string; destinationCity: string; paymentMethod: PaymentMethod };
    }
  | { ok: false; reason: BoardingRefusal; message: string; boardedAt?: string; seatNumber?: number };

// POST /booking/tickets/:code/board { tripId }
export interface BoardingResult {
  ticketCode: string;
  seatNumber: number;
  passengerName: string;
  boardedAt: string;
  passengers: { boarded: number; sold: number }; // new counter, e.g. 59 / 62
}

// ── Parcel scan (driver loads a parcel on the bus) ───────────────────────────────────
// What the parcel sheet shows. Built from ParcelDetail when the server lets the driver read it
// (only parcels they carry), otherwise only the code is known until "Load on bus" answers.
export interface ParcelScanView {
  trackingCode: string;
  status: ParcelStatus;
  fromCity: string;
  fromBranch: string;
  toCity: string;
  homeDelivery: boolean;
  weightKg: number;
  sealNumber: string;
  feePaid: boolean;
}

// GET /booking/trips/:id/manifest   Staff · Passengers
export interface TripManifest {
  trip: DriverTrip;
  passengers: ManifestPassenger[]; // sorted by seat; only PAID and BOARDED tickets
}

// Stops shown on "On the road". No endpoint has intermediate stops yet: the real app
// shows origin and destination only.
export interface TripStop {
  city: string;
  plannedAt: string;
}

// Courier · Cash to remit. No endpoint yet (Finance will add one).
export interface CourierCash {
  inHand: number; // FCFA
  remitBefore: string; // "19:00"
  collected: { receiverName: string; trackingCode: string; at: string; amount: number }[];
  remitted: { date: string; amount: number; status: 'RECEIVED' | 'PENDING' }[];
}

// Staff · Profile stat cards. No endpoint yet.
export interface StaffStats {
  items: { label: string; value: string }[];
}
