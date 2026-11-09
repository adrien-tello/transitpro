import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Every email of the platform goes through here (codes, agency verification, staff invites...).
// Sent from the project Gmail account through Gmail SMTP: free, ~500 emails a day, to ANY address.
// Without SMTP_USER / SMTP_PASS (development) the email is printed in the server terminal instead.
//
// Callers describe the email (title, lines, code, button...) and this file builds both versions:
// HTML for email apps, plain text for the rest. Every value is escaped, so a name or a reason
// typed by a user can never inject HTML into an email.

type Tone = 'success' | 'danger' | 'warning' | 'info';

export interface Email {
  to: string;
  subject: string;
  preheader: string; // grey preview line shown next to the subject in the inbox
  title: string;
  lines: string[];
  code?: { value: string; expiresInMinutes: number };
  status?: { tone: Tone; label: string }; // small pill above the title: "Verified", "Not approved"
  callout?: { tone: Tone; title: string; text: string };
  button?: { label: string; url: string };
}

// Same tokens as the web dashboard (web/src/styles/index.css)
const C = {
  ink: '#0E1726',
  muted: '#5B6576',
  primary: '#1E4FD8',
  primaryTint: '#E8EEFD',
  canvas: '#E9ECF7',
  line: '#E4E8EF',
  white: '#FFFFFF',
};
const TONES: Record<Tone, { fg: string; bg: string }> = {
  success: { fg: '#146C43', bg: '#E3F5EC' },
  danger: { fg: '#B42318', bg: '#FDECEA' },
  warning: { fg: '#8A5200', bg: '#FFF3DC' },
  info: { fg: C.primary, bg: C.primaryTint },
};
const FONT = "'Plus Jakarta Sans','Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function codeBlock(code: NonNullable<Email['code']>): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px">
  <tr><td align="center" bgcolor="${C.primaryTint}" style="background:${C.primaryTint};border-radius:14px;padding:22px 16px">
    <div style="font:700 11px ${FONT};letter-spacing:1.6px;text-transform:uppercase;color:${C.muted};margin-bottom:10px">Your code</div>
    <div style="font:700 36px/1.1 ${MONO};letter-spacing:12px;color:${C.ink};padding-left:12px">${esc(code.value)}</div>
    <div style="font:500 13px ${FONT};color:${C.muted};margin-top:12px">Expires in ${code.expiresInMinutes} minutes</div>
  </td></tr>
</table>`;
}

function statusPill(status: NonNullable<Email['status']>): string {
  const t = TONES[status.tone];
  return `<div style="margin-bottom:14px"><span style="display:inline-block;background:${t.bg};color:${t.fg};font:700 12px ${FONT};padding:5px 12px;border-radius:999px">${esc(status.label)}</span></div>`;
}

function callout(c: NonNullable<Email['callout']>): string {
  const t = TONES[c.tone];
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 22px">
  <tr><td bgcolor="${t.bg}" style="background:${t.bg};border-left:4px solid ${t.fg};border-radius:10px;padding:14px 16px">
    <div style="font:700 14px ${FONT};color:${t.fg};margin-bottom:4px">${esc(c.title)}</div>
    <div style="font:400 14px/1.55 ${FONT};color:${C.ink}">${esc(c.text)}</div>
  </td></tr>
</table>`;
}

function button(b: NonNullable<Email['button']>): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 24px">
  <tr><td bgcolor="${C.primary}" style="background:${C.primary};border-radius:10px">
    <a href="${esc(b.url)}" target="_blank" style="display:inline-block;padding:13px 24px;font:700 15px ${FONT};color:${C.white};text-decoration:none;border-radius:10px">${esc(b.label)}</a>
  </td></tr>
</table>`;
}

export function renderHtml(email: Email): string {
  const paragraphs = email.lines
    .map((l) => `<p style="margin:0 0 14px;font:400 15px/1.6 ${FONT};color:${C.ink}">${esc(l)}</p>`)
    .join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${esc(email.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.canvas}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(email.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.canvas}" style="background:${C.canvas}">
<tr><td align="center" style="padding:32px 14px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

    <tr><td style="padding:0 4px 18px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="34" height="34" align="center" bgcolor="${C.primary}" style="background:${C.primary};border-radius:9px;font:800 18px/34px ${FONT};color:${C.white}">T</td>
        <td style="padding-left:10px;font:800 19px ${FONT};color:${C.ink};letter-spacing:-0.3px">Transit<span style="color:${C.primary}">Pro</span></td>
      </tr></table>
    </td></tr>

    <tr><td bgcolor="${C.white}" style="background:${C.white};border:1px solid ${C.line};border-top:4px solid ${C.primary};border-radius:16px;padding:32px 30px 10px">
      ${email.status ? statusPill(email.status) : ''}
      <h1 style="margin:0 0 16px;font:800 23px/1.3 ${FONT};color:${C.ink};letter-spacing:-0.3px">${esc(email.title)}</h1>
      ${paragraphs}
      ${email.code ? codeBlock(email.code) : ''}
      ${email.callout ? callout(email.callout) : ''}
      ${email.button ? button(email.button) : ''}
    </td></tr>

    <tr><td align="center" style="padding:22px 20px 0;font:400 12px/1.6 ${FONT};color:${C.muted}">
      Never share a code with anyone, not even TransitPro staff. We will never ask for it.<br>
      This is an automatic email, replies are not read.<br>
      <span style="color:${C.ink};font-weight:700">TransitPro</span> · Intercity buses and parcels in Cameroon
    </td></tr>

  </table>
</td></tr>
</table>
</body></html>`;
}

export function renderText(email: Email): string {
  const parts = [email.title, '', ...email.lines];
  if (email.code) parts.push('', `Your code: ${email.code.value}`, `Expires in ${email.code.expiresInMinutes} minutes.`);
  if (email.callout) parts.push('', `${email.callout.title}: ${email.callout.text}`);
  if (email.button) parts.push('', `${email.button.label}: ${email.button.url}`);
  parts.push('', 'Never share a code with anyone, not even TransitPro staff.', 'TransitPro');
  return parts.join('\n');
}

// Gmail SMTP over TLS. Created once, reused for every email.
const transport =
  env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      })
    : null;

export async function sendEmail(email: Email): Promise<void> {
  const text = renderText(email);

  if (!transport) {
    console.log(`\n[EMAIL to ${email.to}] ${email.subject}\n${text}\n`);
    return;
  }

  try {
    await transport.sendMail({
      // Gmail only sends "from" the account itself; the display name is free
      from: { name: env.EMAIL_FROM_NAME, address: env.SMTP_USER },
      to: email.to,
      subject: email.subject,
      text,
      html: renderHtml(email),
    });
  } catch (err) {
    // Error code only (EAUTH = wrong app password, ECONNECTION = network...).
    // Never the subject or body (they can hold a code) nor the full error (it can hold addresses).
    const code = (err as { code?: string }).code ?? 'UNKNOWN';
    console.error(`[EMAIL] Gmail did not send an email: ${code}`);
    throw new Error('Email could not be sent');
  }
}
