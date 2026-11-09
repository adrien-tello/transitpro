import { env } from '../config/env';

// Every email of the platform goes through here (codes, agency verification, staff invites...).
// Resend has a free plan (3,000 emails / month), so no SMS cost.
// Without RESEND_API_KEY (development) the email is printed in the server terminal instead.

interface Email {
  to: string;
  subject: string;
  // Plain text only: the HTML version is built here, with every value escaped,
  // so a name typed by a user can never inject HTML into an email
  lines: string[];
  code?: string; // shown big in the middle of the email
}

const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function toHtml(email: Email): string {
  const paragraphs = email.lines.map((l) => `<p style="margin:0 0 12px">${escapeHtml(l)}</p>`).join('');
  const code = email.code
    ? `<p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:20px 0;color:#0F172A">${escapeHtml(email.code)}</p>`
    : '';
  return `<div style="font-family:Arial,sans-serif;font-size:15px;color:#334155;max-width:480px">
<p style="font-size:18px;font-weight:700;color:#0F172A;margin:0 0 16px">TransitPro</p>${paragraphs}${code}
<p style="font-size:12px;color:#94A3B8;margin-top:24px">You get this email because of an action on your TransitPro account. Never share a code with anyone, TransitPro staff included.</p></div>`;
}

export async function sendEmail(email: Email): Promise<void> {
  const text = [...email.lines, ...(email.code ? ['', email.code] : [])].join('\n');

  if (!env.RESEND_API_KEY) {
    console.log(`[EMAIL to ${email.to}] ${email.subject}\n${text}\n`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [email.to], subject: email.subject, text, html: toHtml(email) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    // Never log the subject or body (they can hold a code) nor Resend's message (it can hold addresses).
    // Resend's error name is enough to know why: validation_error, invalid_from_address...
    const body = (await res.json().catch(() => ({}))) as { name?: string };
    console.error(`[EMAIL] Resend refused an email: HTTP ${res.status} ${body.name ?? ''}`.trim());
    throw new Error('Email could not be sent');
  }
}
