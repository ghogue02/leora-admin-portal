# HAL Product Images Upload Instructions

## Overview

This guide explains how to upload 2,147 product images from HAL scraper output to Supabase Storage and link them to the product catalog.

## Prerequisites ✅

All prerequisites have been verified:

- ✅ Supabase project: `https://zqezunzlyjkseugujkrl.supabase.co`
- ✅ Service role key configured in `.env`
- ✅ Storage bucket `product-images` created
- ✅ Public access policies configured
- ✅ Images location: `/Users/greghogue/Leora2/scripts/hal-scraper/output/images/`
- ✅ Upload script created: `src/scripts/upload-images-simple.ts`

## Storage Bucket Configuration

The following SQL has been executed to set up the storage bucket:

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Public read access
CREATE POLICY "Public Access for Product Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Authenticated upload access
CREATE POLICY "Authenticated Upload for Product Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Service role full access
CREATE POLICY "Service Role All Access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'product-images');
```

## Image Filename Format

Images follow this naming convention:

- `{SKU_CODE}-packshot.jpg` - Product bottle/can photo
- `{SKU_CODE}-frontLabel.jpg` - Front label close-up
- `{SKU_CODE}-backLabel.jpg` - Back label close-up

**Examples**:
- `CAL1004-packshot.jpg`
- `VINIFERA_CHARDONNAY-frontLabel.png`
- `REX2060-backLabel.jpg`

## Upload Process

### Step 1: Install Dependencies

```bash
cd /Users/greghogue/Leora2/web
npm install @supabase/supabase-js
```

### Step 2: Run Upload Script

```bash
npx tsx src/scripts/upload-images-simple.ts
```

### Expected Output

```
🚀 Starting HAL Product Image Upload

📁 Source: /Users/greghogue/Leora2/scripts/hal-scraper/output/images
🪣 Bucket: product-images
🔗 Supabase: https://zqezunzlyjkseugujkrl.supabase.co

✅ Bucket "product-images" verified

✅ Database connected

📊 Found 2147 images to process

📤 [1/2147] (0.0%) CAL1004-packshot.jpg -> CAL1004 (packshot)
📤 [2/2147] (0.1%) CAL1004-frontLabel.jpg -> CAL1004 (frontLabel)
📤 [3/2147] (0.1%) CAL1004-backLabel.jpg -> CAL1004 (backLabel)
...
📤 [500/2147] (23.3%) ...
...
📤 [1000/2147] (46.6%) ...
...
📤 [2147/2147] (100.0%) ...

================================================================================
📊 UPLOAD SUMMARY
================================================================================
Total Images:        2147
✅ Uploaded:          2147
💾 DB Records:        2147
❌ Failed:            0
⏭️  Skipped:           0
================================================================================

📝 Detailed report saved to: /Users/greghogue/Leora2/web/docs/IMAGE_UPLOAD_REPORT.json
```

## What the Script Does

1. **Validates Environment**
   - Checks Supabase credentials
   - Verifies images directory exists
   - Confirms storage bucket is ready

2. **For Each Image**:
   - Parses filename to extract SKU and image type
   - Uploads to `product-images/original/{filename}`
   - Generates public URL
   - Creates `ProductImage` database record with:
     - `tenantId`: Default tenant
     - `skuCode`: Extracted from filename
     - `imageType`: packshot/frontLabel/backLabel
     - `storageUrl`: Public URL
     - `displayOrder`: 1=packshot, 2=frontLabel, 3=backLabel

3. **Progress Tracking**
   - Shows real-time upload progress
   - Displays percentage complete
   - Reports upload and database insertion status

4. **Error Handling**
   - Continues on individual failures
   - Logs all errors
   - Reports detailed summary at end

## Database Records Created

Each uploaded image creates a record like:

```sql
INSERT INTO "ProductImage" (
  id,
  "tenantId",
  "skuCode",
  "imageType",
  "storageUrl",
  "displayOrder",
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '58b8126a-2d2f-4f55-bc98-5b6784800bed',
  'CAL1004',
  'packshot',
  'https://zqezunzlyjkseugujkrl.supabase.co/storage/v1/object/public/product-images/original/CAL1004-packshot.jpg',
  1,
  NOW(),
  NOW()
);
```

## Public URL Format

Images are accessible at:

```
https://zqezunzlyjkseugujkrl.supabase.co/storage/v1/object/public/product-images/original/{filename}
```

**Example**:
```
https://zqezunzlyjkseugujkrl.supabase.co/storage/v1/object/public/product-images/original/CAL1004-packshot.jpg
```

## Verification

After upload completes, verify in Supabase Dashboard:

1. **Storage**: https://supabase.com/dashboard → Storage → product-images
   - Should show 2,147 files in `original/` folder

2. **Database**: SQL Editor
   ```sql
   SELECT COUNT(*) FROM "ProductImage";
   -- Expected: 2147

   SELECT "imageType", COUNT(*)
   FROM "ProductImage"
   GROUP BY "imageType";
   -- Expected: ~715 per type (packshot, frontLabel, backLabel)
   ```

3. **Test Public Access**: Open any image URL in browser
   - Should display image without authentication

## Troubleshooting

### Upload Failures

If uploads fail:

1. **Check Supabase credentials**:
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Verify bucket exists**:
   ```sql
   SELECT * FROM storage.buckets WHERE name = 'product-images';
   ```

3. **Check storage policies**:
   ```sql
   SELECT * FROM storage.policies WHERE bucket_id = 'product-images';
   ```

### Database Insertion Failures

If ProductImage records fail to create:

1. **Check SKU exists**:
   ```sql
   SELECT code FROM "SKU" WHERE code = 'CAL1004';
   ```

2. **Check for duplicates**:
   ```sql
   SELECT "skuCode", "imageType", COUNT(*)
   FROM "ProductImage"
   GROUP BY "skuCode", "imageType"
   HAVING COUNT(*) > 1;
   ```

3. **Verify tenant ID**:
   ```sql
   SELECT id FROM "Tenant" WHERE id = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
   ```

## Re-running Upload

The script uses `upsert: true` for storage uploads, so it's safe to re-run:

- Existing files will be overwritten
- Database records will be skipped (unique constraint on skuCode + imageType)

To force re-upload:

```bash
# Delete all ProductImage records
npx tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); p.productImage.deleteMany({}).then(r => console.log('Deleted:', r.count));"

# Re-run upload
npx tsx src/scripts/upload-images-simple.ts
```

## Estimated Duration

- **Upload time**: ~5-10 minutes (2,147 images @ ~200ms each)
- **Database inserts**: ~30 seconds
- **Total**: ~10-15 minutes

## Success Criteria

✅ Upload is successful when:

1. All 2,147 images uploaded to Supabase Storage
2. All 2,147 ProductImage records created
3. Public URLs accessible without authentication
4. Images correctly linked to SKU codes
5. Display order set correctly (packshot=1, frontLabel=2, backLabel=3)

## Next Steps

After successful upload:

1. **Verify images display in product catalog**
2. **Test image loading performance**
3. **Consider image optimization** (resizing, compression)
4. **Set up CDN caching** (Supabase handles this automatically)
5. **Monitor storage usage** in Supabase dashboard

## Storage Limits

- **Current usage**: 2,147 images × ~50KB avg = ~107MB
- **Bucket limit**: 50MB per file, 52,428,800 bytes configured
- **Project limit**: Check Supabase plan (typically 1GB+ free tier)

---

**Status**: ✅ Ready to execute

**Command**: `npx tsx src/scripts/upload-images-simple.ts`
