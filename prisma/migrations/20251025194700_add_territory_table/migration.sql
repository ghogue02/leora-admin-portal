-- CreateTable
CREATE TABLE IF NOT EXISTS "Territory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "salesRepId" TEXT,
    "boundary" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Territory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Territory_name_key" ON "Territory"("name");

-- CreateIndex
CREATE INDEX "Territory_salesRepId_idx" ON "Territory"("salesRepId");

-- CreateIndex
CREATE INDEX "Territory_isActive_idx" ON "Territory"("isActive");

-- AddForeignKey
ALTER TABLE "Territory" ADD CONSTRAINT "Territory_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add territory column to Customer table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Customer' AND column_name = 'territory') THEN
        ALTER TABLE "Customer" ADD COLUMN "territory" TEXT;
        CREATE INDEX "Customer_territory_idx" ON "Customer"("territory");
    END IF;
END
$$;
