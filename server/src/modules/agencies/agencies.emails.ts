import type { Email } from '../../lib/email';
import { env } from '../../config/env';

// Owner: Lead (Fanyi Charllson). Emails sent to an agency during sign-up and verification.

interface AgencyContact {
  name: string;
  email: string;
}

// Right after "Register your agency", to the owner who filled the form
export function applicationReceivedEmail(agencyName: string, owner: { email: string; fullName: string }): Email {
  const first = owner.fullName.trim().split(/\s+/)[0] || 'there';
  const agency = { name: agencyName, email: owner.email };
  return {
    to: owner.email,
    subject: `We received the application of ${agency.name}`,
    preheader: 'Next step: upload your documents so we can verify your agency.',
    greeting: `Hi ${first},`,
    paragraphs: [
      `Thank you for registering ${agency.name} on TransitPro.`,
      'Before customers can see your agency, our team checks that it is a real, licensed transport company. To do that, upload these documents from your dashboard:',
    ],
    list: ['RCCM (trade register)', 'NIU (tax number)', "ID card of the agency's owner", 'Transport licence'],
    after: ['We usually answer within 48 hours. You will get an email when your agency is verified.'],
    button: { label: 'Upload your documents', url: env.WEB_URL },
    footnote: `You get this email because you registered ${agency.name} on TransitPro with ${owner.email}.`,
  };
}

export function verifiedEmail(agency: AgencyContact): Email {
  return {
    to: agency.email,
    subject: `${agency.name} is verified on TransitPro`,
    preheader: 'Customers can now find your agency in the app.',
    greeting: 'Hello,',
    paragraphs: [
      `Good news: we checked your documents and ${agency.name} is now a verified agency. Customers see the verified badge next to your name in the app.`,
      'To start selling, add your branches, invite your staff, then publish your first trips.',
    ],
    button: { label: 'Open your dashboard', url: env.WEB_URL },
    footnote: `You get this email because ${agency.email} is the contact of ${agency.name}.`,
  };
}

export function rejectedEmail(agency: AgencyContact, reason: string): Email {
  return {
    to: agency.email,
    subject: `${agency.name} could not be verified yet`,
    preheader: `Reason: ${reason}`,
    greeting: 'Hello,',
    paragraphs: [`We checked the documents of ${agency.name}, but we could not verify it yet.`],
    quote: { label: 'Reason', text: reason },
    after: ['Fix this from your dashboard (for example, upload the right document) and we will check your agency again.'],
    button: { label: 'Open your dashboard', url: env.WEB_URL },
    footnote: `You get this email because ${agency.email} is the contact of ${agency.name}.`,
  };
}

export function suspendedEmail(agency: AgencyContact, reason: string): Email {
  return {
    to: agency.email,
    subject: `${agency.name} is suspended on TransitPro`,
    preheader: `Reason: ${reason}`,
    greeting: 'Hello,',
    paragraphs: [
      `The TransitPro team suspended ${agency.name}. While it is suspended, customers cannot book your trips or send parcels with you, and your staff cannot use the dashboard or the staff app.`,
    ],
    quote: { label: 'Reason', text: reason },
    after: ['Reply to the TransitPro team through your usual contact to fix this. Money we already owe you is still paid.'],
    footnote: `You get this email because ${agency.email} is the contact of ${agency.name}.`,
  };
}

export function reactivatedEmail(agency: AgencyContact): Email {
  return {
    to: agency.email,
    subject: `${agency.name} is active again on TransitPro`,
    preheader: 'Your staff and your customers can use TransitPro again.',
    greeting: 'Hello,',
    paragraphs: [`Good news: ${agency.name} is active again. Customers can book your trips and your staff can log in as before.`],
    button: { label: 'Open your dashboard', url: env.WEB_URL },
    footnote: `You get this email because ${agency.email} is the contact of ${agency.name}.`,
  };
}
