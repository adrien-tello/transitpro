-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "receiverEmail" TEXT,
ADD COLUMN     "senderEmail" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Parcel_agencyId_sealNumber_key" ON "Parcel"("agencyId", "sealNumber");

