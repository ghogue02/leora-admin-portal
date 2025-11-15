-- Add halUrl and halWarehouseLocation columns to Product table
ALTER TABLE "Product" ADD COLUMN "halUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN "halWarehouseLocation" TEXT;

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID,
    "skuCode" TEXT NOT NULL,
    "imageType" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "catalogUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductImage_skuCode_idx" ON "ProductImage"("skuCode");

-- CreateIndex
CREATE INDEX "ProductImage_tenantId_idx" ON "ProductImage"("tenantId");

-- CreateIndex
CREATE INDEX "ProductImage_tenantId_skuCode_idx" ON "ProductImage"("tenantId", "skuCode");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
