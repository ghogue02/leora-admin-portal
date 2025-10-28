# Image Scanning Setup Guide

## Overview

Image scanning system using Claude Vision API to extract data from:
- Business cards (name, contact info, company)
- Liquor licenses (license #, expiry, business details)

## Architecture

```
Client Upload → Supabase Storage → Job Queue → Claude Vision → Database
     ↓                                                             ↓
  Immediate response (scanId)                              Poll for results
```

## Setup Instructions

### 1. Environment Variables

Ensure these are set in `.env.local`:

```bash
# Anthropic API (required for Claude Vision)
ANTHROPIC_API_KEY=sk-ant-...

# Supabase (required for storage)
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. Initialize Supabase Storage

Create the `customer-scans` bucket:

```bash
cd web
npx tsx scripts/init-supabase-storage.ts
```

### 3. Run Database Migration

Apply the ImageScan model:

```bash
cd web
npx prisma migrate dev --name add_image_scanning
```

### 4. Verify Installation

Test the setup:

```bash
# Test storage bucket exists
npx tsx -e "import { createClient } from '@supabase/supabase-js'; \
  const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); \
  s.storage.listBuckets().then(console.log)"

# Test Anthropic API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
```

## API Usage

### Upload Business Card

```javascript
const formData = new FormData();
formData.append('image', file);
formData.append('tenantId', 'tenant-123');
formData.append('userId', 'user-456');

const response = await fetch('/api/scan/business-card', {
  method: 'POST',
  body: formData
});

const { scanId, status } = await response.json();
// scanId: "scan-abc123"
// status: "processing"
```

### Upload Liquor License

```javascript
const formData = new FormData();
formData.append('image', file);
formData.append('tenantId', 'tenant-123');
formData.append('userId', 'user-456');

const response = await fetch('/api/scan/license', {
  method: 'POST',
  body: formData
});

const { scanId } = await response.json();
```

### Poll for Results

```javascript
// Poll every 2 seconds
const pollInterval = setInterval(async () => {
  const response = await fetch(`/api/scan/${scanId}`);
  const data = await response.json();

  if (data.status === 'completed') {
    clearInterval(pollInterval);
    console.log('Extracted data:', data.extractedData);

    // Business Card Example:
    // {
    //   name: "John Smith",
    //   title: "Sales Director",
    //   company: "Wine Co",
    //   email: "john@wineco.com",
    //   phone: "(555) 123-4567",
    //   confidence: 0.95
    // }

  } else if (data.status === 'failed') {
    clearInterval(pollInterval);
    console.error('Scan failed:', data.errorMessage);
  }
}, 2000);
```

### Create Customer from Scan

```javascript
const response = await fetch(`/api/scan/${scanId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ createCustomer: true })
});

const { customerId, customer } = await response.json();
```

### Retry Failed Scan

```javascript
await fetch(`/api/scan/${scanId}/retry`, {
  method: 'POST'
});
```

## Database Schema

```prisma
model ImageScan {
  id            String    @id @default(uuid())
  tenantId      String
  userId        String
  imageUrl      String
  scanType      String    // "business_card" | "liquor_license"
  extractedData Json
  customerId    String?
  status        String    @default("processing")
  errorMessage  String?
  createdAt     DateTime
  completedAt   DateTime?
}
```

## File Structure

```
web/
├── src/
│   ├── lib/
│   │   ├── image-extraction.ts    # Claude Vision integration
│   │   ├── storage.ts             # Supabase Storage service
│   │   ├── job-queue.ts           # Async job processing
│   │   └── __tests__/
│   │       └── image-extraction.test.ts
│   └── app/api/scan/
│       ├── business-card/route.ts # Upload business card
│       ├── license/route.ts       # Upload license
│       ├── [scanId]/route.ts      # Get results / create customer
│       └── [scanId]/retry/route.ts # Retry failed scan
├── scripts/
│   └── init-supabase-storage.ts   # Bucket setup script
└── prisma/
    └── schema.prisma              # ImageScan model
```

## Job Queue Integration

Image extraction jobs are automatically processed by the existing job queue:

```typescript
// Jobs are created automatically on upload
await enqueueJob('image_extraction', {
  scanId: scan.id,
  imageUrl: uploadedUrl,
  scanType: 'business_card'
});

// Jobs are processed by cron/webhook calling:
// POST /api/jobs/process
```

## Error Handling

The system includes:
- File size validation (5MB max)
- File type validation (JPEG, PNG, WebP)
- Automatic retry logic (3 attempts)
- Error status tracking
- Manual retry endpoint

## Performance

- **Upload**: ~1-2s (image upload to Supabase)
- **Processing**: ~3-8s (Claude Vision extraction)
- **Total**: ~5-10s end-to-end
- **Async**: Non-blocking, client polls for results

## Security

- Service role key required for storage
- Tenant-based file isolation
- Public read URLs (for Claude Vision)
- Files organized by tenant/scan-type

## Testing

Run unit tests:

```bash
cd web
npm test src/lib/__tests__/image-extraction.test.ts
```

## Monitoring

Monitor scans via:
- Job queue UI: `/sales/admin/jobs`
- Database queries:
  ```sql
  SELECT * FROM "ImageScan"
  WHERE status = 'processing'
  ORDER BY "createdAt" DESC;
  ```

## Troubleshooting

### Upload fails with "Bucket not found"
```bash
npx tsx scripts/init-supabase-storage.ts
```

### Extraction fails with "API key invalid"
Check `ANTHROPIC_API_KEY` in `.env.local`

### Jobs not processing
Ensure job queue endpoint is set up:
```bash
curl -X POST http://localhost:3000/api/jobs/process
```

### Low confidence scores
- Check image quality (resolution, lighting)
- Try re-uploading higher quality image
- Manually verify extracted data

## Future Enhancements

- [ ] Batch upload multiple cards/licenses
- [ ] Confidence threshold alerts
- [ ] Manual correction UI
- [ ] Image preprocessing (rotation, enhancement)
- [ ] OCR fallback for low-quality images
- [ ] Multi-language support
