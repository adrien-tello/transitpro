import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { conflict, forbidden, notFound, unauthorized } from '../../lib/http-error';
import type { LoginInput, RegisterInput } from './auth.schemas';

// Owner: Lead (Fanyi Charllson)

// Compared against when the email does not exist, so "unknown email" and
// "wrong password" take the same time (no account discovery by timing)
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

// Never send secrets or security fields to a client
export function publicUser(user: User) {
  const { passwordHash: _p, googleId: _g, tokenVersion: _t, ...rest } = user;
  return rest;
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

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { agency: { select: { id: true, name: true, status: true } }, employee: true },
  });
  if (!user) throw notFound('User');
  const { passwordHash: _p, googleId: _g, tokenVersion: _t, ...rest } = user;
  return rest;
}
