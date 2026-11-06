import { PrismaClient } from '@prisma/client';

// One Prisma client for the whole server. Always import it from here.
export const prisma = new PrismaClient();
