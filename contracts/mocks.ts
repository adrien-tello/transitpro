// Example data for every type in api-types.d.ts, copied from the design screens.
//
// UI (Adrien, Fidel, Lead): show these on your screens until the real endpoint is ready,
//   then replace the mock with api('/...'). The shape is identical, so nothing else changes.
// Server (Joy, Sweet): this is exactly what your endpoint must return inside { data }.
import type {
  AgencyBadge,
  AgencyListItem,
  AgencyProfile,
  BusRow,
  CashCollectedRow,
  CourierStats,
  CourierStop,
  DriverPassengerRow,
  DriverTripView, DriverSchedule,
  EmployeeRow,
  FinanceSummary,
  InvitePreview,
  MaintenanceRecord,
  Me,
  Paginated,
  ParcelDetail,
  ParcelListItem,
  ParcelTracking,
  RemittanceRow,
  SeatMap,
  Ticket,
  TripSearchResult,
} from './api-types';

const page = <T>(items: T[]): Paginated<T> => ({ items, page: 1, limit: 20, total: items.length });

export const etoile: AgencyBadge = {
  id: 'ag_etoile',
  slug: 'etoile-voyages',
  name: 'Étoile Voyages',
  initials: 'ÉV',
  color: '#F5C46B',
  verified: true,
  rating: 4.6,
};

const sanaga: AgencyBadge = { id: 'ag_sanaga', slug: 'sanaga-express', name: 'Sanaga Express', initials: 'SE', color: '#B9CBFA', verified: true, rating: 4.2 };
const mungo: AgencyBadge = { id: 'ag_mungo', slug: 'mungo-lines', name: 'Mungo Lines', initials: 'ML', color: '#A7E3C1', verified: true, rating: 4.4 };

// ── Auth ──
export const meCustomer: Me = {
  id: 'usr_marie',
  fullName: 'Marie Ekane',
  email: 'customer@transitpro.test',
  phone: '+237677181890',
  role: 'CUSTOMER',
  agencyId: null,
  agency: null,
  employee: null,
  masterAdmin: false,
};

export const meDriver: Me = {
  id: 'usr_jean',
  fullName: 'Jean Fotso',
  email: 'driver@etoile.test',
  phone: '+237690000004',
  role: 'DRIVER',
  agencyId: 'ag_etoile',
  agency: { id: 'ag_etoile', name: 'Étoile Voyages', status: 'APPROVED', rejectionReason: null, suspensionReason: null, badgeUntil: null },
  employee: { id: 'emp_jean', jobTitle: 'Driver', branchId: 'br_akwa', active: true },
  masterAdmin: false,
};

export const meCourier: Me = {
  id: 'usr_bernard',
  fullName: 'Bernard Atangana',
  email: 'courier@etoile.test',
  phone: '+237690000005',
  role: 'COURIER',
  agencyId: 'ag_etoile',
  agency: { id: 'ag_etoile', name: 'Étoile Voyages', status: 'APPROVED', rejectionReason: null, suspensionReason: null, badgeUntil: null },
  employee: { id: 'emp_bernard', jobTitle: 'Courier', branchId: 'br_mvan', active: true },
  masterAdmin: false,
};

// ── Agencies ──
export const agencies: Paginated<AgencyListItem> = page([
  { ...etoile, reviewCount: 1240, cities: ['Douala', 'Yaoundé', 'Bafoussam'] },
  { ...mungo, reviewCount: 860, cities: ['Douala', 'Yaoundé', 'Kribi'] },
  { ...sanaga, reviewCount: 2105, cities: ['Yaoundé', 'Bertoua', 'Ngaoundéré'] },
]);

export const agencyProfile: AgencyProfile = {
  ...etoile,
  reviewCount: 1240,
  cities: ['Douala', 'Yaoundé', 'Bafoussam'],
  verifiedAt: '2026-10-12T09:00:00.000Z',
  since: 2019,
  branchCount: 4,
  busCount: 19,
  classes: ['VIP', 'CLASSIC'],
  ratings: { onTime: 4.5, comfort: 4.7, parcels: 4.6, staff: 4.4 },
  departuresToday: [
    { tripId: 'trp_0800', departureAt: '2026-11-03T07:00:00.000Z', destinationCity: 'Yaoundé', price: 6000 },
    { tripId: 'trp_1030', departureAt: '2026-11-03T09:30:00.000Z', destinationCity: 'Bafoussam', price: 5500 },
  ],
  latestReview: { authorName: 'Carine N.', comment: 'Left on time and my parcel reached Bafoussam still sealed.', tripCode: 'TR-0802' },
};

// ── Booking ──
export const tripSearchResults: TripSearchResult[] = [
  { tripId: 'trp_0600', agency: sanaga, originCity: 'Douala', destinationCity: 'Yaoundé', departureAt: '2026-11-03T05:00:00.000Z', arrivalEta: '2026-11-03T09:00:00.000Z', durationMinutes: 240, busClass: 'CLASSIC', price: 4000, seatsLeft: 23, tag: 'CHEAPEST' },
  { tripId: 'trp_0800', agency: etoile, originCity: 'Douala', destinationCity: 'Yaoundé', departureAt: '2026-11-03T07:00:00.000Z', arrivalEta: '2026-11-03T11:00:00.000Z', durationMinutes: 240, busClass: 'VIP', price: 6000, seatsLeft: 8, tag: 'BEST_RATED' },
  { tripId: 'trp_0900', agency: mungo, originCity: 'Douala', destinationCity: 'Yaoundé', departureAt: '2026-11-03T08:00:00.000Z', arrivalEta: '2026-11-03T11:50:00.000Z', durationMinutes: 230, busClass: 'VIP', price: 6500, seatsLeft: 3, tag: 'FASTEST' },
];

const taken = [1, 2, 3, 6, 7, 9, 10, 15, 16, 18, 21, 22, 23, 27, 30, 31, 33, 34];
export const seatMap: SeatMap = {
  tripId: 'trp_0800',
  busPlate: 'CE 118 KD',
  busClass: 'VIP',
  price: 6000,
  frontRowExtra: 500,
  rows: 9,
  seatsPerRow: 4,
  seats: Array.from({ length: 36 }, (_, i) => ({ number: i + 1, row: Math.floor(i / 4) + 1, taken: taken.includes(i + 1), front: i < 8 })),
};

export const ticket: Ticket = {
  id: 'tkt_58104',
  code: 'TK-58104',
  status: 'PAID',
  agency: etoile,
  originCity: 'Douala',
  originBranch: 'Akwa',
  destinationCity: 'Yaoundé',
  destinationBranch: 'Mvan',
  departureAt: '2026-11-03T07:00:00.000Z',
  arrivalEta: '2026-11-03T11:00:00.000Z',
  boardingClosesAt: '2026-11-03T06:45:00.000Z',
  seatNumber: 14,
  busPlate: 'CE 118 KD',
  busClass: 'VIP',
  gate: 'B',
  passengerName: 'Marie Ekane',
  price: 6000,
  bookingFee: 150,
  payment: { method: 'MTN_MOMO', status: 'SUCCEEDED' },
};

// ── Staff app (driver) ──
export const driverTrip: DriverTripView = {
  tripId: 'trp_0802',
  code: 'TR-0802',
  busPlate: 'CE 118 KD',
  busClass: 'VIP',
  status: 'BOARDING',
  originCity: 'Douala',
  destinationCity: 'Bafoussam',
  departureAt: '2026-11-19T07:00:00.000Z',
  arrivalEta: '2026-11-19T12:00:00.000Z',
  passengersBoarded: 58,
  passengersTotal: 62,
  parcelsLoaded: 21,
  parcelsTotal: 22,
  stops: [
    { label: 'Departure', city: 'Douala', at: '2026-11-19T07:04:00.000Z' },
    { label: 'Stop', city: 'Edéa', at: null },
    { label: 'Arrival', city: 'Bafoussam', at: null },
  ],
  currentStopIndex: 0,
  nextStopEtaMinutes: 18,
  speedKmh: 74,
};

export const driverSchedule: DriverSchedule = {
  upcoming: [
    { tripId: 'trp_0809', code: 'TR-0809', busPlate: 'CE 118 KD', seats: 70, originCity: 'Douala', destinationCity: 'Yaoundé', departureAt: '2026-11-24T05:00:00.000Z', delayMinutes: null },
    { tripId: 'trp_0815', code: 'TR-0815', busPlate: 'LT 903 AA', seats: 30, originCity: 'Douala', destinationCity: 'Kribi', departureAt: '2026-11-26T08:30:00.000Z', delayMinutes: null },
  ],
  done: [
    { tripId: 'trp_0798', code: 'TR-0798', busPlate: 'CE 118 KD', seats: 70, originCity: 'Bafoussam', destinationCity: 'Douala', departureAt: '2026-11-22T13:00:00.000Z', delayMinutes: 0 },
    { tripId: 'trp_0790', code: 'TR-0790', busPlate: 'CE 118 KD', seats: 70, originCity: 'Douala', destinationCity: 'Bafoussam', departureAt: '2026-11-21T07:00:00.000Z', delayMinutes: 12 },
    { tripId: 'trp_0781', code: 'TR-0781', busPlate: 'CE 118 KD', seats: 70, originCity: 'Douala', destinationCity: 'Yaoundé', departureAt: '2026-11-20T05:00:00.000Z', delayMinutes: 0 },
  ],
};

export const driverPassengers: DriverPassengerRow[] = [
  { ticketCode: 'TK-58002', seatNumber: 1, passengerName: 'Paul Essomba', boardedAt: '2026-11-19T07:18:00.000Z' },
  { ticketCode: 'TK-58004', seatNumber: 2, passengerName: 'Grace Mballa', boardedAt: '2026-11-19T07:20:00.000Z' },
  { ticketCode: 'TK-58010', seatNumber: 3, passengerName: 'Eric Tchinda', boardedAt: '2026-11-19T07:22:00.000Z' },
  { ticketCode: 'TK-58015', seatNumber: 4, passengerName: 'Sandrine Mbida', boardedAt: '2026-11-19T07:25:00.000Z' },
  { ticketCode: 'TK-58104', seatNumber: 14, passengerName: 'Marie Ekane', boardedAt: '2026-11-19T07:41:00.000Z' },
  { ticketCode: 'TK-58071', seatNumber: 7, passengerName: 'Hervé Nana', boardedAt: null },
  { ticketCode: 'TK-58133', seatNumber: 22, passengerName: 'Clarisse Mbia', boardedAt: null },
  { ticketCode: 'TK-58160', seatNumber: 41, passengerName: 'Aïcha Bello', boardedAt: null },
];

// ── Parcels, staff side (driver load / courier delivery) ──
export const parcelsMine: ParcelListItem[] = [
  {
    id: 'par_dla48230',
    trackingCode: 'TP-DLA-48230',
    status: 'OUT_FOR_DELIVERY',
    from: { city: 'Douala', branch: 'Akwa' },
    to: { city: 'Yaoundé', branch: 'Mvan' },
    senderName: 'Hervé Nana',
    receiverName: 'Paul Ekane',
    weightKg: 1.4,
    homeDelivery: true,
    codAmount: null,
    currentHolder: { id: 'emp_bernard', name: 'Bernard Atangana', jobTitle: 'Courier' },
    createdAt: '2026-11-18T06:20:00.000Z',
    updatedAt: '2026-11-19T12:05:00.000Z',
  },
  {
    id: 'par_dla48231',
    trackingCode: 'TP-DLA-48231',
    status: 'OUT_FOR_DELIVERY',
    from: { city: 'Douala', branch: 'Akwa' },
    to: { city: 'Yaoundé', branch: 'Mvan' },
    senderName: 'Rita Fon',
    receiverName: 'Clarisse Mbia',
    weightKg: 2.1,
    homeDelivery: true,
    codAmount: null,
    currentHolder: { id: 'emp_bernard', name: 'Bernard Atangana', jobTitle: 'Courier' },
    createdAt: '2026-11-18T07:00:00.000Z',
    updatedAt: '2026-11-19T06:00:00.000Z',
  },
  {
    id: 'par_dla48232',
    trackingCode: 'TP-DLA-48232',
    status: 'OUT_FOR_DELIVERY',
    from: { city: 'Douala', branch: 'Akwa' },
    to: { city: 'Yaoundé', branch: 'Mvan' },
    senderName: 'Samuel Eyoum',
    receiverName: 'Hervé Nana',
    weightKg: 0.8,
    homeDelivery: true,
    codAmount: 8500,
    currentHolder: { id: 'emp_bernard', name: 'Bernard Atangana', jobTitle: 'Courier' },
    createdAt: '2026-11-18T07:10:00.000Z',
    updatedAt: '2026-11-19T06:00:00.000Z',
  },
  {
    id: 'par_dla48233',
    trackingCode: 'TP-DLA-48233',
    status: 'OUT_FOR_DELIVERY',
    from: { city: 'Douala', branch: 'Akwa' },
    to: { city: 'Yaoundé', branch: 'Mvan' },
    senderName: 'Odette Mengue',
    receiverName: 'Aïcha Bello',
    weightKg: 1.2,
    homeDelivery: true,
    codAmount: null,
    currentHolder: { id: 'emp_bernard', name: 'Bernard Atangana', jobTitle: 'Courier' },
    createdAt: '2026-11-18T07:20:00.000Z',
    updatedAt: '2026-11-19T06:00:00.000Z',
  },
];

export const courierStops: CourierStop[] = [
  { parcel: parcelsMine[0]!, stopIndex: 6, stopsTotal: 9, etaAt: '2026-11-19T12:05:00.000Z', distanceKm: 1.8, etaMinutes: 7 },
  { parcel: parcelsMine[1]!, stopIndex: 7, stopsTotal: 9, etaAt: '2026-11-19T12:40:00.000Z', distanceKm: 3.4, etaMinutes: 19 },
  { parcel: parcelsMine[2]!, stopIndex: 8, stopsTotal: 9, etaAt: '2026-11-19T13:20:00.000Z', distanceKm: 5.1, etaMinutes: 28 },
  { parcel: parcelsMine[3]!, stopIndex: 9, stopsTotal: 9, etaAt: '2026-11-19T14:10:00.000Z', distanceKm: 6.3, etaMinutes: 34 },
];

export const courierStats: CourierStats = {
  deliveredToday: 5,
  stopsToday: 9,
  refusedToday: 1,
  cashToRemitToday: 0,
  deliveredThisMonth: 64,
  firstTryPercent: 96,
  refusedThisMonth: 2,
};

export const parcelDetail: ParcelDetail = {
  ...parcelsMine[0]!,
  sender: { name: 'Hervé Nana', phone: '+237690000011', email: null },
  receiver: { name: 'Paul Ekane', phone: '+237690000012', email: null },
  declaredContents: 'Documents',
  declaredValue: 10000,
  deliveryAddress: 'Bastos, near the bakery, Yaoundé',
  insured: false,
  price: { fee: 1600, insuranceFee: 0, total: 1600 },
  security: {
    sealNumber: 'S-0061',
    photoUrls: [],
    weightAtRegistrationKg: 1.4,
    weightAtArrivalKg: 1.4,
    weightDifferenceKg: 0,
    weightOk: true,
    deliveryAttempts: 0,
    maxAttempts: 3,
    codeExpiresAt: '2026-12-18T00:00:00.000Z',
  },
  trip: { id: 'trp_0802', departureAt: '2026-11-18T07:00:00.000Z', status: 'ARRIVED' },
  courier: { id: 'emp_bernard', name: 'Bernard Atangana', jobTitle: 'Courier' },
  registeredBy: { id: 'emp_carine', name: 'Carine Ndoumbe', jobTitle: 'Counter agent' },
  delivery: { deliveredAt: null, photoUrl: null, lat: null, lng: null },
  events: [
    { type: 'REGISTERED', at: '2026-11-18T06:20:00.000Z', by: { id: 'emp_carine', name: 'Carine Ndoumbe', jobTitle: 'Counter agent' }, branch: { city: 'Douala', branch: 'Akwa' }, weightKg: 1.4, lat: null, lng: null, note: null },
    { type: 'HANDED_TO_COURIER', at: '2026-11-19T12:05:00.000Z', by: { id: 'emp_bernard', name: 'Bernard Atangana', jobTitle: 'Courier' }, branch: { city: 'Yaoundé', branch: 'Mvan' }, weightKg: null, lat: null, lng: null, note: null },
  ],
  payments: [],
  escrow: null,
  claims: [],
};

// ── HR ──
export const employees: Paginated<EmployeeRow> = page([
  { id: 'emp_jean', fullName: 'Jean Fotso', email: 'driver@etoile.test', phone: '+237690000004', role: 'DRIVER', jobTitle: 'Driver', branchName: 'Akwa', active: true, licenceExpiresAt: '2026-11-28T00:00:00.000Z', licenceExpiringSoon: true },
  { id: 'emp_bernard', fullName: 'Bernard Atangana', email: 'courier@etoile.test', phone: '+237690000005', role: 'COURIER', jobTitle: 'Courier', branchName: 'Mvan', active: true, licenceExpiresAt: null, licenceExpiringSoon: false },
  { id: 'emp_carine', fullName: 'Carine Ndoumbe', email: 'agent@etoile.test', phone: '+237690000003', role: 'COUNTER_AGENT', jobTitle: 'Counter agent', branchName: 'Akwa', active: true, licenceExpiresAt: null, licenceExpiringSoon: false },
]);

export const invitePreview: InvitePreview = {
  agencyName: 'Étoile Voyages',
  agencyInitials: 'ÉV',
  fullName: 'Bernard Atangana',
  email: 'b.atangana@etoilevoyages.cm',
  role: 'COURIER',
  branchName: 'Yaoundé · Mvan',
  invitedBy: 'Alice Ngo',
  expiresAt: '2026-11-08T18:00:00.000Z',
};

// ── Fleet ──
export const buses: Paginated<BusRow> = page([
  { id: 'bus_ce482', plateNumber: 'CE 482 AB', model: 'Mercedes Tourismo', capacity: 70, busClass: 'VIP', status: 'ACTIVE', odometerKm: 412380, nextServiceDue: '2026-11-05T00:00:00.000Z', serviceDueSoon: true, fuelLitersPer100Km: 28 },
  { id: 'bus_ce118', plateNumber: 'CE 118 KD', model: 'Yutong ZK6122', capacity: 70, busClass: 'VIP', status: 'ACTIVE', odometerKm: 198440, nextServiceDue: '2026-12-20T00:00:00.000Z', serviceDueSoon: false, fuelLitersPer100Km: 26 },
  { id: 'bus_lt903', plateNumber: 'LT 903 AA', model: 'Toyota Coaster', capacity: 30, busClass: 'CLASSIC', status: 'IN_MAINTENANCE', odometerKm: 301220, nextServiceDue: null, serviceDueSoon: false, fuelLitersPer100Km: 15 },
]);

export const maintenanceRecord: MaintenanceRecord = {
  id: 'mnt_001',
  busId: 'bus_ce482',
  busPlate: 'CE 482 AB',
  type: 'SCHEDULED_SERVICE',
  description: 'Oil change, brake pads, tyre check',
  cost: 185000,
  startedAt: '2026-11-05T07:00:00.000Z',
  completedAt: null,
  tripsBlocked: 4,
};

// ── Finance ──
export const financeSummary: FinanceSummary = {
  date: '2026-11-02',
  revenueToday: 2840000,
  ticketsSold: 412,
  ticketRevenue: 2310000,
  parcelRevenue: 530000,
  cashToRemit: 310000,
  changeVsLastWeekPercent: 12,
};

export const remittances: RemittanceRow[] = [
  { id: 'rem_1', employeeName: 'Rita Fon', role: 'COURIER', branchName: 'Mvan', day: '2026-11-02', amountDue: 12000, amountRemitted: 0, status: 'OPEN' },
  { id: 'rem_2', employeeName: 'Carine Ndoumbe', role: 'COUNTER_AGENT', branchName: 'Akwa', day: '2026-11-02', amountDue: 298000, amountRemitted: 298000, status: 'SETTLED' },
];

// Bernard's own hand-ins, newest first — Staff · Cash "Handed to the branch"
export const myRemittances: RemittanceRow[] = [
  { id: 'rem_b1', employeeName: 'Bernard Atangana', role: 'COURIER', branchName: 'Mvan', day: '2026-11-18', amountDue: 12000, amountRemitted: 12000, status: 'SETTLED' },
  { id: 'rem_b2', employeeName: 'Bernard Atangana', role: 'COURIER', branchName: 'Mvan', day: '2026-10-30', amountDue: 6500, amountRemitted: 6500, status: 'SETTLED' },
  { id: 'rem_b3', employeeName: 'Bernard Atangana', role: 'COURIER', branchName: 'Mvan', day: '2026-10-29', amountDue: 9000, amountRemitted: 9000, status: 'SETTLED' },
];

export const cashCollectedToday: CashCollectedRow[] = [
  { id: 'cash_1', payerName: 'Hervé Nana', trackingCode: 'TP-DLA-48199', amount: 5000, at: '2026-11-19T11:20:00.000Z' },
  { id: 'cash_2', payerName: 'Aïcha Bello', trackingCode: 'TP-DLA-48211', amount: 3500, at: '2026-11-19T12:02:00.000Z' },
];

// ── Parcels ──
export const parcelTracking: ParcelTracking = {
  trackingCode: 'TP-DLA-48230',
  status: 'OUT_FOR_DELIVERY',
  from: { city: 'Douala', branch: 'Akwa' },
  to: { city: 'Yaoundé', branch: 'Mvan' },
  homeDelivery: true,
  sealNumber: 'S-0061',
  photoCount: 2,
  events: [
    { type: 'REGISTERED', city: 'Douala', at: '2026-11-02T06:20:00.000Z' },
    { type: 'LOADED', city: 'Douala', at: '2026-11-02T07:00:00.000Z' },
    { type: 'ARRIVED', city: 'Yaoundé', at: '2026-11-02T11:10:00.000Z' },
    { type: 'HANDED_TO_COURIER', city: 'Yaoundé', at: '2026-11-02T12:05:00.000Z' },
  ],
};
