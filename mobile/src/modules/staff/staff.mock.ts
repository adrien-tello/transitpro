// Mock data for the staff app, used while EXPO_PUBLIC_STAFF_MOCKS=1.
// Values come from the design (Driver · Today, Courier · Today). Dates are built from "today"
// so the screens always have a trip / deliveries for the current day.
import type { ParcelListItem, StaffRef } from '@contracts/api-types';
import { ApiError } from '@/lib/api';
import type {
  BoardingCheck,
  CourierCash,
  StaffStats,
  TripManifest,
  TripStop,
  BoardingResult,
  CourierDay,
  DriverTrip,
  ManifestPassenger,
  ParcelScanView,
  StopDetail,
} from './staff.types';

export const USE_MOCKS = process.env.EXPO_PUBLIC_STAFF_MOCKS === '1';

// 400 ms so the skeletons are visible, like a real network call.
export function mockDelay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function todayAt(hours: number, minutes: number): string {
  return dayAt(0, hours, minutes);
}

// dayAt(1, 6, 0) = tomorrow 06:00, dayAt(-2, 13, 12) = two days ago 13:12
function dayAt(dayOffset: number, hours: number, minutes: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

// ── Driver ────────────────────────────────────────────────────────────────────
// Kept in a variable (not a const object literal per call) so "Start trip" can change the
// status and a refetch returns the new value, like the server would.
let driverTrips: DriverTrip[] = [
  {
    id: 'trp_0802',
    code: 'TR-0802',
    status: 'BOARDING',
    originCity: 'Douala',
    originBranch: 'Akwa',
    destinationCity: 'Bafoussam',
    destinationBranch: 'Bafoussam',
    departureAt: todayAt(8, 0),
    arrivalEta: todayAt(13, 0),
    busPlate: 'CE 118 KD',
    passengers: { boarded: 58, sold: 62 },
    parcels: { loaded: 21, total: 21 },
  },
  trip('trp_0809', 'TR-0809', 'SCHEDULED', ['Douala', 'Akwa'], ['Yaoundé', 'Mvan'], dayAt(1, 6, 0), dayAt(1, 10, 0), 'CE 118 KD', 70),
  trip('trp_0815', 'TR-0815', 'SCHEDULED', ['Douala', 'Akwa'], ['Kribi', 'Kribi'], dayAt(3, 9, 30), dayAt(3, 12, 30), 'LT 903 AA', 30),
  // Last trips
  trip('trp_0795', 'TR-0795', 'ARRIVED', ['Bafoussam', 'Bafoussam'], ['Douala', 'Akwa'], dayAt(-1, 8, 0), dayAt(-1, 13, 0), 'CE 118 KD', 58),
  trip('trp_0788', 'TR-0788', 'ARRIVED', ['Douala', 'Akwa'], ['Bafoussam', 'Bafoussam'], dayAt(-2, 8, 0), dayAt(-2, 13, 0), 'CE 118 KD', 61),
  trip('trp_0780', 'TR-0780', 'ARRIVED', ['Douala', 'Akwa'], ['Yaoundé', 'Mvan'], dayAt(-3, 6, 0), dayAt(-3, 10, 0), 'CE 118 KD', 66),
];

function trip(
  id: string,
  code: string,
  status: DriverTrip['status'],
  from: [string, string],
  to: [string, string],
  departureAt: string,
  arrivalEta: string,
  busPlate: string,
  sold: number,
): DriverTrip {
  const done = status === 'ARRIVED';
  return {
    id,
    code,
    status,
    originCity: from[0],
    originBranch: from[1],
    destinationCity: to[0],
    destinationBranch: to[1],
    departureAt,
    arrivalEta,
    busPlate,
    passengers: { boarded: done ? sold : 0, sold },
    parcels: { loaded: done ? 12 : 0, total: done ? 12 : 0 },
  };
}

// "On the road": Douala → Edéa → Bafoussam (only the mock knows the stop in between)
const tripStops: Record<string, TripStop[]> = {
  trp_0802: [
    { city: 'Douala', plannedAt: todayAt(8, 0) },
    { city: 'Edéa', plannedAt: todayAt(9, 10) },
    { city: 'Bafoussam', plannedAt: todayAt(13, 0) },
  ],
};

export function mockTripStops(tripId: string): TripStop[] | null {
  return tripStops[tripId] ?? null;
}

export function mockDriverTrips(): DriverTrip[] {
  return driverTrips.map((t) => ({ ...t }));
}

export function mockSetTripStatus(tripId: string, status: DriverTrip['status']): DriverTrip {
  driverTrips = driverTrips.map((t) => (t.id === tripId ? { ...t, status } : t));
  const trip = driverTrips.find((t) => t.id === tripId);
  if (!trip) throw new ApiError(400, 'BAD_REQUEST', 'Trip not found');
  return { ...trip };
}

// ── Courier ───────────────────────────────────────────────────────────────────
const bernard: StaffRef = { id: 'emp_bernard', name: 'Bernard Atangana', jobTitle: 'Courier' };
const douala = { city: 'Douala', branch: 'Akwa' };
const mvan = { city: 'Yaoundé', branch: 'Mvan' };

function courierParcel(
  n: number,
  receiverName: string,
  codAmount: number | null,
  handedAt: string,
  weightKg: number,
): ParcelListItem {
  return {
    id: `prc_${n}`,
    trackingCode: `TP-DLA-${n}`,
    status: 'OUT_FOR_DELIVERY',
    from: douala,
    to: mvan,
    senderName: 'Étoile Voyages customer',
    receiverName,
    weightKg,
    homeDelivery: true,
    codAmount,
    currentHolder: bernard,
    createdAt: todayAt(6, 20),
    updatedAt: handedAt,
  };
}

// Courier · Today in the design: next up Paul Ekane at 12:05, then Essos, Biyem-Assi, Mendong.
export const mockCourierParcels: ParcelListItem[] = [
  courierParcel(48230, 'Paul Ekane', null, todayAt(12, 5), 1.4),
  courierParcel(48236, 'Clarisse Mbia', null, todayAt(12, 40), 2.1),
  courierParcel(48244, 'Hervé Nana', 8500, todayAt(13, 20), 3.0),
  courierParcel(48251, 'Aïcha Bello', null, todayAt(14, 10), 0.8),
];

export const mockStopDetail: Record<string, StopDetail> = {
  'TP-DLA-48230': { deliveryAddress: 'Mvog-Ada, near the pharmacy', sealNumber: 'S-0061' },
  'TP-DLA-48236': { deliveryAddress: 'Essos', sealNumber: 'S-0064' },
  'TP-DLA-48244': { deliveryAddress: 'Biyem-Assi', sealNumber: 'S-0066' },
  'TP-DLA-48251': { deliveryAddress: 'Mendong', sealNumber: 'S-0069' },
};

// Delivered / refused today are not in GET /parcels/mine (it only lists parcels still held).
export const mockCourierDay: CourierDay = { delivered: 5, refused: 1, cashToRemit: 0 };

// ── Boarding ──────────────────────────────────────────────────────────────────
// Design 3.7: 58 boarded of 62, missing seats 7, 14, 22, 41. Scanning TK-58104 (Marie Ekane)
// gives "Valid ticket"; scanning it again gives "Already boarded".
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const NAMED: Record<number, [string, string]> = {
  1: ['Paul Essomba', 'TK-58002'],
  2: ['Grace Mballa', 'TK-58004'],
  3: ['Eric Tchinda', 'TK-58010'],
  4: ['Sandrine Mbida', 'TK-58015'],
  7: ['Hervé Nana', 'TK-58071'],
  14: ['Marie Ekane', 'TK-58104'],
  22: ['Clarisse Mbia', 'TK-58133'],
  41: ['Aïcha Bello', 'TK-58160'],
};
const FIRST = ['Jean', 'Brigitte', 'Samuel', 'Nadège', 'Patrick', 'Florence', 'Arnaud', 'Larissa', 'Didier', 'Estelle', 'Ibrahim', 'Mireille'];
const LAST = ['Ngono', 'Fouda', 'Kamga', 'Tchoua', 'Abena', 'Mvondo', 'Nkoulou', 'Essama', 'Djomo', 'Bekono', 'Yaya', 'Owona'];
const MISSING_SEATS = [7, 14, 22, 41];

let manifest: ManifestPassenger[] = Array.from({ length: 62 }, (_, i) => {
  const seat = i + 1;
  const [name, code] = NAMED[seat] ?? [`${FIRST[seat % 12]} ${LAST[(seat * 7) % 12]}`, `TK-58${String(200 + seat)}`];
  const missing = MISSING_SEATS.includes(seat);
  return {
    ticketCode: code,
    passengerName: name,
    seatNumber: seat,
    status: missing ? 'PAID' : 'BOARDED',
    boardedAt: missing ? null : minutesAgo(45 - Math.min(seat, 40)),
  };
});

export function mockManifest(tripId: string): TripManifest {
  const t = driverTrips.find((x) => x.id === tripId);
  if (!t) throw new ApiError(404, 'NOT_FOUND', 'Trip not found');
  return { trip: { ...t }, passengers: manifest.map((m) => ({ ...m })) };
}

// Codes that test each refusal (type them in "QR damaged? Type the code").
const otherTickets: Record<string, Extract<BoardingCheck, { ok: false }>> = {
  'TK-59001': { ok: false, reason: 'WRONG_TRIP', message: 'This ticket is for Douala → Yaoundé 12:00, not this bus' },
  'TK-58999': { ok: false, reason: 'NOT_PAID', message: 'Not paid yet: send the passenger to the counter' },
  'TK-58777': { ok: false, reason: 'CANCELLED', message: 'Cancelled ticket' },
};

export function mockCheckTicket(code: string, tripId: string): BoardingCheck {
  const trip = driverTrips.find((t) => t.id === tripId);
  const p = manifest.find((m) => m.ticketCode === code);
  if (!trip || !p) {
    return otherTickets[code] ?? { ok: false, reason: 'NOT_FOUND', message: 'Unknown ticket' };
  }
  if (p.status === 'BOARDED') {
    return {
      ok: false,
      reason: 'ALREADY_BOARDED',
      message: `Already boarded at ${hhmm(p.boardedAt)} (seat ${p.seatNumber})`,
      boardedAt: p.boardedAt ?? undefined,
      seatNumber: p.seatNumber,
    };
  }
  return {
    ok: true,
    ticket: { ...p, originCity: trip.originCity, destinationCity: trip.destinationCity, paymentMethod: 'MTN_MOMO' },
  };
}

// Idempotent like the server must be: boarding twice never counts twice.
export function mockBoard(code: string, tripId: string): BoardingResult {
  const check = mockCheckTicket(code, tripId);
  if (!check.ok) throw new ApiError(400, 'BAD_REQUEST', check.message);
  const boardedAt = new Date().toISOString();
  manifest = manifest.map((m) => (m.ticketCode === code ? { ...m, status: 'BOARDED', boardedAt } : m));
  driverTrips = driverTrips.map((t) =>
    t.id === tripId ? { ...t, passengers: { ...t.passengers, boarded: t.passengers.boarded + 1 } } : t,
  );
  const trip = driverTrips.find((t) => t.id === tripId);
  return {
    ticketCode: code,
    seatNumber: check.ticket.seatNumber,
    passengerName: check.ticket.passengerName,
    boardedAt,
    passengers: trip ? trip.passengers : { boarded: 0, sold: 0 },
  };
}

function hhmm(iso: string | null): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Parcel scan (driver) ──────────────────────────────────────────────────────
// Design 3.8: TP-DLA-48230, Douala Akwa → Bafoussam, 1.4 kg, seal S-0061, fee paid.
const scanParcels: Record<string, ParcelScanView> = {
  'TP-DLA-48230': {
    trackingCode: 'TP-DLA-48230',
    status: 'REGISTERED',
    fromCity: 'Douala',
    fromBranch: 'Akwa',
    toCity: 'Bafoussam',
    homeDelivery: true,
    weightKg: 1.4,
    sealNumber: 'S-0061',
    feePaid: true,
  },
};

export function mockParcelForScan(code: string): ParcelScanView | null {
  return scanParcels[code] ? { ...scanParcels[code] } : null;
}

export function mockLoadParcel(code: string, tripId: string): ParcelScanView {
  const p = scanParcels[code];
  if (!p) throw new ApiError(400, 'BAD_REQUEST', 'Parcel not found');
  if (p.status !== 'REGISTERED') throw new ApiError(400, 'BAD_REQUEST', `Only a registered parcel can be loaded (it is ${p.status})`);
  scanParcels[code] = { ...p, status: 'LOADED' };
  driverTrips = driverTrips.map((t) =>
    t.id === tripId
      ? { ...t, parcels: { loaded: t.parcels.loaded + 1, total: Math.max(t.parcels.total, t.parcels.loaded + 1) } }
      : t,
  );
  return { ...scanParcels[code] };
}

// ── Courier · Cash to remit (design values) ───────────────────────────────────
export const mockCourierCash: CourierCash = {
  inHand: 8500,
  remitBefore: '19:00',
  collected: [
    { receiverName: 'Hervé Nana', trackingCode: 'TP-DLA-48199', at: todayAt(11, 20), amount: 5000 },
    { receiverName: 'Aïcha Bello', trackingCode: 'TP-DLA-48211', at: todayAt(12, 2), amount: 3500 },
  ],
  remitted: [
    { date: dayAt(-1, 18, 0), amount: 12000, status: 'RECEIVED' },
    { date: dayAt(-2, 18, 0), amount: 6500, status: 'RECEIVED' },
    { date: dayAt(-3, 18, 0), amount: 9000, status: 'RECEIVED' },
  ],
};

// ── Staff · Profile stat cards (design values) ────────────────────────────────
export const mockStats: Record<'DRIVER' | 'COURIER', StaffStats> = {
  COURIER: { items: [{ label: 'Delivered (month)', value: '64' }, { label: 'First try', value: '96%' }, { label: 'Refused', value: '2' }] },
  DRIVER: { items: [{ label: 'Trips (month)', value: '21' }, { label: 'On time', value: '90%' }, { label: 'Passengers', value: '1,240' }] },
};
