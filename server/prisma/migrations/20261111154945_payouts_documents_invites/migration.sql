-- CreateEnum
CREATE TYPE "PayoutKind" AS ENUM ('AGENCY_PAYOUT', 'COD_TO_SENDER');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "payoutChannel" TEXT,
ADD COLUMN     "payoutName" TEXT,
ADD COLUMN     "payoutPhone" TEXT,
ADD COLUMN     "suspensionReason" TEXT;

-- AlterTable
ALTER TABLE "AgencyDocument" ADD COLUMN     "mime" TEXT NOT NULL DEFAULT 'image/jpeg';

-- AlterTable
ALTER TABLE "StaffInvite" ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "kind" "PayoutKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "failureReason" TEXT,
    "escrowId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payout_providerRef_key" ON "Payout"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_escrowId_key" ON "Payout"("escrowId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "Payout_agencyId_kind_idx" ON "Payout"("agencyId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyDocument_agencyId_type_key" ON "AgencyDocument"("agencyId", "type");

-- CreateIndex
CREATE INDEX "StaffInvite_agencyId_email_idx" ON "StaffInvite"("agencyId", "email");

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

