# Product Image URL Migration

## Overview

This migration adds image URL fields to the Product model to store Supabase Storage URLs.

## Migration Steps

### 1. Update Prisma Schema

Add to `prisma/schema.prisma` in the `Product` model:

```prisma
model Product {
  id                 String                     @id @default(uuid()) @db.Uuid
  tenantId           String                     @db.Uuid
  supplierId         String?                    @db.Uuid
  name               String
  brand              String?
  description        String?
  category           String?

  // ... existing fields ...

  // NEW: Image URLs from Supabase Storage
  imageUrl           String?                    // Main image (catalog size: 400x400)
  thumbnailUrl       String?                    // Thumbnail (200x200)
  largeUrl           String?                    // Large image (800x800)
  originalImageUrl   String?                    // Original uploaded file
  backLabelUrl       String?                    // Back label image
  frontLabelUrl      String?                    // Front label image

  isSampleOnly       Boolean                    @default(false)
  createdAt          DateTime                   @default(now())
  updatedAt          DateTime                   @updatedAt

  // ... rest of model ...
}
```

### 2. Create Migration

```bash
cd web
npx prisma migrate dev --name add_product_image_urls
```

### 3. Apply to Production (Supabase)

**Option A: Direct psql (Recommended)**

```bash
# Generate migration SQL
cat prisma/migrations/YYYYMMDD_add_product_image_urls/migration.sql

# Apply via psql (port 5432, not 6543)
cat prisma/migrations/YYYYMMDD_add_product_image_urls/migration.sql | \
  psql "postgresql://postgres.zqezunzlyjkseugujkrl:9gpGHuAIr2vKf4hO@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

**Option B: Supabase Dashboard**

1. Go to https://supabase.com/dashboard
2. SQL Editor
3. Paste migration SQL
4. Run

### 4. Verify Migration

```bash
# Check columns exist
psql "postgresql://postgres.zqezunzlyjkseugujkrl:9gpGHuAIr2vKf4hO@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require" \
  -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'Product' AND column_name LIKE '%Url';"

# Expected output:
#      column_name
# ---------------------
#  imageUrl
#  thumbnailUrl
#  largeUrl
#  originalImageUrl
#  backLabelUrl
#  frontLabelUrl
```

### 5. Regenerate Prisma Client

```bash
npx prisma generate
```

## Migration SQL (Manual)

If auto-migration fails, run this SQL directly:

```sql
-- Add image URL columns to Product table
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "largeUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "originalImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "backLabelUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "frontLabelUrl" TEXT;

-- Add index for faster image lookup (optional)
CREATE INDEX IF NOT EXISTS "Product_imageUrl_idx" ON "Product"("imageUrl")
  WHERE "imageUrl" IS NOT NULL;
```

## Updated Upload Script

After migration, update `/web/src/scripts/upload-hal-images.ts` in the `updateProductWithImage` function:

```typescript
async function updateProductWithImage(
  result: UploadResult,
  tenantId: string,
): Promise<void> {
  const sku = await prisma.sku.findFirst({
    where: {
      code: result.skuCode,
      product: {
        tenantId,
      },
    },
    include: {
      product: true,
    },
  });

  if (!sku || !sku.product) {
    throw new Error(`Product not found for SKU: ${result.skuCode}`);
  }

  // Update product with all image URLs
  const updateData: any = {
    updatedAt: new Date(),
  };

  // Set appropriate URL based on image type
  switch (result.imageType) {
    case 'packshot':
      updateData.imageUrl = result.catalogUrl;
      updateData.thumbnailUrl = result.thumbnailUrl;
      updateData.largeUrl = result.largeUrl;
      updateData.originalImageUrl = result.originalUrl;
      break;

    case 'frontLabel':
      updateData.frontLabelUrl = result.catalogUrl;
      break;

    case 'backLabel':
      updateData.backLabelUrl = result.catalogUrl;
      break;
  }

  await prisma.product.update({
    where: { id: sku.product.id },
    data: updateData,
  });
}
```

## Frontend Usage

After migration and re-upload, use images in components:

```tsx
import Image from 'next/image';

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="product-card">
      {/* Thumbnail for grid view */}
      {product.thumbnailUrl && (
        <Image
          src={product.thumbnailUrl}
          alt={product.name}
          width={200}
          height={200}
          className="rounded-lg"
        />
      )}

      {/* Fallback if no image */}
      {!product.thumbnailUrl && (
        <div className="w-[200px] h-[200px] bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500">No image</span>
        </div>
      )}
    </div>
  );
}

function ProductDetail({ product }: { product: Product }) {
  return (
    <div className="product-detail">
      {/* Large image for detail view */}
      {product.largeUrl && (
        <Image
          src={product.largeUrl}
          alt={product.name}
          width={800}
          height={800}
          className="rounded-xl"
          priority
        />
      )}

      {/* Additional images */}
      <div className="flex gap-4 mt-4">
        {product.frontLabelUrl && (
          <Image
            src={product.frontLabelUrl}
            alt={`${product.name} - Front Label`}
            width={200}
            height={200}
            className="rounded cursor-pointer hover:opacity-80"
          />
        )}

        {product.backLabelUrl && (
          <Image
            src={product.backLabelUrl}
            alt={`${product.name} - Back Label`}
            width={200}
            height={200}
            className="rounded cursor-pointer hover:opacity-80"
          />
        )}
      </div>
    </div>
  );
}
```

## Image Optimization Best Practices

### Next.js Image Component

Use Next.js `<Image>` component for automatic optimization:

```tsx
import Image from 'next/image';

// ✅ GOOD: Uses Next.js Image optimization
<Image
  src={product.imageUrl}
  alt={product.name}
  width={400}
  height={400}
  placeholder="blur"
  blurDataURL="/product-placeholder.webp"
/>

// ❌ BAD: Direct img tag (no optimization)
<img src={product.imageUrl} alt={product.name} />
```

### Supabase Image Transformation (Advanced)

Supabase supports on-the-fly image transformations:

```tsx
// Original URL
const originalUrl = product.imageUrl;
// https://...supabase.co/storage/v1/object/public/product-images/catalog/ARG1001-packshot.webp

// Transform on-the-fly (resize, quality, format)
const transformedUrl = `${originalUrl}?width=300&height=300&quality=85`;
```

## Rollback

If migration fails, rollback:

```sql
-- Remove added columns
ALTER TABLE "Product"
  DROP COLUMN IF EXISTS "imageUrl",
  DROP COLUMN IF EXISTS "thumbnailUrl",
  DROP COLUMN IF EXISTS "largeUrl",
  DROP COLUMN IF EXISTS "originalImageUrl",
  DROP COLUMN IF EXISTS "backLabelUrl",
  DROP COLUMN IF EXISTS "frontLabelUrl";

-- Remove index
DROP INDEX IF EXISTS "Product_imageUrl_idx";
```

## Performance Considerations

### Database

- Image URLs are small (< 200 chars each)
- Negligible storage impact
- Optional index speeds up image filtering

### Storage

- 2,147 images × 4 sizes = 8,588 files
- Estimated storage: ~500MB total
- Supabase free tier: 1GB storage (sufficient)

### Bandwidth

- WebP format = 30-50% smaller than JPEG/PNG
- CDN caching via Supabase
- Lazy loading with Next.js Image component

## Testing

```bash
# 1. Run migration
npx prisma migrate dev --name add_product_image_urls

# 2. Verify schema
npx prisma studio

# 3. Re-run image upload
npm run upload:images

# 4. Check database
npx tsx -e "
  import { PrismaClient } from '@prisma/client';
  const prisma = new PrismaClient();
  prisma.product.findMany({
    where: { imageUrl: { not: null } },
    select: { name: true, imageUrl: true, thumbnailUrl: true }
  }).then(products => {
    console.log(\`Found \${products.length} products with images\`);
    console.log(products.slice(0, 5));
  }).finally(() => prisma.\$disconnect());
"
```

## Monitoring

Check image upload success rate:

```sql
-- Products with images
SELECT COUNT(*) as with_images
FROM "Product"
WHERE "imageUrl" IS NOT NULL;

-- Products without images
SELECT COUNT(*) as without_images
FROM "Product"
WHERE "imageUrl" IS NULL;

-- Image coverage percentage
SELECT
  ROUND(
    COUNT(CASE WHEN "imageUrl" IS NOT NULL THEN 1 END)::numeric /
    COUNT(*)::numeric * 100,
    2
  ) as coverage_percentage
FROM "Product";
```

## Next Steps

1. ✅ Run migration
2. ✅ Re-run image upload script
3. ✅ Update frontend components
4. Test image loading in UI
5. Add image upload UI for new products
6. Implement image cropping/editing
7. Add image CDN/optimization layer
