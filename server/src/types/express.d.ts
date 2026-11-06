import type { Role } from '@prisma/client';

// What the auth middleware puts on req.user after checking the token
export interface AuthUser {
  id: string;
  role: Role;
  agencyId: string | null;
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
