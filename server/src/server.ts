import { env } from './config/env';
import { app } from './app';

app.listen(env.PORT, () => {
  console.log(`TransitPro API running on http://localhost:${env.PORT}/api/health`);
});
