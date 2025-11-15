# Product Images Upload Script

## Overview

Streamlined script to upload product images to Supabase Storage and generate SQL for database records.

## Features

- ✅ Uses `@supabase/supabase-js` for reliable uploads
- ✅ No Prisma dependency
- ✅ Generates SQL INSERT statements
- ✅ Progress tracking with ETA
- ✅ Batch processing to avoid rate limits
- ✅ Error handling and retry-friendly

## Prerequisites

1. **Supabase Bucket**: Create `product-images` bucket in Supabase Dashboard
   - Go to: Storage > New Bucket
   - Name: `product-images`
   - Public: Yes (for public URLs)

2. **Environment Variables**: Required in `.env`:
   ```bash
   SUPABASE_URL="https://zqezunzlyjkseugujkrl.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."
   ```

3. **Images**: Located at `/Users/greghogue/Leora2/scripts/hal-scraper/output/images/`
   - Expected format: `{SKU}-{type}.{ext}`
   - Example: `ARG1001-packshot.jpg`, `ARG1001-frontLabel.png`

## Usage

### Step 1: Run Upload Script

```bash
cd /Users/greghogue/Leora2/web
npx tsx src/scripts/upload-images-mcp.ts
```

**What it does**:
1. Verifies Supabase bucket exists
2. Reads all images from source directory
3. Uploads each image to Supabase Storage
4. Generates SQL INSERT for ProductImage table
5. Saves SQL to `/tmp/product-images-insert.sql`

**Expected output**:
```
🚀 Streamlined Image Upload Script

📂 Source Directory: /Users/greghogue/Leora2/scripts/hal-scraper/output/images
🪣 Supabase Bucket: product-images
📄 SQL Output: /tmp/product-images-insert.sql

🔍 Verifying Supabase Storage bucket...
✅ Bucket verified

📋 Reading image files...
📦 Found 2147 images to upload

[████████████████████████████████████████] 100% (2147/2147) - ETA: 0s

📊 Upload Summary
════════════════════════════════════════════════════════════
✅ Successful uploads: 2147
❌ Failed uploads: 0
📄 SQL file generated: /tmp/product-images-insert.sql
⏱️  Total time: 3m 45s (9.5 images/sec)

🚀 Next Steps:
════════════════════════════════════════════════════════════
1. Review the generated SQL file:
   cat /tmp/product-images-insert.sql

2. Execute SQL to create database records:
   cat /tmp/product-images-insert.sql | psql "postgresql://..."

3. Verify uploads in Supabase Dashboard:
   Storage > product-images

✅ Upload complete! Database records ready to be created.
```

### Step 2: Review SQL File

```bash
# View first few records
head -50 /tmp/product-images-insert.sql

# Count total INSERT statements
grep "INSERT INTO" /tmp/product-images-insert.sql | wc -l
```

### Step 3: Execute SQL

```bash
# Execute SQL to create ProductImage records
cat /tmp/product-images-insert.sql | psql "postgresql://postgres.zqezunzlyjkseugujkrl:9gpGHuAIr2vKf4hO@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

**Expected output**:
```
BEGIN
INSERT 0 1
INSERT 0 1
INSERT 0 1
...
COMMIT
```

### Step 4: Verify Database Records

```bash
# Check ProductImage count
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.productImage.count().then(count => {
  console.log(\`Total ProductImages: \${count}\`);
  return prisma.\$disconnect();
});
"
```

## Image Types and Display Order

The script automatically determines image type from filename:

| Filename Pattern | Image Type | Display Order |
|-----------------|------------|---------------|
| `{SKU}-packshot.*` | `packshot` | 1 |
| `{SKU}-frontLabel.*` | `frontLabel` | 2 |
| `{SKU}-backLabel.*` | `backLabel` | 3 |

## SQL Structure

Each image generates an INSERT like this:

```sql
INSERT INTO "ProductImage" (id, "tenantId", "skuCode", "imageType", "storageUrl", "displayOrder", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '58b8126a-2d2f-4f55-bc98-5b6784800bed',
  'ARG1001',
  'packshot',
  'https://zqezunzlyjkseugujkrl.supabase.co/storage/v1/object/public/product-images/ARG1001-packshot.jpg',
  1,
  NOW(),
  NOW()
);
```

## Error Handling

### Common Errors

1. **Missing Bucket**:
   ```
   ❌ Bucket "product-images" does not exist
      Create it in Supabase Dashboard: Storage > New Bucket
   ```
   **Solution**: Create bucket in Supabase Dashboard

2. **Missing Environment Variables**:
   ```
   ❌ Missing required environment variables:
      - SUPABASE_URL
      - SUPABASE_SERVICE_ROLE_KEY
   ```
   **Solution**: Add to `.env` file

3. **Upload Failures**:
   ```
   ❌ Failed Uploads:
      - ARG1001-packshot.jpg: Rate limit exceeded
   ```
   **Solution**: Script is retry-friendly. Re-run to upload failed images (uses `upsert: true`)

### Retry Failed Uploads

The script uses `upsert: true`, so you can safely re-run it:

```bash
# Re-run script - only uploads missing/failed images
npx tsx src/scripts/upload-images-mcp.ts
```

## Performance

- **Batch Size**: 50 images per batch (configurable)
- **Rate Limit Protection**: 100ms delay between batches
- **Expected Speed**: ~8-10 images/sec
- **Total Time** (2147 images): ~3-4 minutes

## Database Schema

```prisma
model ProductImage {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid
  productId    String?  @db.Uuid
  skuCode      String
  imageType    String   // 'packshot', 'frontLabel', 'backLabel'
  storageUrl   String   // Full Supabase Storage URL
  thumbnailUrl String?  // Optimized 200x200
  catalogUrl   String?  // Optimized 400x400
  displayOrder Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([skuCode])
  @@index([tenantId, skuCode])
}
```

## Troubleshooting

### Script Hangs
- Check network connection
- Verify Supabase URL and API key
- Reduce `BATCH_SIZE` if rate limited

### SQL Execution Fails
- Ensure PostgreSQL connection string is correct
- Use port **5432** (direct connection), not 6543 (pgbouncer)
- Check transaction conflicts (re-run if needed)

### Images Not Visible
- Verify bucket is **public** in Supabase Dashboard
- Check Storage URL format in database
- Test URL in browser

## Files

- **Script**: `/Users/greghogue/Leora2/web/src/scripts/upload-images-mcp.ts`
- **SQL Output**: `/tmp/product-images-insert.sql`
- **Images**: `/Users/greghogue/Leora2/scripts/hal-scraper/output/images/`

## Key Design Decisions

1. **Supabase JS over Prisma**: Prisma can't directly upload files to Storage
2. **SQL Generation**: Allows batch insert and verification before execution
3. **Upsert Mode**: Safe to re-run for failed uploads
4. **No Product Linking**: ProductImage.productId is NULL initially (link separately)
5. **SKU-Based**: Uses `skuCode` as primary reference (not productId)

## Next Steps After Upload

1. **Link to Products**: Run script to match ProductImage.skuCode to Product records
2. **Generate Thumbnails**: Create optimized versions for catalog
3. **Update Product URLs**: Set Product.imageUrl to main packshot
4. **Verify Coverage**: Check which SKUs are missing images
