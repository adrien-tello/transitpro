import { createHash, randomBytes, randomInt } from 'crypto';

// Human-friendly codes printed on labels and tickets.
// No 0/O/1/I so they are easy to read aloud.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function randomChars(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

// TP-DLA-7K2Q9 (DLA = first 3 letters of the origin city)
export function trackingCode(originCity: string): string {
  const city = originCity.normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
  return `TP-${city}-${randomChars(5)}`;
}

// TK-8M4PZ
export function ticketCode(): string {
  return `TK-${randomChars(5)}`;
}

// 4-digit delivery code sent to the receiver by SMS
export function deliveryOtp(): string {
  return String(randomInt(0, 10000)).padStart(4, '0');
}

// Long random token for staff invite links
export function inviteToken(): string {
  return randomBytes(24).toString('hex');
}

// We never store OTPs or invite tokens in clear text, only their hash.
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
