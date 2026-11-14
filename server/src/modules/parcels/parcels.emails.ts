import type { Email } from '../../lib/email';

// Owner: Lead (Fanyi Charllson). Emails of the Parcels module (only sent when an address was given).

interface ParcelInfo {
  trackingCode: string;
  receiverName: string;
  senderName: string;
  sealNumber: string;
  from: string; // city
  to: string;
}

const first = (name: string) => name.trim().split(/\s+/)[0] || 'there';

// To the receiver (or the sender, who passes it on): the code that releases the parcel
export function deliveryCodeEmail(to: string, toName: string, p: ParcelInfo, code: string, days: number): Email {
  return {
    to,
    subject: `Your TransitPro parcel ${p.trackingCode}: delivery code`,
    preheader: `Give this code only when you have the parcel in your hands and the seal is intact.`,
    greeting: `Hi ${first(toName)},`,
    paragraphs: [
      `A parcel from ${p.senderName} to ${p.receiverName} is on its way from ${p.from} to ${p.to}. Tracking code: ${p.trackingCode}.`,
      'When the parcel is in front of you, check two things before giving the code below:',
    ],
    list: [`the seal number is ${p.sealNumber} and the seal is not broken`, 'the contents match what was declared'],
    code: { value: code, expiresInMinutes: days * 24 * 60 },
    after: [
      'If something is wrong, do not give the code: refuse the parcel and a claim is opened for you.',
      'Never give this code by phone to anyone. The courier only needs it when you hold the parcel.',
    ],
    footnote: `You get this email because ${to} was given for parcel ${p.trackingCode}.`,
  };
}

export function deliveredEmail(to: string, toName: string, p: ParcelInfo, at: Date): Email {
  const when = at.toLocaleString('en-GB', { timeZone: 'Africa/Douala', dateStyle: 'long', timeStyle: 'short' });
  return {
    to,
    subject: `Parcel ${p.trackingCode} was delivered`,
    preheader: `Delivered on ${when} with the receiver's code.`,
    greeting: `Hi ${first(toName)},`,
    paragraphs: [
      `Parcel ${p.trackingCode} (${p.from} → ${p.to}) was delivered to ${p.receiverName} on ${when} (Cameroon time).`,
      'It was handed over only after the receiver gave the delivery code, with a photo and the GPS position as proof.',
    ],
    footnote: `You get this email because ${to} was given for parcel ${p.trackingCode}.`,
  };
}
