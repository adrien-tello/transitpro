-- AlterEnum
ALTER TYPE "PayoutKind" ADD VALUE 'PLATFORM_WITHDRAWAL';

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_agencyId_fkey";

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "badgeUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payout" ALTER COLUMN "agencyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isMasterAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

