# Image Upload Scripts

Complete image optimization and upload system for HAL product images.

## 🚀 Quick Start

```bash
# 1. Check Supabase configuration
npm run upload:images:check

# 2. Test full setup
npm run upload:images:test

# 3. Dry run (no upload)
npm run upload:images:dry-run

# 4. Real upload
npm run upload:images
```

## 📁 Files in This Directory

### Main Scripts

1. **`upload-hal-images.ts`** - Main upload script
   - Optimizes 2,147 product images
   - Uploads to Supabase Storage
   - Generates 3 sizes (thumbnail, catalog, large)
   - Resume support, progress tracking

2. **`test-image-setup.ts`** - Environment validator
   - Checks all prerequisites
   - Validates database connection
   - Tests image processing
   - Verifies SKU matching

3. **`check-supabase-config.ts`** - Supabase checker
   - Validates credentials
   - Tests storage connection
   - Lists existing buckets
   - Provides setup instructions

## 📦 NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run upload:images:check` | Check Supabase configuration |
| `npm run upload:images:test` | Full environment test (6 checks) |
| `npm run upload:images:dry-run` | Test upload without uploading |
| `npm run upload:images:resume` | Resume from last failure |
| `npm run upload:images` | Production upload |

## ⚙️ Configuration

### Required Environment Variables

Add to `/web/.env`:

```bash
# Supabase (required for upload)
SUPABASE_URL="https://zqezunzlyjkseugujkrl.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="[GET_FROM_SUPABASE_DASHBOARD]"

# Database (required for SKU validation)
DATABASE_URL="postgresql://..."
```

### Getting Service Role Key

1. Open https://supabase.com/dashboard
2. Select project: `zqezunzlyjkseugujkrl`
3. Settings → API
4. Copy **service_role** key (NOT anon key!)
5. Paste into `.env`

## 🎯 Features

### Image Processing
- ✅ WebP conversion (30-50% smaller)
- ✅ 3 optimized sizes:
  - Thumbnail: 200x200
  - Catalog: 400x400
  - Large: 800x800
- ✅ Preserves originals
- ✅ Handles JPEG, PNG, WebP

### Upload System
- ✅ Batch processing (1-50 concurrent)
- ✅ Retry logic (3 attempts)
- ✅ Resume support
- ✅ Progress tracking
- ✅ Error logging
- ✅ Real-time progress bar

### Safety
- ✅ Dry-run mode
- ✅ SKU validation
- ✅ Tenant filtering
- ✅ Corrupted file detection

## 📊 Usage Examples

### Check Configuration
```bash
npm run upload:images:check

# Output:
# ✅ SUPABASE_URL: Set
# ✅ SUPABASE_SERVICE_ROLE_KEY: Set
# ✅ Successfully connected to Supabase
# ✅ Bucket "product-images" already exists
```

### Test Setup
```bash
npm run upload:images:test

# Checks:
# 1. Environment variables
# 2. Image directory (2,147 files)
# 3. Database connection
# 4. Supabase Storage
# 5. Image processing (Sharp)
# 6. SKU matching
```

### Dry Run
```bash
npm run upload:images:dry-run

# Tests everything except actual upload:
# - Reads all images
# - Optimizes to 3 sizes
# - Validates SKU codes
# - Generates mock URLs
# - No files uploaded
```

### Production Upload
```bash
# Default (10 concurrent)
npm run upload:images

# Custom batch size
npx tsx src/scripts/upload-hal-images.ts --batch-size 5

# Skip optimization (testing)
npx tsx src/scripts/upload-hal-images.ts --skip-optimization
```

### Resume After Failure
```bash
npm run upload:images:resume

# Reads progress from: image-upload-progress.json
# Continues from last processed file
```

## 🗂️ Output Files

### Progress Tracking
**`image-upload-progress.json`**
```json
{
  "total": 2147,
  "completed": 1523,
  "failed": 12,
  "skipped": 0,
  "lastProcessedFile": "ARG1234-packshot",
  "startTime": "2025-11-15T10:00:00Z"
}
```

### Error Log
**`image-upload-errors.json`**
```json
[
  {
    "file": "ARG1234-packshot",
    "error": "Product not found for SKU: ARG1234",
    "timestamp": "2025-11-15T10:30:00Z"
  }
]
```

## 📁 Supabase Storage Structure

Bucket: `product-images`

```
product-images/
├── original/
│   └── ARG1001-packshot.jpg      (original uploaded)
├── thumbnail/
│   └── ARG1001-packshot.webp     (200x200 optimized)
├── catalog/
│   └── ARG1001-packshot.webp     (400x400 optimized)
└── large/
    └── ARG1001-packshot.webp     (800x800 optimized)
```

## 🐛 Troubleshooting

### Issue: Invalid JWT
```
❌ Failed to list buckets: Invalid Compact JWS
```

**Fix**: Update `SUPABASE_SERVICE_ROLE_KEY` in `.env`

Run: `npm run upload:images:check`

### Issue: Database Auth Failed
```
❌ Authentication failed against database server
```

**Fix**: Verify `DATABASE_URL` in `.env`

### Issue: Product Not Found
```
⚠️  Product not found for SKU: ARG1234
```

**Fix**: Normal - logged to `image-upload-errors.json`. Review after upload.

### Issue: Upload Timeout
```
Upload failed after 3 retries: Network timeout
```

**Fix**: Reduce batch size and resume:
```bash
npx tsx src/scripts/upload-hal-images.ts --batch-size 3 --resume
```

## 📈 Performance

### Speed
- **Processing**: 10-20 images/second
- **Total time**: 2-5 minutes (2,147 images)
- **Optimization**: 30-50% size reduction

### Batch Size Guide

| Size | Speed | Use Case |
|------|-------|----------|
| 1-5  | Slow  | Testing, slow network |
| 10   | Medium | **Recommended** |
| 20-30 | Fast  | Production, fast network |
| 50   | Max   | Network limits |

## 📚 Documentation

- **Quick Start**: `/docs/IMAGE_UPLOAD_QUICK_START.md`
- **Full Guide**: `/docs/IMAGE_UPLOAD_GUIDE.md`
- **Migration**: `/docs/PRODUCT_IMAGE_MIGRATION.md`
- **Summary**: `/docs/IMAGE_UPLOAD_SUMMARY.md`

## 🔄 Workflow

```bash
# 1. Check credentials
npm run upload:images:check

# 2. Test environment
npm run upload:images:test

# 3. Dry run
npm run upload:images:dry-run

# 4. Upload for real
npm run upload:images

# 5. Check results
cat image-upload-progress.json
cat image-upload-errors.json

# 6. Verify in Supabase
# https://supabase.com/dashboard → Storage → product-images
```

## ⚠️ Important Notes

### Current Limitation
Product model doesn't have image URL fields yet. Images upload successfully but URLs aren't stored in database.

**Solution**: Run migration (see `/docs/PRODUCT_IMAGE_MIGRATION.md`)

### Image Types
- `packshot` - Main product image (display order: 1)
- `frontLabel` - Front label close-up (display order: 2)
- `backLabel` - Back label (display order: 3)

### File Naming
Expected format: `SKU-{packshot|frontLabel|backLabel}.{jpg|png|webp}`

Examples:
- ✅ `ARG1001-packshot.jpg`
- ✅ `USA2024-frontLabel.png`
- ❌ `invalid-name.jpg` (skipped)

## 🎯 Success Criteria

- [ ] Configuration check passes
- [ ] All 6 tests pass
- [ ] Dry run completes
- [ ] Upload completes (>95% success)
- [ ] Images visible in Supabase
- [ ] Error rate < 5%

---

**Status**: ✅ Ready for use
**Last Updated**: 2025-11-15
