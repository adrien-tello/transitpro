import type { Email } from '../../lib/email';
import { env } from '../../config/env';

// Owner: Lead (Fanyi Charllson). Emails when TransitPro sends money out.

const fcfa = (n: number) => `${n.toLocaleString('en-US')} FCFA`;
const operator = (channel: string) => (channel === 'cm.orange' ? 'Orange Money' : 'MTN Mobile Money');
// 677112233 → "6•• •• 22 33": enough to recognise the number, not enough to copy it from a forwarded email
const masked = (phone: string) => {
  const d = phone.replace(/\D/g, '').replace(/^237/, '');
  return d.length === 9 ? `6•• •• ${d.slice(5, 7)} ${d.slice(7)}` : '••••';
};

interface Sent {
  amount: number;
  phone: string;
  channel: string;
  recipientName: string;
}

export function payoutSentEmail(agency: { name: string; email: string }, p: Sent): Email {
  return {
    to: agency.email,
    subject: `TransitPro sent you ${fcfa(p.amount)}`,
    preheader: `Your payout is on your ${operator(p.channel)} account.`,
    greeting: 'Hello,',
    paragraphs: [
      `We sent ${fcfa(p.amount)} to ${agency.name}'s ${operator(p.channel)} account (${p.recipientName}, ${masked(p.phone)}).`,
      'This is the money your customers paid by Mobile Money for tickets and parcels, minus the TransitPro commission and the commission on your cash sales.',
    ],
    after: ['You can see every payout in your dashboard, under Settings.'],
    button: { label: 'Open the dashboard', url: `${env.WEB_URL}/settings` },
    footnote: `You get this email because it is the contact address of ${agency.name} on TransitPro.`,
  };
}

export function codSentEmail(to: string, p: Sent, trackingCode: string): Email {
  return {
    to,
    subject: `${fcfa(p.amount)} for parcel ${trackingCode} sent to you`,
    preheader: 'The receiver paid for your parcel, the money is on your phone.',
    greeting: 'Hello,',
    paragraphs: [
      `Your parcel ${trackingCode} was delivered and the receiver paid ${fcfa(p.amount)} by Mobile Money.`,
      `We sent the money to your ${operator(p.channel)} account (${masked(p.phone)}).`,
    ],
    footnote: 'You get this email because you gave this address when you sent the parcel.',
  };
}
