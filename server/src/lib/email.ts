import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Every email of the platform goes through here (codes, welcome, agency verification, staff invites...).
// Sent from the project Gmail account through Gmail SMTP: free, ~500 emails a day, to ANY address.
// Without SMTP_USER / SMTP_PASS (development) the email is printed in the server terminal instead.
//
// Modules write their emails in <module>.emails.ts (see auth.emails.ts) as plain data:
// greeting, paragraphs, code, button... This file turns that into a simple letter-style
// HTML email and a plain-text version. Every value is escaped, so a name or a reason
// typed by a user can never inject HTML into an email.

export interface Email {
  to: string;
  subject: string;
  preheader: string; // grey preview line next to the subject in the inbox
  greeting: string; // "Hi Marie,"
  paragraphs: string[];
  list?: string[]; // simple bullet list after the paragraphs
  code?: { value: string; expiresInMinutes: number };
  quote?: { label: string; text: string }; // e.g. the reason an agency was refused
  button?: { label: string; url: string };
  after?: string[]; // paragraphs after the code / button
  footnote?: string; // small grey line above the footer: "You get this because..."
}

const INK = '#0E1726';
const BODY = '#2B3445';
const MUTED = '#6B7280';
const LINE = '#E5E7EB';
const BLUE = '#1E4FD8';
const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SF Mono',Menlo,Consolas,'Courier New',monospace";

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const p = (text: string) => `<p style="margin:0 0 16px;font:15px/1.65 ${FONT};color:${BODY}">${esc(text)}</p>`;

export function renderHtml(e: Email): string {
  const code = e.code
    ? `<div style="margin:6px 0 8px;padding:14px 18px;background:#F4F5F7;border-radius:6px;display:inline-block;font:600 30px/1 ${MONO};letter-spacing:7px;color:${INK}">${esc(e.code.value)}</div>
<p style="margin:0 0 20px;font:13px/1.5 ${FONT};color:${MUTED}">This code expires in ${e.code.expiresInMinutes} minutes and works once.</p>`
    : '';
  const list = e.list
    ? `<ul style="margin:0 0 18px;padding-left:22px">${e.list.map((x) => `<li style="margin:0 0 6px;font:15px/1.6 ${FONT};color:${BODY}">${esc(x)}</li>`).join('')}</ul>`
    : '';
  const quote = e.quote
    ? `<div style="margin:0 0 18px;padding:2px 0 2px 14px;border-left:3px solid ${LINE}">
<div style="font:600 13px/1.6 ${FONT};color:${MUTED}">${esc(e.quote.label)}</div>
<div style="font:15px/1.6 ${FONT};color:${INK}">${esc(e.quote.text)}</div></div>`
    : '';
  const button = e.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 22px"><tr>
<td bgcolor="${BLUE}" style="background:${BLUE};border-radius:6px"><a href="${esc(e.button.url)}" target="_blank" style="display:inline-block;padding:11px 20px;font:600 14px ${FONT};color:#FFFFFF;text-decoration:none">${esc(e.button.label)}</a></td>
</tr></table>`
    : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${esc(e.subject)}</title></head>
<body style="margin:0;padding:0;background:#FFFFFF">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(e.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF"><tr><td style="padding:36px 22px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td>
<div style="font:700 17px ${FONT};color:${INK};letter-spacing:-0.2px;margin-bottom:34px">TransitPro</div>
<p style="margin:0 0 16px;font:15px/1.65 ${FONT};color:${INK}">${esc(e.greeting)}</p>
${e.paragraphs.map(p).join('\n')}
${list}${quote}${code}
${(e.after ?? []).map(p).join('\n')}
${button}
<p style="margin:24px 0 0;font:15px/1.65 ${FONT};color:${BODY}">The TransitPro team</p>
<div style="height:1px;background:${LINE};margin:36px 0 18px"></div>
${e.footnote ? `<p style="margin:0 0 8px;font:12px/1.6 ${FONT};color:${MUTED}">${esc(e.footnote)}</p>` : ''}
<p style="margin:0;font:12px/1.6 ${FONT};color:${MUTED}">TransitPro · Intercity buses and parcels · Cameroon<br>This mailbox is not monitored, please do not reply.</p>
</td></tr></table>
</td></tr></table>
</body></html>`;
}

export function renderText(e: Email): string {
  const out = ['TransitPro', '', e.greeting, '', ...e.paragraphs.flatMap((x) => [x, ''])];
  if (e.list) out.push(...e.list.map((x) => `- ${x}`), '');
  if (e.quote) out.push(`${e.quote.label}: ${e.quote.text}`, '');
  if (e.code) out.push(e.code.value, `This code expires in ${e.code.expiresInMinutes} minutes and works once.`, '');
  for (const x of e.after ?? []) out.push(x, '');
  if (e.button) out.push(`${e.button.label}: ${e.button.url}`, '');
  out.push('The TransitPro team', '', '--');
  if (e.footnote) out.push(e.footnote);
  out.push('TransitPro · Intercity buses and parcels · Cameroon');
  return out.join('\n');
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

// Sends now and throws if Gmail refuses. Used by the email:test script.
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

// What the modules use: the API answers at once and the email leaves in the background.
//   - the user does not wait 1-2 s for Gmail
//   - "forgot password" answers in the same time whether the account exists or not
//   - a Gmail problem never breaks sign-up, approval...
export function queueEmail(email: Email): void {
  sendEmail(email).catch(() => {
    // already logged (error code only) in sendEmail
  });
}
