import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { conflict, notFound, unauthorized } from '../../lib/http-error';
import type { AuthUser } from '../../types/express';
import type { LoginInput, RegisterInput } from './auth.schemas';

// Owner: Lead (Fanyi Charllson)

// Never send passwordHash or googleId to a client
export function publicUser(user: User) {
  const { passwordHash: _p, googleId: _g, ...rest } = user;
  return rest;
}

// What goes inside the session cookie
export async function sessionFor(user: User): Promise<AuthUser> {
  const employee = await prisma.employee.findUnique({ where: { userId: user.id }, select: { id: true } });
  return { id: user.id, role: user.role, agencyId: user.agencyId, employeeId: employee?.id ?? null };
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
  // Same message for "no account" and "wrong password" so emails cannot be guessed
  if (!user?.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw unauthorized('Wrong email or password');
  }
  return user;
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { agency: { select: { id: true, name: true, status: true } }, employee: true },
  });
  if (!user) throw notFound('User');
  const { passwordHash: _p, googleId: _g, ...rest } = user;
  return rest;
}
