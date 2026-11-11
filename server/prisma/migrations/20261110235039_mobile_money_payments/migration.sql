-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "payerPhone" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "settledAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerRef_key" ON "Payment"("providerRef");

-- CreateIndex
CREATE INDEX "Payment_status_provider_idx" ON "Payment"("status", "provider");

