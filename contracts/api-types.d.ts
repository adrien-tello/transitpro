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
  // badgeUntil: the optional paid "Verified" badge is shown until this date (null = no badge)
  agency: { id: string; name: string; status: AgencyStatus; rejectionReason: string | null; suspensionReason: string | null; badgeUntil: string | null } | null;
  masterAdmin: boolean; // TransitPro team: only the master admin withdraws the platform's money
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

// GET /agencies/me/branches   POST /agencies/me/branches (owner)   Screens: Register parcel, settings
export interface BranchRow {
  id: string;
  name: string; // "Akwa"
  city: string; // "Douala"
  address: string;
}

// POST /uploads (raw image body, Content-Type image/jpeg | image/png | image/webp, max 3 MB)
// → { url: "/api/uploads/<id>.jpg" }: use it in photoUrls / photoUrl. Only logged-in users can open it.
export interface UploadResult {
  url: string;
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
  documentTypes: string[]; // RCCM, NIU, OWNER_CNI_FRONT, OWNER_CNI_BACK, TRANSPORT_LICENCE already uploaded
  documents: { id: string; type: string; mime: string; uploadedAt: string }[]; // open with GET /agencies/documents/:id/file
  owner: { fullName: string; email: string; phone: string | null } | null;
  createdAt: string;
  badgeUntil: string | null; // paid the Verified badge: checked first (priority)
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

// GET /hr/invites (not accepted, not cancelled)   Screen: Web · Staff "Waiting for the person"
export interface PendingInviteRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  branchName: string | null;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
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

// ─────────────── Payments · Lead (cash, MTN MoMo, Orange Money via Notch Pay) ───────────────

// GET /payments/:id   The app polls it every 3 s while the payer approves on their phone.
// PENDING → SUCCEEDED, or FAILED with failureReason:
//   FAILED (refused / not enough money) · EXPIRED (no answer in time) · CANCELED (payer cancelled) · PROVIDER_ERROR
export interface PaymentView {
  id: string;
  purpose: 'TICKET' | 'PARCEL_FEE' | 'COD_COLLECTION' | 'SUBSCRIPTION';
  method: PaymentMethod;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  amount: number;
  platformFee: number; // TransitPro's share
  payerPhone: string | null;
  failureReason: 'FAILED' | 'EXPIRED' | 'CANCELED' | 'PROVIDER_ERROR' | null;
  createdAt: string;
  settledAt: string | null;
}

// ─────────────── 3. Parcels · Lead ───────────────

export type ParcelStatus =
  | 'REGISTERED'
  | 'LOADED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'ON_HOLD'
  | 'REFUSED'
  | 'RETURNED';

export interface PlaceRef {
  city: string;
  branch: string;
}

export interface StaffRef {
  id: string; // Employee id
  name: string;
  jobTitle: string;
}

// GET /parcels?status=&q=&page=   Screen: Web · Parcels list      GET /parcels/mine: Staff app (driver, courier)
export interface ParcelListItem {
  id: string;
  trackingCode: string;
  status: ParcelStatus;
  from: PlaceRef;
  to: PlaceRef;
  senderName: string;
  receiverName: string;
  weightKg: number;
  homeDelivery: boolean;
  codAmount: number | null;
  currentHolder: StaffRef | null; // the one person responsible right now
  createdAt: string;
  updatedAt: string;
}

// GET /parcels/:id (id or tracking code), and the answer of every parcel action
// (scan, cod-payment, deliver, refuse, release-hold)      Screen: Web · Parcel detail
export interface ParcelDetail extends ParcelListItem {
  sender: { name: string; phone: string; email: string | null };
  receiver: { name: string; phone: string; email: string | null };
  declaredContents: string;
  declaredValue: number;
  deliveryAddress: string | null;
  insured: boolean;
  price: { fee: number; insuranceFee: number; total: number };
  security: {
    sealNumber: string;
    photoUrls: string[];
    weightAtRegistrationKg: number;
    weightAtArrivalKg: number | null;
    weightDifferenceKg: number | null;
    weightOk: boolean | null; // null until weighed at arrival; false = ON_HOLD
    deliveryAttempts: number;
    maxAttempts: number;
    codeExpiresAt: string | null;
  };
  trip: { id: string; departureAt: string; status: string } | null;
  courier: StaffRef | null;
  registeredBy: StaffRef;
  delivery: { deliveredAt: string | null; photoUrl: string | null; lat: number | null; lng: number | null };
  // Chain of custody, oldest first. Never edited or deleted.
  events: {
    type: string;
    at: string;
    by: StaffRef;
    branch: PlaceRef | null;
    weightKg: number | null;
    lat: number | null;
    lng: number | null;
    note: string | null;
  }[];
  payments: PaymentView[]; // fee (+ cash on delivery): show PENDING as "waiting for the phone"
  escrow: { amount: number; status: 'HELD' | 'RELEASED' | 'REFUNDED'; beneficiaryPhone: string; releasedAt: string | null } | null;
  claims: { id: string; reason: string; status: string; amountPaid: number | null; createdAt: string }[];
}

// POST /parcels   Screen: Web · Register a parcel → print the label (QR of trackingCode) and the sender's receipt
export interface ParcelRegistered {
  parcel: ParcelDetail;
  // Shown ONCE, printed on the sender's receipt only (never on the label). Only its hash is stored.
  deliveryCode: string;
}

// POST /parcels/:id/release-hold   (branch manager after checking a parcel ON_HOLD) → new code for the receipt
export interface ParcelHoldReleased {
  parcel: ParcelDetail;
  deliveryCode: string;
}

// GET /parcels/track/:code (public, no personal data)   Screen: Customer · Track parcel
export interface ParcelTracking {
  trackingCode: string;
  status: ParcelStatus;
  from: { city: string; branch: string };
  to: { city: string; branch: string };
  homeDelivery: boolean;
  sealNumber: string; // the receiver checks it before giving the code
  photoCount: number; // photos are shown to the receiver only after login
  events: { type: string; city: string | null; at: string }[];
}

// GET /parcels/stats   Screen: Web · Agency dashboard (my branch; the owner sees the whole agency)
export interface ParcelDay {
  date: string; // YYYY-MM-DD, Douala time
  registered: number;
  revenue: number; // parcel fees paid that day, FCFA (cash + Mobile Money)
}
export interface ParcelAlert {
  trackingCode: string;
  kind: 'ON_HOLD' | 'CLAIM' | 'LATE_DELIVERY';
  text: string;
  at: string;
}
export interface ParcelStats {
  byStatus: Record<ParcelStatus, number>;
  days: ParcelDay[]; // the last 7 days, oldest first, today last
  alerts: ParcelAlert[]; // at most 5, newest first
}

// ─── Agency documents (Lead) ───
export type DocumentType = 'RCCM' | 'NIU' | 'OWNER_CNI_FRONT' | 'OWNER_CNI_BACK' | 'TRANSPORT_LICENCE';

// GET /agencies/me/documents, PUT /agencies/me/documents/:type (raw image or PDF body)
// The file itself: GET /agencies/documents/:id/file (owner of the agency or TransitPro team only)
export interface AgencyDocumentView {
  id: string;
  type: DocumentType;
  mime: string; // image/jpeg, image/png, image/webp, application/pdf
  uploadedAt: string;
}

// ─── TransitPro team: agencies (Lead) ───
// GET /agencies/admin/list?status=&q=&page=        Screen: Web · All agencies
export interface AdminAgencyRow {
  id: string;
  name: string;
  slug: string;
  status: AgencyStatus;
  badgeUntil: string | null; // optional paid badge
  headOffice: string;
  phone: string;
  email: string;
  createdAt: string;
  verifiedAt: string | null;
  branches: number;
  staff: number;
  parcels: number;
  documents: number; // of 5
}

// GET /agencies/admin/:id                          Screen: Web · All agencies > agency
export interface AdminAgencyDetail extends AdminAgencyRow {
  rccmNumber: string | null;
  niuNumber: string | null;
  rejectionReason: string | null;
  suspensionReason: string | null;
  owner: { fullName: string; email: string; phone: string | null } | null;
  documents: AgencyDocumentView[];
  payoutAccount: PayoutAccount | null;
  balance: AgencyBalance;
}

// ─── TransitPro team: payments (Lead) ───
// GET /agencies/admin/payments?status=&method=&purpose=&q=&page=   Screen: Web · Payments
export interface AdminPaymentRow {
  id: string;
  createdAt: string;
  settledAt: string | null;
  agencyName: string | null;
  purpose: 'TICKET' | 'PARCEL_FEE' | 'COD_COLLECTION' | 'SUBSCRIPTION';
  method: PaymentMethod;
  amount: number;
  platformFee: number;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  failureReason: string | null;
  providerRef: string | null;
  payerPhone: string | null;
  parcelCode: string | null;
}

// ─── Payouts (Lead): TransitPro sends money out with Notch Pay transfers ───
export type PayoutChannel = 'cm.mtn' | 'cm.orange';

// PUT /agencies/me/payout-account (owner)          Screen: Web · Settings "Payout account"
export interface PayoutAccount {
  name: string;
  phone: string;
  channel: PayoutChannel;
}

// What TransitPro owes the agency, in FCFA
//   mobileMoneyNet = Mobile Money sales (tickets + parcel fees) minus our commission (TransitPro holds this money)
//   cashCommission = our commission on cash sales (the agency kept that cash, so it owes us this part)
//   paidOut        = payouts sent or on their way
//   available      = mobileMoneyNet - cashCommission - paidOut
export interface AgencyBalance {
  mobileMoneyNet: number;
  cashCommission: number;
  paidOut: number;
  available: number;
  minimumPayout: number; // threshold: no payout below it
}

export interface PayoutView {
  id: string;
  kind: 'AGENCY_PAYOUT' | 'COD_TO_SENDER' | 'PLATFORM_WITHDRAWAL';
  amount: number;
  recipientName: string;
  phone: string;
  channel: PayoutChannel;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  failureReason: string | null;
  createdAt: string;
  settledAt: string | null;
  agencyName?: string;
  parcelCode?: string | null;
}

// GET /payouts/mine (owner, accountant)            Screen: Web · Settings "Payouts"
// POST /payouts/mine/withdraw { amount? } (owner) → PayoutView
export interface AgencyPayouts {
  balance: AgencyBalance;
  account: PayoutAccount | null;
  payouts: PayoutView[];
  withdrawableAt: string | null; // set while the 24 h hold after a payout-number change runs
}

// GET /payouts/admin/agencies                      Screen: Web · TransitPro Payouts
export interface AdminPayoutAgencyRow {
  agencyId: string;
  agencyName: string;
  status: AgencyStatus;
  account: PayoutAccount | null;
  balance: AgencyBalance;
  lastPayoutAt: string | null;
}

// ─── Optional "Verified" badge (Lead) ───
// GET /agencies/me/badge, POST /agencies/me/badge { method: MTN_MOMO | ORANGE_MONEY, payerPhone }   Screen: Web · Settings
export interface BadgeStatus {
  price: number; // FCFA
  months: number; // how long one payment lasts
  activeUntil: string | null; // the badge shows until this date
  active: boolean;
  payment: PaymentView | null; // the last badge payment (PENDING while the owner approves on the phone)
}

// ─── TransitPro's own money (Lead) ───
// GET /payouts/admin/revenue                         Screen: Web · Revenue (from the commission card)
export interface PlatformRevenue {
  totals: { allTime: number; last30Days: number; fromTickets: number; fromParcels: number; fromBadges: number };
  days: { date: string; amount: number }[]; // last 30 days, oldest first
  byAgency: { agencyId: string; name: string; sales: number; commission: number }[]; // top 10
  recent: { id: string; at: string; agencyName: string | null; purpose: string; method: PaymentMethod; amount: number; ourPart: number }[];
  // Money in TransitPro's Notch Pay account and what part of it is really ours
  wallet: {
    mobileMoneyIn: number; // every successful Mobile Money payment
    sentOut: number; // transfers sent or on their way (agencies, senders, our withdrawals)
    owedToAgencies: number;
    codHeld: number; // cash on delivery paid by MoMo, waiting for delivery
    available: number; // ours, can be withdrawn
    providerBalance: number | null; // what Notch Pay says (null if it cannot be read)
  };
  account: { name: string; phone: string; channel: PayoutChannel } | null; // TRANSITPRO_PAYOUT_* in the server .env
  canWithdraw: boolean; // master admin only
  withdrawals: PayoutView[];
}

// GET /agencies/admin/overview   Screen: Web · TransitPro team overview
export interface PlatformOverview {
  agencies: { pending: number; approved: number; rejected: number; suspended: number };
  parcels: { total: number; inTransit: number; onHold: number; deliveredThisWeek: number };
  days: { date: string; volume: number; commission: number; signups: number }[]; // last 7 days, oldest first
  week: { volume: number; commission: number; payments: number; failed: number };
  latestAgencies: { id: string; name: string; headOffice: string; status: AgencyStatus; createdAt: string }[];
  // TransitPro's own money, all time: our 10 % commission, what we still owe agencies, what we sent them
  money: { commissionAllTime: number; owedToAgencies: number; paidOutAllTime: number; minimumPayout: number };
  badges: { active: number; waitingVerification: number }; // paid badges: verified agencies / paid and waiting (priority)
}
