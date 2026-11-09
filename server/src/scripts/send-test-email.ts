// Sends one sample email to check the Gmail settings in server/.env
// Run: npm run email:test -- your.other.address@example.com
import { env } from '../config/env';
import { sendEmail } from '../lib/email';

const to = process.argv[2];
if (!to || !to.includes('@')) {
  console.error('Usage: npm run email:test -- your.other.address@example.com');
  process.exit(1);
}
if (!env.SMTP_USER || !env.SMTP_PASS) {
  console.error('SMTP_USER or SMTP_PASS is empty in server/.env: the email would only be printed here.');
  process.exit(1);
}

sendEmail({
  to,
  subject: '123456 is your TransitPro code (test)',
  preheader: 'If you can read this, TransitPro emails work.',
  title: 'Test email',
  lines: ['If you can read this, the server can send emails. This code is fake.'],
  code: { value: '123456', expiresInMinutes: 10 },
})
  .then(() => console.log(`Sent. Check the inbox (and spam) of ${to}.`))
  .catch(() => {
    console.error('Not sent. EAUTH = wrong SMTP_USER or app password; ECONNECTION = network.');
    process.exit(1);
  });
