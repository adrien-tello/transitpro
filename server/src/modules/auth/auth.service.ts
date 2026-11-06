import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import type { Me, PublicUser } from '@contracts/api-types';
import { prisma } from '../../lib/prisma';
import { conflict, forbidden, notFound, unauthorized } from '../../lib/http-error';
import type { LoginInput, RegisterInput } from './auth.schemas';

// Owner: Lead (Fanyi Charllson)

// Compared against when the email does not exist, so "unknown email" and
// "wrong password" take the same time (no account discovery by timing)
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

// Only the fields of the contract leave the server (never passwordHash, tokenVersion...)
export function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    agencyId: user.agencyId,
  };
}

// Customers sign themselves up. Staff accounts only come from an HR invite.
export async function register(input: RegisterInput) {
  const exists = await prisma.user.findFirst({ where: { OR: [{ email: input.email }, { phone: input.phone }] } });
  if (exists) throw conflict('An account with this email or phone already exists');

  return prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: 'CUSTOMER',
    },
  });
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  // Same message for "no account" and "wrong password" so emails cannot be guessed
  if (!user?.passwordHash || !ok) throw unauthorized('Wrong email or password');
  if (!user.isActive) throw forbidden('This account is disabled');
  return user;
}

// "Log out on all my devices": every existing cookie stops working
export async function revokeAllSessions(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
}

export async function me(userId: string): Promise<Me> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      agency: { select: { id: true, name: true, status: true } },
      employee: { select: { id: true, jobTitle: true, branchId: true, active: true } },
    },
  });
  if (!user) throw notFound('User');
  return { ...publicUser(user), agency: user.agency, employee: user.employee };
}
