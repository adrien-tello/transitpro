import type { Email } from '../../lib/email';

// Owner: Lead (Fanyi Charllson). The emails of the Auth module, written as plain data.
// lib/email.ts turns them into HTML + text. Other modules copy this pattern (hr.emails.ts...).

interface Person {
  email: string;
  fullName: string;
}

const firstName = (u: Person) => u.fullName.trim().split(/\s+/)[0] || 'there';

// After sign-up (email + password, or Google the first time)
export function welcomeEmail(user: Person): Email {
  return {
    to: user.email,
    subject: 'Welcome to TransitPro',
    preheader: 'Book your bus seat and send parcels with verified agencies.',
    greeting: `Hi ${firstName(user)},`,
    paragraphs: [
      'Welcome to TransitPro. Your account is ready.',
      'With the app you can find a trip with a verified agency, pick your seat and pay with MTN MoMo or Orange Money. You can also send a parcel and follow it until it is delivered.',
      'Every parcel is sealed, weighed and scanned at each step, and the receiver gets it only with a code. If something goes wrong, you can open a claim from the app.',
    ],
    after: ['Have a good trip.'],
    footnote: `You get this email because an account was created on TransitPro with ${user.email}.`,
  };
}

export function resetCodeEmail(user: Person, code: string, minutes: number): Email {
  return {
    to: user.email,
    subject: `${code} is your TransitPro code`,
    preheader: `Use it to choose a new password. It expires in ${minutes} minutes.`,
    greeting: `Hi ${firstName(user)},`,
    paragraphs: ['Here is the code to reset your TransitPro password. Enter it in the app:'],
    code: { value: code, expiresInMinutes: minutes },
    after: [
      "If you didn't ask for this, you can ignore this email. Your password stays the same.",
      'Never share this code. TransitPro staff will never ask you for it.',
    ],
    footnote: `You get this email because someone asked to reset the password of ${user.email}.`,
  };
}

// After a reset or a change: if it wasn't them, they know right away
export function passwordChangedEmail(user: Person): Email {
  const when = new Date().toLocaleString('en-GB', {
    timeZone: 'Africa/Douala',
    dateStyle: 'long',
    timeStyle: 'short',
  });
  return {
    to: user.email,
    subject: 'Your TransitPro password was changed',
    preheader: 'If this was you, there is nothing to do.',
    greeting: `Hi ${firstName(user)},`,
    paragraphs: [
      `The password of your TransitPro account was changed on ${when} (Cameroon time). You were logged out on your other devices.`,
      'If this was you, there is nothing to do.',
      "If it wasn't you, use \"Forgot password\" in the app right away to choose a new one, then contact us.",
    ],
    footnote: `This is a security notice for ${user.email}. It is sent for every password change.`,
  };
}
