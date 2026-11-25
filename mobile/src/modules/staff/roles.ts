import type { Role } from '@contracts/api-types';

export const ROLE_LABEL: Partial<Record<Role, string>> = {
  DRIVER: 'Driver',
  COURIER: 'Courier',
  COUNTER_AGENT: 'Counter agent',
  BRANCH_MANAGER: 'Branch manager',
  FLEET_MANAGER: 'Fleet manager',
  HR_OFFICER: 'HR officer',
  ACCOUNTANT: 'Accountant',
  AGENCY_OWNER: 'Agency owner',
};
