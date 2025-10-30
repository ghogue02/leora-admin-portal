-- AlterEnum: Add HOLD to AccountType
ALTER TYPE "AccountType" ADD VALUE 'HOLD';

-- AlterTable: Add CSV import fields to Customer
ALTER TABLE "Customer" ADD COLUMN "quarterlyRevenueTarget" DECIMAL(12,2);
ALTER TABLE "Customer" ADD COLUMN "buyerFirstName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "buyerLastName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "csvImportedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "csvLastSyncedAt" TIMESTAMP(3);
