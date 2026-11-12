import { Navigate, Route, Routes } from 'react-router';
import { AppLayout } from './AppLayout';
import { PublicOnly, RequireUser } from './guards';
import { ADMIN_BOTTOM, ADMIN_NAV, AGENCY_BOTTOM, AGENCY_NAV } from './nav';
import { LoginPage } from '../modules/auth/LoginPage';
import { ForgotPasswordPage } from '../modules/auth/ForgotPasswordPage';
import { AgencySignupPage } from '../modules/auth/AgencySignupPage';
import { SettingsPage } from '../modules/auth/SettingsPage';
import { MobileOnlyPage, PendingPage } from '../modules/agencies/PendingPage';
import { AdminAgenciesPage } from '../modules/agencies/AdminAgenciesPage';
import { AdminOverviewPage } from '../modules/agencies/AdminOverviewPage';
import { AdminAgencyListPage } from '../modules/agencies/AdminAgencyListPage';
import { AdminAgencyDetailPage } from '../modules/agencies/AdminAgencyDetailPage';
import { AdminPaymentsPage } from '../modules/agencies/AdminPaymentsPage';
import { AdminPayoutsPage } from '../modules/agencies/AdminPayoutsPage';
import { BranchesPage } from '../modules/agencies/BranchesPage';
import { DashboardPage } from '../modules/dashboard/DashboardPage';
import { ComingSoonPage } from '../modules/dashboard/ComingSoonPage';
import { ParcelsPage } from '../modules/parcels/ParcelsPage';
import { RegisterParcelPage } from '../modules/parcels/RegisterParcelPage';
import { ParcelDetailPage } from '../modules/parcels/ParcelDetailPage';

// Every screen of the dashboard. Add a module's pages inside the agency area below.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
      <Route path="/register-agency" element={<PublicOnly><AgencySignupPage /></PublicOnly>} />

      <Route path="/pending" element={<RequireUser area="pending">{(me) => <PendingPage me={me} />}</RequireUser>} />
      <Route path="/mobile-only" element={<RequireUser area="mobile-only">{(me) => <MobileOnlyPage me={me} />}</RequireUser>} />

      {/* TransitPro team */}
      <Route path="/admin" element={<RequireUser area="admin">{(me) => <AppLayout me={me} nav={ADMIN_NAV} bottom={ADMIN_BOTTOM} admin />}</RequireUser>}>
        <Route index element={<RequireUser area="admin">{(me) => <AdminOverviewPage me={me} />}</RequireUser>} />
        <Route path="verify" element={<AdminAgenciesPage />} />
        <Route path="agencies" element={<AdminAgencyListPage />} />
        <Route path="agencies/:id" element={<AdminAgencyDetailPage />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route path="payouts" element={<AdminPayoutsPage />} />
        <Route path="customers" element={<ComingSoonPage by="Lead + Adrien" title="Customers" icon="users" text="Customer accounts from the mobile app, and blocking an account if needed." />} />
        <Route path="reports" element={<ComingSoonPage by="Lead" title="Reports" icon="chart" text="Monthly volume, commission and growth per agency." />} />
        <Route path="settings" element={<RequireUser area="admin">{(me) => <SettingsPage me={me} />}</RequireUser>} />
      </Route>

      {/* Agency staff */}
      <Route element={<RequireUser area="agency">{(me) => <AppLayout me={me} nav={AGENCY_NAV} bottom={AGENCY_BOTTOM} />}</RequireUser>}>
        <Route index element={<RequireUser area="agency">{(me) => <DashboardPage me={me} />}</RequireUser>} />
        <Route path="parcels" element={<ParcelsPage />} />
        <Route path="parcels/new" element={<RequireUser area="agency">{(me) => <RegisterParcelPage me={me} />}</RequireUser>} />
        <Route path="parcels/:id" element={<RequireUser area="agency">{(me) => <ParcelDetailPage me={me} />}</RequireUser>} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="trips" element={<ComingSoonPage by="Joy (Booking)" title="Trips & booking" icon="ticket" text="Routes, trips, seat maps and counter ticket sales. Server: Joy (Booking)." />} />
        <Route path="schedule" element={<ComingSoonPage by="Joy (Booking)" title="Schedule" icon="cal" text="The week's departures per route, drivers and buses assigned to each trip." />} />
        <Route path="live" element={<ComingSoonPage by="Fidel (staff app GPS) + Lead" title="Live tracking" icon="pin" text="Buses and couriers on a map, from the staff app's GPS." />} />
        <Route path="fleet" element={<ComingSoonPage by="Sweet (Fleet)" title="Fleet" icon="bus" text="Buses, maintenance and fuel. A bus in maintenance stops seat sales. Server: Sweet (Fleet)." />} />
        <Route path="staff" element={<ComingSoonPage by="Joy (HR)" title="Staff" icon="users" text="Staff list, invitations and driver licences. Server: Joy (HR)." />} />
        <Route path="finance" element={<ComingSoonPage by="Sweet (Finance)" title="Finance" icon="wallet" text="Payments, what TransitPro owes your agency, payouts, expenses and the daily cash. Server: Sweet (Finance)." />} />
        <Route path="messages" element={<ComingSoonPage by="to assign" title="Messages" icon="chat" text="Messages between branches, drivers and customers." />} />
        <Route path="reports" element={<ComingSoonPage by="Sweet (Finance)" title="Reports" icon="chart" text="Daily and monthly reports: tickets, parcels, fuel and cash per branch." />} />
        <Route path="support" element={<ComingSoonPage by="to assign" title="Support" icon="help" text="Help articles and a direct line to the TransitPro team." />} />
        <Route path="settings" element={<RequireUser area="agency">{(me) => <SettingsPage me={me} />}</RequireUser>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
