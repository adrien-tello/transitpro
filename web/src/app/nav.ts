import type { Role } from '@contracts/api-types';
import type { IconName } from '../components/ui/Icon';

// The sidebar of the design. `roles` = who sees the entry (AGENCY_OWNER and PLATFORM_ADMIN see every entry of their menu).
// Each person only sees the screens of their job: a counter agent has no Fleet, an accountant no Parcels.
// The server checks the roles again: hiding a menu is comfort, not security.
export interface NavItem {
  label: string;
  to: string;
  icon: IconName;
  roles?: Role[];
  badge?: 'parcelAlerts' | 'pendingAgencies'; // live counter shown on the right
}

const OFFICE: Role[] = ['COUNTER_AGENT', 'BRANCH_MANAGER'];
const MANAGERS: Role[] = ['BRANCH_MANAGER', 'FLEET_MANAGER'];

export const AGENCY_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: 'dash' },
  { label: 'Live tracking', to: '/live', icon: 'pin', roles: MANAGERS },
  { label: 'Trips & booking', to: '/trips', icon: 'ticket', roles: OFFICE },
  { label: 'Schedule', to: '/schedule', icon: 'cal', roles: MANAGERS },
  { label: 'Parcels', to: '/parcels', icon: 'box', roles: OFFICE, badge: 'parcelAlerts' },
  { label: 'Fleet', to: '/fleet', icon: 'bus', roles: MANAGERS },
  { label: 'Staff', to: '/staff', icon: 'users', roles: ['HR_OFFICER', 'BRANCH_MANAGER'] },
  { label: 'Finance', to: '/finance', icon: 'wallet', roles: ['ACCOUNTANT', 'BRANCH_MANAGER'] },
  { label: 'Messages', to: '/messages', icon: 'chat' },
  { label: 'Reports', to: '/reports', icon: 'chart', roles: ['BRANCH_MANAGER', 'ACCOUNTANT', 'FLEET_MANAGER'] },
  { label: 'Branches', to: '/branches', icon: 'building', roles: [] }, // owner only
];

// The TransitPro team's own menu (PLATFORM_ADMIN)
export const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', to: '/admin', icon: 'dash' },
  { label: 'Agencies to verify', to: '/admin/verify', icon: 'shield', badge: 'pendingAgencies' },
  { label: 'All agencies', to: '/admin/agencies', icon: 'building' },
  { label: 'Payments', to: '/admin/payments', icon: 'wallet' },
  { label: 'Payouts', to: '/admin/payouts', icon: 'send' },
  { label: 'Customers', to: '/admin/customers', icon: 'users' },
  { label: 'Reports', to: '/admin/reports', icon: 'chart' },
];

// Bottom of the sidebar (Log out is added by the layout)
export const AGENCY_BOTTOM: NavItem[] = [
  { label: 'Support', to: '/support', icon: 'help' },
  { label: 'Settings', to: '/settings', icon: 'gear' },
];
export const ADMIN_BOTTOM: NavItem[] = [{ label: 'Settings', to: '/admin/settings', icon: 'gear' }];

export function visibleNav(items: NavItem[], role: Role): NavItem[] {
  if (role === 'AGENCY_OWNER' || role === 'PLATFORM_ADMIN') return items;
  return items.filter((i) => !i.roles || i.roles.includes(role));
}

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: 'Customer',
  COUNTER_AGENT: 'Counter agent',
  DRIVER: 'Driver',
  COURIER: 'Courier',
  BRANCH_MANAGER: 'Branch manager',
  FLEET_MANAGER: 'Fleet manager',
  HR_OFFICER: 'HR officer',
  ACCOUNTANT: 'Accountant',
  AGENCY_OWNER: 'Agency owner',
  PLATFORM_ADMIN: 'TransitPro team',
};

// Roles that work in the web dashboard (drivers, couriers and customers use the mobile app)
export const WEB_ROLES: Role[] = ['COUNTER_AGENT', 'BRANCH_MANAGER', 'FLEET_MANAGER', 'HR_OFFICER', 'ACCOUNTANT', 'AGENCY_OWNER', 'PLATFORM_ADMIN'];
