import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import type { User } from '@prisma/client';
import type { Me, PublicUser } from '@contracts/api-types';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { matchesHash, sha256 } from '../../lib/codes';
import { queueEmail } from '../../lib/email';
import { passwordChangedEmail, resetCodeEmail, welcomeEmail } from './auth.emails';
import { HttpError, badRequest, conflict, forbidden, notFound, unauthorized } from '../../lib/http-error';
import type { ChangePasswordInput, LoginInput, RegisterInput, ResetPasswordInput } from './auth.schemas';

// Owner: Lead (Fanyi Charllson)

const BCRYPT_ROUNDS = 12;

// Compared against when the email does not exist, so "unknown email" and
// "wrong password" take the same time (no account discovery by timing)
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

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

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);

// Customers sign themselves up. Staff accounts only come from an HR invite,
// agency owners from POST /agencies/register.
export async function register(input: RegisterInput) {
  const exists = await prisma.user.findFirst({ where: { OR: [{ email: input.email }, { phone: input.phone }] } });
  if (exists) throw conflict('An account with this email or phone already exists');

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      role: 'CUSTOMER',
    },
  });
  queueEmail(welcomeEmail(user));
  return user;
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  // Same message for "no account" and "wrong password" so emails cannot be guessed
  if (!user?.passwordHash || !ok) throw unauthorized('Wrong email or password');
  if (!user.isActive) throw forbidden('This account is disabled');
  return user;
}

// ─────────────── Google sign-in ───────────────
// The app gets an ID token from Google, sends it here, and we check with Google's
// public keys that it is real, not expired, and made for OUR app (audience).

const googleClient = new OAuth2Client();
const googleAudiences = env.GOOGLE_CLIENT_IDS.split(',').map((id) => id.trim()).filter(Boolean);

export async function loginWithGoogle(idToken: string) {
  if (googleAudiences.length === 0) {
    throw new HttpError(501, 'NOT_IMPLEMENTED', 'Google sign-in is not set up on the server yet (GOOGLE_CLIENT_IDS)');
  }

  let profile;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: googleAudiences });
    profile = ticket.getPayload();
  } catch {
    throw unauthorized('Google sign-in failed, please try again');
  }
  if (!profile?.sub || !profile.email || !profile.email_verified) {
    throw unauthorized('Your Google email address is not verified');
  }
  const email = profile.email.toLowerCase();

  // 1. Already signed in with Google before
  let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });

  // 2. Same email already has an account (password or staff): link Google to it.
  //    Safe because Google confirmed the person owns this email.
  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      if (byEmail.googleId) throw conflict('This email is linked to another Google account');
      user = await prisma.user.update({ where: { id: byEmail.id }, data: { googleId: profile.sub } });
    }
  }

  // 3. New person: always a CUSTOMER (staff accounts only come from HR invites)
  if (!user) {
    user = await prisma.user.create({
      data: { email, googleId: profile.sub, fullName: profile.name?.trim() || email.split('@')[0], role: 'CUSTOMER' },
    });
    queueEmail(welcomeEmail(user));
  }

  if (!user.isActive) throw forbidden('This account is disabled');
  return user;
}

// ─────────────── Forgot password ───────────────

const RESET_CODE_MINUTES = 10;
const RESET_MAX_ATTEMPTS = 5;
const WRONG_CODE = 'The code is wrong or has expired';

// The code goes to the account's email (free with Resend, no SMS cost).
// Always answers the same way, whether the email exists or not (no account discovery).
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return;

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await prisma.$transaction([
    // One valid code at a time: older ones stop working
    prisma.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.passwordReset.create({
      data: { userId: user.id, codeHash: sha256(code), expiresAt: new Date(Date.now() + RESET_CODE_MINUTES * 60_000) },
    }),
  ]);
  // Sent in the background: the answer comes back in the same time whether the account exists or not
  queueEmail(resetCodeEmail(user, code, RESET_CODE_MINUTES));
}

export async function resetPassword(input: ResetPasswordInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const reset = user
    ? await prisma.passwordReset.findFirst({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      })
    : null;
  if (!user || !user.isActive || !reset || reset.attempts >= RESET_MAX_ATTEMPTS) throw badRequest(WRONG_CODE);

  if (!matchesHash(input.code, reset.codeHash)) {
    await prisma.passwordReset.update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } });
    throw badRequest(WRONG_CODE);
  }

  const [updated] = await prisma.$transaction([
    // tokenVersion + 1: whoever had the old password is logged out everywhere
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.password), tokenVersion: { increment: 1 } },
    }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
  ]);
  queueEmail(passwordChangedEmail(updated));
  return updated;
}

// ─────────────── Logged-in account ───────────────

// Ends the other sessions; the route gives this device a fresh cookie
export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User');
  if (user.passwordHash) {
    const ok = await bcrypt.compare(input.currentPassword ?? '', user.passwordHash);
    if (!ok) throw badRequest('Your current password is wrong');
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword), tokenVersion: { increment: 1 } },
  });
  queueEmail(passwordChangedEmail(updated));
  return updated;
}

// "Log out on all my devices": every existing cookie stops working
export async function revokeAllSessions(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
}

export async function me(userId: string): Promise<Me> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      agency: { select: { id: true, name: true, status: true, rejectionReason: true } },
      employee: { select: { id: true, jobTitle: true, branchId: true, active: true } },
    },
  });
  if (!user) throw notFound('User');
  return { ...publicUser(user), agency: user.agency, employee: user.employee };
}
