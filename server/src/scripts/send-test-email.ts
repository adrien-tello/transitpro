// Sends one sample email to check the Gmail settings in server/.env
// Run: npm run email:test -- your.other.address@example.com
import { env } from '../config/env';
import { sendEmail } from '../lib/email';
import { resetCodeEmail } from '../modules/auth/auth.emails';

const to = process.argv[2];
if (!to || !to.includes('@')) {
  console.error('Usage: npm run email:test -- your.other.address@example.com');
  process.exit(1);
}
if (!env.SMTP_USER || !env.SMTP_PASS) {
  console.error('SMTP_USER or SMTP_PASS is empty in server/.env: the email would only be printed here.');
  process.exit(1);
}

sendEmail(resetCodeEmail({ email: to, fullName: 'Test' }, '123456', 10))
  .then(() => console.log(`Sent. Check the inbox (and spam) of ${to}.`))
  .catch(() => {
    console.error('Not sent. EAUTH = wrong SMTP_USER or app password; ECONNECTION = network.');
    process.exit(1);
  });
