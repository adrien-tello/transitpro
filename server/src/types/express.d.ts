import type { AgencyStatus, Role } from '@prisma/client';

// What the auth middleware puts on req.user after checking the token
export interface AuthUser {
  id: string;
  role: Role;
  agencyId: string | null;
  agencyStatus: AgencyStatus | null; // only APPROVED agencies can work (see agencyIdOf)
  employeeId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
