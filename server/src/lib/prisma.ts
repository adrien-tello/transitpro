import { PrismaClient } from '@prisma/client';

// One Prisma client for the whole server. Always import it from here.
// Transactions get more time than Prisma's 5 s default: the database is in the cloud (about 180 ms per round trip
// from Cameroon), so a sign-up or a parcel scan with several queries could be cut off on a slow connection.
export const prisma = new PrismaClient({
  transactionOptions: { maxWait: 10_000, timeout: 20_000 },
});
