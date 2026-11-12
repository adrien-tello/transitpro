import { env } from './config/env';
import { app } from './app';
import { notchpayEnabled } from './lib/notchpay';
import { sweep } from './modules/payments/payments.service';
import { sweep as sweepPayouts } from './modules/payouts/payouts.service';

app.listen(env.PORT, () => {
  console.log(`TransitPro API running on http://localhost:${env.PORT}/api/health`);
  console.log(notchpayEnabled() ? 'Mobile Money: Notch Pay ON' : 'Mobile Money: OFF (no Notch Pay keys), cash only');
});

// Pending Mobile Money payments and outgoing transfers are checked every 5 s, so they complete even on a laptop
// that Notch Pay's webhook cannot reach. One sweep at a time.
if (notchpayEnabled()) {
  let running = false;
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await sweep();
      await sweepPayouts();
    } catch (err) {
      console.error('[payments] sweep failed:', (err as Error).message);
    } finally {
      running = false;
    }
  }, 5000).unref();
}
