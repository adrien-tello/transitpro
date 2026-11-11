import { Navigate, Route, Routes } from 'react-router';
import { AppLayout } from './AppLayout';
import { PublicOnly, RequireUser } from './guards';
import { ADMIN_NAV, AGENCY_NAV } from './nav';
import { LoginPage } from '../modules/auth/LoginPage';
import { ForgotPasswordPage } from '../modules/auth/ForgotPasswordPage';
import { AgencySignupPage } from '../modules/auth/AgencySignupPage';
import { MobileOnlyPage, PendingPage } from '../modules/agencies/PendingPage';
import { AdminAgenciesPage } from '../modules/agencies/AdminAgenciesPage';
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

      <Route path="/admin" element={<RequireUser area="admin">{(me) => <AppLayout me={me} nav={ADMIN_NAV} admin />}</RequireUser>}>
        <Route index element={<AdminAgenciesPage />} />
      </Route>

      <Route element={<RequireUser area="agency">{(me) => <AppLayout me={me} nav={AGENCY_NAV} />}</RequireUser>}>
        <Route index element={<RequireUser area="agency">{(me) => <DashboardPage me={me} />}</RequireUser>} />
        <Route path="parcels" element={<ParcelsPage />} />
        <Route path="parcels/new" element={<RequireUser area="agency">{(me) => <RegisterParcelPage me={me} />}</RequireUser>} />
        <Route path="parcels/:id" element={<RequireUser area="agency">{(me) => <ParcelDetailPage me={me} />}</RequireUser>} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="trips" element={<ComingSoonPage title="Trips & booking" icon="ticket" text="Routes, trips, seat maps and counter ticket sales. Server: Joy (Booking)." />} />
        <Route path="live" element={<ComingSoonPage title="Live tracking" icon="pin" text="Buses and couriers on a map, from the staff app's GPS." />} />
        <Route path="fleet" element={<ComingSoonPage title="Fleet" icon="bus" text="Buses, maintenance and fuel. A bus in maintenance stops seat sales. Server: Sweet (Fleet)." />} />
        <Route path="staff" element={<ComingSoonPage title="Staff" icon="users" text="Staff list, invitations and driver licences. Server: Joy (HR)." />} />
        <Route path="finance" element={<ComingSoonPage title="Finance" icon="wallet" text="Payments, what TransitPro owes your agency, payouts, expenses and the daily cash. Server: Sweet (Finance)." />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
