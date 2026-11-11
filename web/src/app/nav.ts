import type { Role } from '@contracts/api-types';
import type { IconName } from '../components/ui/Icon';

// The sidebar of the design. `roles` = who sees the entry (the AGENCY_OWNER sees everything).
// The server checks the roles again: hiding a menu is comfort, not security.
export interface NavItem {
  label: string;
  to: string;
  icon: IconName;
  roles?: Role[];
  soon?: boolean; // module not built yet: the page says who builds it
}

const OFFICE: Role[] = ['COUNTER_AGENT', 'BRANCH_MANAGER'];

export const AGENCY_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: 'dash' },
  { label: 'Parcels', to: '/parcels', icon: 'box', roles: OFFICE },
  { label: 'Trips & booking', to: '/trips', icon: 'ticket', roles: OFFICE, soon: true },
  { label: 'Live tracking', to: '/live', icon: 'pin', roles: ['BRANCH_MANAGER', 'FLEET_MANAGER'], soon: true },
  { label: 'Fleet', to: '/fleet', icon: 'bus', roles: ['FLEET_MANAGER', 'BRANCH_MANAGER'], soon: true },
  { label: 'Staff', to: '/staff', icon: 'users', roles: ['HR_OFFICER', 'BRANCH_MANAGER'], soon: true },
  { label: 'Finance', to: '/finance', icon: 'wallet', roles: ['ACCOUNTANT', 'BRANCH_MANAGER'], soon: true },
  { label: 'Branches', to: '/branches', icon: 'building', roles: [] }, // owner only
];

export const ADMIN_NAV: NavItem[] = [{ label: 'Agencies to verify', to: '/admin', icon: 'shield' }];

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
