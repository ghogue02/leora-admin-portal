# ProductImage Migration - HAL Image Support

## Overview
This migration adds support for product images from HAL's image management system.

## Changes

### 1. New ProductImage Model
Creates a new `ProductImage` table to store product images with the following features:
- Multiple image types per product (packshot, frontLabel, backLabel)
- Direct SKU code mapping for flexible association
- Optimized thumbnail and catalog URLs
- Cascading deletes with Product and Tenant
- Efficient indexing for queries

**Fields:**
- `id` - UUID primary key
- `tenantId` - Tenant association (required)
- `productId` - Product association (optional, allows orphaned images)
- `skuCode` - SKU code reference (required)
- `imageType` - Type of image: 'packshot', 'frontLabel', 'backLabel'
- `storageUrl` - Full Supabase Storage URL
- `thumbnailUrl` - Optimized 200x200 thumbnail (optional)
- `catalogUrl` - Optimized 400x400 catalog image (optional)
- `displayOrder` - Sort order for multiple images (default: 0)
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

**Indexes:**
- `ProductImage_productId_idx` - Fast product lookups
- `ProductImage_skuCode_idx` - Fast SKU lookups
- `ProductImage_tenantId_idx` - Tenant isolation
- `ProductImage_tenantId_skuCode_idx` - Composite lookup optimization

**Relations:**
- `product` - Optional reference to Product (CASCADE delete)
- `tenant` - Required reference to Tenant (CASCADE delete)

### 2. Product Model Updates
Adds two new fields to the `Product` table:
- `halUrl` (TEXT, optional) - URL to HAL product page
- `halWarehouseLocation` (TEXT, optional) - Physical warehouse location from HAL

Adds new relation:
- `images` - Array of ProductImage records

### 3. Tenant Model Updates
Adds new relation:
- `productImages` - Array of ProductImage records for tenant isolation

## Apply Migration

**Method 1: Direct psql (RECOMMENDED)**
```bash
cat prisma/migrations/20251115085216_add_product_images/migration.sql | \
  psql "postgresql://postgres.PROJECT:PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

**Method 2: Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click SQL Editor
4. Paste migration SQL
5. Click RUN

## Verify Migration

```bash
# Check table exists
psql "postgresql://..." -c "SELECT * FROM information_schema.tables WHERE table_name = 'ProductImage';"

# Check columns
psql "postgresql://..." -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ProductImage';"

# Check indexes
psql "postgresql://..." -c "SELECT indexname FROM pg_indexes WHERE tablename = 'ProductImage';"

# Check Product table updates
psql "postgresql://..." -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'Product' AND column_name IN ('halUrl', 'halWarehouseLocation');"
```

## After Migration

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Update TypeScript Types:**
   The Prisma Client will automatically include the new ProductImage type.

3. **Example Usage:**
   ```typescript
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();

   // Create product with images
   const product = await prisma.product.create({
     data: {
       name: "Example Wine",
       tenantId: TENANT_ID,
       images: {
         create: [
           {
             tenantId: TENANT_ID,
             skuCode: "WC-123",
             imageType: "packshot",
             storageUrl: "https://storage.supabase.co/...",
             thumbnailUrl: "https://storage.supabase.co/.../thumb.jpg",
             catalogUrl: "https://storage.supabase.co/.../catalog.jpg",
             displayOrder: 0
           }
         ]
       }
     }
   });

   // Query product with images
   const productWithImages = await prisma.product.findUnique({
     where: { id: productId },
     include: { images: true }
   });

   // Query images by SKU
   const images = await prisma.productImage.findMany({
     where: {
       tenantId: TENANT_ID,
       skuCode: "WC-123"
     },
     orderBy: { displayOrder: 'asc' }
   });
   ```

## Rollback

If you need to rollback this migration:

```sql
-- Drop foreign key constraints first
ALTER TABLE "ProductImage" DROP CONSTRAINT "ProductImage_productId_fkey";
ALTER TABLE "ProductImage" DROP CONSTRAINT "ProductImage_tenantId_fkey";

-- Drop indexes
DROP INDEX "ProductImage_productId_idx";
DROP INDEX "ProductImage_skuCode_idx";
DROP INDEX "ProductImage_tenantId_idx";
DROP INDEX "ProductImage_tenantId_skuCode_idx";

-- Drop table
DROP TABLE "ProductImage";

-- Remove Product columns
ALTER TABLE "Product" DROP COLUMN "halUrl";
ALTER TABLE "Product" DROP COLUMN "halWarehouseLocation";
```

## Notes

- ProductImage.productId is optional to support images that may not have a matched Product yet
- SKU code is always required for image-product association
- Multiple images per product are supported via displayOrder
- Cascading deletes ensure cleanup when Products or Tenants are removed
- Tenant isolation is enforced via indexes and foreign keys
