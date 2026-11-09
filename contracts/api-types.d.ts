// TransitPro API contract: the EXACT shape of what each endpoint returns inside { data }.
//
// One file used by everyone:
//   server  -> each service function returns one of these types (TypeScript checks every field)
//   web     -> import { ... } from '@contracts/api-types'
//   mobile  -> import { ... } from '@contracts/api-types'
// Example values for every type are in contracts/mocks.ts (taken from the design screens).
//
// Rules: types only (this is a .d.ts file: no values, no imports). Money = integer FCFA. Dates = ISO strings.
// Changing a field here changes it for the server AND the screens: tell the group first.

// ─────────────── Shared ───────────────

export type Role =
  | 'CUSTOMER'
  | 'COUNTER_AGENT'
  | 'DRIVER'
  | 'COURIER'
  | 'BRANCH_MANAGER'
  | 'FLEET_MANAGER'
  | 'HR_OFFICER'
  | 'ACCOUNTANT'
  | 'AGENCY_OWNER'
  | 'PLATFORM_ADMIN';

export type PaymentMethod = 'MTN_MOMO' | 'ORANGE_MONEY' | 'CASH';
export type BusClass = 'CLASSIC' | 'VIP';

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

// Small agency info shown next to trips, tickets, parcels
export interface AgencyBadge {
  id: string;
  slug: string;
  name: string;
  initials: string; // "ÉV", shown in the round avatar
  color: string; // avatar background, e.g. "#F5C46B"
  verified: boolean; // blue ✓ badge
  rating: number; // 4.6
}

// ─────────────── Auth · Lead ───────────────

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  agencyId: string | null;
}

// POST /auth/login, POST /auth/register, POST /hr/invites/:token/accept
export interface SessionResponse {
  user: PublicUser;
}

// GET /auth/me  → the app opens the customer screens or the staff screens from `role`
export interface Me extends PublicUser {
  agency: { id: string; name: string; status: AgencyStatus } | null;
  employee: { id: string; jobTitle: string; branchId: string | null; active: boolean } | null;
}

// POST /auth/password/forgot { email }                 → { ok: true } (same answer for unknown emails)
// POST /auth/password/reset  { email, code, password }  → SessionResponse (6-digit SMS code)
// POST /auth/password/change { currentPassword?, newPassword } → SessionResponse
// POST /auth/google { idToken }                         → SessionResponse
export interface OkResponse {
  ok: true;
}

// ─────────────── Agencies · Lead ───────────────

export type AgencyStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

// POST /agencies/register  Screen: Web · Register your agency (owner is logged in, agency PENDING)
// POST /agencies/admin/:id/approve · /reject { reason } → AgencyRegistered['agency']
export interface AgencyRegistered {
  user: PublicUser;
  agency: { id: string; name: string; slug: string; status: AgencyStatus };
}

// GET /agencies/admin/pending  Screen: Platform admin · Agencies to verify
export interface PendingAgency {
  id: string;
  name: string;
  slug: string;
  headOffice: string;
  phone: string;
  email: string;
  rccmNumber: string | null;
  niuNumber: string | null;
  documentTypes: string[]; // RCCM, NIU, OWNER_ID, TRANSPORT_LICENCE already uploaded
  owner: { fullName: string; email: string; phone: string | null } | null;
  createdAt: string;
}

// GET /agencies → Paginated<AgencyListItem>      Screen: Customer · Verified agencies, Home avatars
export interface AgencyListItem extends AgencyBadge {
  reviewCount: number; // 1240
  cities: string[]; // ["Douala", "Yaoundé", "Bafoussam"]
}

// GET /agencies/:slug                             Screen: Customer · Agency profile
export interface AgencyProfile extends AgencyListItem {
  verifiedAt: string;
  since: number; // year, 2019
  branchCount: number;
  busCount: number;
  classes: BusClass[];
  ratings: { onTime: number; comfort: number; parcels: number; staff: number };
  departuresToday: { tripId: string; departureAt: string; destinationCity: string; price: number }[];
  latestReview: { authorName: string; comment: string; tripCode: string } | null;
}

// ─────────────── 1. Booking · Joy ───────────────

// GET /booking/trips/search?from=&to=&date=&sort=earliest|cheapest|rating
// Screen: Customer · Search results (timeline list)
export interface TripSearchResult {
  tripId: string;
  agency: AgencyBadge;
  originCity: string;
  destinationCity: string;
  departureAt: string;
  arrivalEta: string;
  durationMinutes: number;
  busClass: BusClass;
  price: number;
  seatsLeft: number; // shown red when <= 5
  tag: 'CHEAPEST' | 'BEST_RATED' | 'FASTEST' | null;
}

// GET /booking/trips/:id/seats                    Screen: Customer · Choose a seat
export interface SeatMap {
  tripId: string;
  busPlate: string;
  busClass: BusClass;
  price: number;
  frontRowExtra: number; // +500 for the first 2 rows
  rows: number; // 9
  seatsPerRow: number; // 4 (2 + aisle + 2)
  seats: { number: number; row: number; taken: boolean; front: boolean }[];
}

// POST /booking/tickets body                      Screen: Customer · Pay
export interface CreateTicketInput {
  tripId: string;
  seatNumber: number;
  passengerName: string;
  passengerIdNumber?: string;
  paymentMethod: PaymentMethod;
  payerPhone: string;
}

// POST /booking/tickets, GET /booking/tickets/mine (array)   Screen: E-ticket, Home "Next trip"
export interface Ticket {
  id: string;
  code: string; // "TK-58104", also the QR content
  status: 'RESERVED' | 'PAID' | 'BOARDED' | 'CANCELLED' | 'REFUNDED';
  agency: AgencyBadge;
  originCity: string;
  originBranch: string; // "Akwa"
  destinationCity: string;
  destinationBranch: string;
  departureAt: string;
  arrivalEta: string;
  boardingClosesAt: string;
  seatNumber: number;
  busPlate: string;
  busClass: BusClass;
  gate: string | null;
  passengerName: string;
  price: number;
  bookingFee: number;
  payment: { method: PaymentMethod; status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' };
}

// ─────────────── 4. HR · Joy ───────────────

// GET /hr/employees → Paginated<EmployeeRow>      Screen: Web · Staff
export interface EmployeeRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  jobTitle: string;
  branchName: string | null;
  active: boolean;
  licenceExpiresAt: string | null; // drivers only
  licenceExpiringSoon: boolean; // < 30 days, shown as an alert
}

// POST /hr/invites body                           Screen: Web · Staff "Add staff"
export interface CreateInviteInput {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  branchId?: string;
}

// POST /hr/invites
export interface InviteCreated {
  inviteId: string;
  expiresAt: string;
}

// GET /hr/invites/:token                          Screen: Staff · Invite, set password
export interface InvitePreview {
  agencyName: string;
  agencyInitials: string;
  fullName: string;
  email: string;
  role: Role;
  branchName: string | null;
  invitedBy: string;
  expiresAt: string;
}

// ─────────────── 2. Fleet · Sweet ───────────────

// GET /fleet/buses → Paginated<BusRow>            Screen: Web · Fleet, Dashboard "Bus needing attention"
export interface BusRow {
  id: string;
  plateNumber: string;
  model: string;
  capacity: number;
  busClass: BusClass;
  status: 'ACTIVE' | 'IN_MAINTENANCE' | 'OUT_OF_SERVICE';
  odometerKm: number;
  nextServiceDue: string | null;
  serviceDueSoon: boolean; // < 7 days
  fuelLitersPer100Km: number | null;
}

// POST /fleet/maintenance                         Screen: Web · Fleet
export interface MaintenanceRecord {
  id: string;
  busId: string;
  busPlate: string;
  type: 'SCHEDULED_SERVICE' | 'REPAIR' | 'BREAKDOWN' | 'INSPECTION';
  description: string;
  cost: number;
  startedAt: string;
  completedAt: string | null;
  tripsBlocked: number; // future trips of this bus taken off sale
}

// ─────────────── 5. Finance · Sweet ───────────────

// GET /finance/summary?date=                      Screen: Web · Dashboard KPI cards
export interface FinanceSummary {
  date: string;
  revenueToday: number;
  ticketsSold: number;
  ticketRevenue: number;
  parcelRevenue: number;
  cashToRemit: number;
  changeVsLastWeekPercent: number; // +12
}

// GET /finance/remittances                        Screen: Courier "Cash to remit", Web · Finance
export interface RemittanceRow {
  id: string;
  employeeName: string;
  role: Role;
  branchName: string;
  day: string;
  amountDue: number;
  amountRemitted: number;
  status: 'OPEN' | 'SETTLED' | 'SHORT';
}

// ─────────────── 3. Parcels · Lead ───────────────

// GET /parcels/track/:code (public, no personal data)   Screen: Customer · Track parcel
export interface ParcelTracking {
  trackingCode: string;
  status:
    | 'REGISTERED'
    | 'LOADED'
    | 'IN_TRANSIT'
    | 'ARRIVED'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'ON_HOLD'
    | 'REFUSED'
    | 'RETURNED';
  from: { city: string; branch: string };
  to: { city: string; branch: string };
  homeDelivery: boolean;
  sealNumber: string; // the receiver checks it before giving the code
  photoCount: number; // photos are shown to the receiver only after login
  events: { type: string; city: string | null; at: string }[];
}
