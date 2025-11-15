# HAL Product Image Upload Guide

## Overview

This script processes and uploads 2,147 product images from the HAL scraper output to Supabase Storage. It handles image optimization, multi-size generation, and database integration.

## Features

- **Image Optimization**: Converts images to WebP format (30-50% smaller)
- **Multi-Size Generation**: Creates 3 sizes (thumbnail: 200x200, catalog: 400x400, large: 800x800)
- **Resume Support**: Can resume from last failure point
- **Progress Tracking**: Real-time progress bar with ETA
- **Error Handling**: Retries failed uploads (3 attempts max)
- **Dry Run Mode**: Test without uploading
- **Batch Processing**: Configurable concurrent uploads

## Prerequisites

1. **Environment Variables** (in `/web/.env`):
   ```bash
   SUPABASE_URL="https://zqezunzlyjkseugujkrl.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="[YOUR_SERVICE_ROLE_KEY]"
   ```

2. **Dependencies** (already installed):
   ```bash
   npm install sharp @supabase/storage-js
   ```

3. **Source Images**:
   - Location: `/Users/greghogue/Leora2/scripts/hal-scraper/output/images/`
   - Count: 2,147 images
   - Format: `SKU-{packshot|frontLabel|backLabel}.{jpg|png}`

## Usage

### Basic Commands

```bash
# Dry run (test without uploading)
npx tsx src/scripts/upload-hal-images.ts --dry-run

# Full upload with default settings (10 concurrent)
npx tsx src/scripts/upload-hal-images.ts

# Custom batch size (5 concurrent uploads)
npx tsx src/scripts/upload-hal-images.ts --batch-size 5

# Resume from last failure
npx tsx src/scripts/upload-hal-images.ts --resume

# Upload originals only (no optimization)
npx tsx src/scripts/upload-hal-images.ts --skip-optimization

# Show help
npx tsx src/scripts/upload-hal-images.ts --help
```

### Recommended Workflow

1. **Test with dry run**:
   ```bash
   npx tsx src/scripts/upload-hal-images.ts --dry-run
   ```
   This validates:
   - Image files are readable
   - SKU codes match database records
   - Optimization works correctly
   - No uploads to Supabase

2. **Start small batch**:
   ```bash
   npx tsx src/scripts/upload-hal-images.ts --batch-size 5
   ```
   Starts with 5 concurrent uploads to verify everything works.

3. **Monitor progress**:
   Progress is saved to `image-upload-progress.json` every batch.

4. **Resume if interrupted**:
   ```bash
   npx tsx src/scripts/upload-hal-images.ts --resume
   ```

## Supabase Storage Structure

The script creates a bucket `product-images` with the following structure:

```
product-images/
├── original/          # Original uploaded files
│   ├── ARG1001-packshot.jpg
│   ├── ARG1001-frontLabel.jpg
│   └── ...
├── thumbnail/         # 200x200 WebP thumbnails
│   ├── ARG1001-packshot.webp
│   ├── ARG1001-frontLabel.webp
│   └── ...
├── catalog/           # 400x400 WebP catalog images
│   ├── ARG1001-packshot.webp
│   └── ...
└── large/             # 800x800 WebP large images
    ├── ARG1001-packshot.webp
    └── ...
```

## Progress Files

### `image-upload-progress.json`
Tracks upload progress:
```json
{
  "total": 2147,
  "completed": 1523,
  "failed": 12,
  "skipped": 0,
  "lastProcessedFile": "ARG1234-packshot",
  "startTime": "2025-11-15T10:00:00.000Z",
  "errors": []
}
```

### `image-upload-errors.json`
Detailed error log:
```json
[
  {
    "file": "ARG1234-packshot",
    "error": "Product not found for SKU: ARG1234",
    "timestamp": "2025-11-15T10:30:00.000Z"
  }
]
```

## Database Integration

### Current Limitation

⚠️ **The Product model doesn't have image URL fields yet.**

The script currently:
- ✅ Uploads images to Supabase Storage
- ✅ Generates public URLs for all sizes
- ✅ Validates SKU codes exist in database
- ❌ Does NOT store URLs in Product table (no imageUrl field)

### Future Migration Needed

To store image URLs, add these fields to the Product model:

```prisma
model Product {
  // ... existing fields ...
  imageUrl      String?  // Main image (catalog size)
  thumbnailUrl  String?  // Thumbnail (200x200)
  largeUrl      String?  // Large view (800x800)
  originalUrl   String?  // Original uploaded file
}
```

Then update the script to store URLs:
```typescript
await prisma.product.update({
  where: { id: product.id },
  data: {
    imageUrl: result.catalogUrl,
    thumbnailUrl: result.thumbnailUrl,
    largeUrl: result.largeUrl,
    originalUrl: result.originalUrl,
  },
});
```

## Image Types & Display Order

| Type        | Display Order | Description              |
|-------------|---------------|--------------------------|
| packshot    | 1             | Full product shot        |
| frontLabel  | 2             | Front label close-up     |
| backLabel   | 3             | Back label (less common) |

## Performance

- **Optimization**: ~30-50% size reduction with WebP
- **Processing Speed**: ~10-20 images/second (depends on batch size)
- **Estimated Time**: 2-5 minutes for all 2,147 images

### Batch Size Recommendations

| Batch Size | Use Case                          | Speed   | Safety  |
|------------|-----------------------------------|---------|---------|
| 1-5        | Testing, slow network             | Slow    | Safest  |
| 10         | Recommended default               | Medium  | Good    |
| 20-30      | Fast network, production          | Fast    | Moderate|
| 50         | Maximum (network bottleneck risk) | Fastest | Risky   |

## Troubleshooting

### Error: Missing environment variables
```bash
❌ Missing required environment variables:
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
```

**Solution**: Check `/web/.env` has correct Supabase credentials.

### Error: Bucket creation failed
```bash
Failed to create bucket: Bucket already exists
```

**Solution**: This is usually fine - the bucket already exists. Script will continue.

### Error: Product not found for SKU
```bash
Product not found for SKU: XYZ123
```

**Solution**:
1. Check if SKU exists in database: `npx prisma studio`
2. Verify image filename matches SKU code exactly
3. Check SKU is linked to a Product record

### Error: Upload failed after retries
```bash
Upload failed after 3 retries: Network timeout
```

**Solution**:
1. Check internet connection
2. Reduce batch size: `--batch-size 5`
3. Resume: `--resume`

### Corrupted/Unreadable Images

The script automatically skips corrupted images and logs them to `image-upload-errors.json`.

**To handle manually**:
1. Check error log
2. Re-download/fix corrupted images
3. Resume upload with `--resume`

## Example Output

```bash
🖼️  HAL Product Image Upload Script

⚙️  Configuration:
   Dry run: NO
   Batch size: 10
   Resume: NO
   Skip optimization: NO

🔌 Connecting to database...
✅ Database connected

✅ Using tenant: Well Crafted Wine & Beverage Co. (...)

🪣 Creating Supabase storage bucket...
✅ Bucket created successfully

📂 Scanning image directory...
✅ Found 2147 valid image files

🚀 Processing images...

[████████████████████████████████████████] 100.0% | 2147/2147 | ✓ 2135 ✗ 12 ⊘ 0 | ETA: 0m 0s

📊 Final Summary:
   Total: 2147
   ✓ Completed: 2135
   ✗ Failed: 12
   ⊘ Skipped: 0

⚠️  12 errors occurred
   See image-upload-errors.json for details

⏱️  Total time: 4m 32s

✅ Done!
```

## Next Steps

After successful upload:

1. **Add migration** to add image URL fields to Product model
2. **Re-run script** to populate image URLs in database
3. **Update frontend** to display images from Supabase URLs
4. **Test image loading** in product catalog and detail views
5. **Add image fallbacks** for missing/failed uploads

## Support

For issues or questions:
1. Check error logs: `image-upload-errors.json`
2. Review progress: `image-upload-progress.json`
3. Run dry-run to test: `--dry-run`
4. Check Supabase dashboard: https://supabase.com/dashboard
