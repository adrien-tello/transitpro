import { z } from 'zod';

// Shared field rules (also used by agency sign-up and staff invites)

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');

// "+237 6 70 00 00 00" and "670-000-000" are both stored as "+237670000000" / "670000000"
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.\-()]/g, ''))
  .pipe(z.string().regex(/^\+?\d{9,15}$/, 'Enter a valid phone number'));

// bcrypt only reads the first 72 bytes, so longer passwords are refused instead of silently cut
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password is too long (72 characters max)');

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const googleSchema = z.object({
  idToken: z.string().min(1).max(4096),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/, 'The code has 6 digits'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  // Optional only for accounts created with Google that never had a password
  currentPassword: z.string().max(200).optional(),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
