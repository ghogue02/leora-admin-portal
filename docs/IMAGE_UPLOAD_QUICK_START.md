# Image Upload Quick Start

## TL;DR

```bash
# 1. Test setup
npm run upload:images:test

# 2. Dry run (no upload)
npm run upload:images:dry-run

# 3. Real upload
npm run upload:images
```

## What This Does

Uploads 2,147 product images from HAL scraper to Supabase Storage:

- **Optimizes**: Converts to WebP (30-50% smaller)
- **3 Sizes**: thumbnail (200x200), catalog (400x400), large (800x800)
- **Resume**: Can restart from failures
- **Progress**: Real-time progress bar

## Before You Start

1. **Verify Environment** (in `/web/.env`):
   ```bash
   SUPABASE_URL="https://zqezunzlyjkseugujkrl.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="[REQUIRED]"
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Test Setup**:
   ```bash
   npm run upload:images:test
   ```

## Usage

### Test First (Recommended)

```bash
# Verify everything is configured correctly
npm run upload:images:test

# Expected output:
# ✅ All tests passed! Ready to run upload script.
```

### Dry Run

```bash
# Test without uploading (validates images, SKU matching)
npm run upload:images:dry-run
```

### Production Upload

```bash
# Upload all images (default: 10 concurrent)
npm run upload:images

# Or with custom batch size
npx tsx src/scripts/upload-hal-images.ts --batch-size 5
```

### Resume on Failure

```bash
# Continue from last processed file
npm run upload:images:resume
```

## What Gets Created

### Supabase Storage Bucket: `product-images`

```
product-images/
├── original/ARG1001-packshot.jpg    (original files)
├── thumbnail/ARG1001-packshot.webp  (200x200)
├── catalog/ARG1001-packshot.webp    (400x400)
└── large/ARG1001-packshot.webp      (800x800)
```

### Progress Files

- **`image-upload-progress.json`** - Resume point tracking
- **`image-upload-errors.json`** - Error details

## Expected Output

```bash
[████████████████████████] 100% | 2147/2147 | ✓ 2135 ✗ 12 | ETA: 0m 0s

📊 Final Summary:
   Total: 2147
   ✓ Completed: 2135
   ✗ Failed: 12
   ⏱️  Total time: 4m 32s
```

## Common Issues

### Missing Service Role Key

```bash
❌ Missing required environment variables:
   SUPABASE_SERVICE_ROLE_KEY
```

**Fix**: Add to `/web/.env`:
```bash
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

Get it from: https://supabase.com/dashboard → Project Settings → API

### Product Not Found for SKU

```bash
⚠️  ARG1234-packshot: SKU not found in database
```

**Fix**: This is normal for some images. They'll be logged in `image-upload-errors.json`.

### Upload Timeout

```bash
Upload failed after 3 retries: Network timeout
```

**Fix**: Reduce batch size:
```bash
npx tsx src/scripts/upload-hal-images.ts --batch-size 3 --resume
```

## Advanced Options

```bash
# Show all options
npx tsx src/scripts/upload-hal-images.ts --help

# Options:
--dry-run              Test without uploading
--batch-size <n>       Concurrent uploads (default: 10)
--resume               Resume from last failure
--skip-optimization    Upload originals only
```

## Next Steps

After successful upload:

1. **Verify Images in Supabase**:
   - Go to https://supabase.com/dashboard
   - Storage → product-images
   - Check folders: original/, thumbnail/, catalog/, large/

2. **Add Image Fields to Product Model**:
   ```prisma
   model Product {
     imageUrl      String?  // catalog size
     thumbnailUrl  String?  // 200x200
     largeUrl      String?  // 800x800
     originalUrl   String?  // original file
   }
   ```

3. **Run Migration**:
   ```bash
   npx prisma migrate dev --name add_product_image_urls
   ```

4. **Re-run Upload** to populate database:
   ```bash
   npm run upload:images
   ```

5. **Update Frontend** to display images

## Full Documentation

See `/web/docs/IMAGE_UPLOAD_GUIDE.md` for detailed documentation.

## Troubleshooting

1. **Test setup first**: `npm run upload:images:test`
2. **Check error log**: `cat image-upload-errors.json`
3. **Check progress**: `cat image-upload-progress.json`
4. **Verify Supabase**: https://supabase.com/dashboard

## Time Estimate

- **Testing**: 1 minute
- **Dry run**: 2-3 minutes
- **Full upload**: 4-6 minutes (2,147 images)
- **Total**: ~10 minutes

## Safety Features

✅ Progress saved every batch (can resume)
✅ Retries failed uploads (3 attempts)
✅ Validates SKU exists before processing
✅ Skips corrupted images
✅ Detailed error logging
✅ Dry run mode for testing
