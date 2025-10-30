# Job Queue Infrastructure - Usage Guide

## Overview

The job queue system provides async processing for long-running tasks in a serverless environment. It's database-backed (Prisma) and supports automatic retries, error handling, and monitoring.

## Quick Start

### 1. Add Database Schema

First, add the `Job` model to your Prisma schema:

```prisma
// Add to web/prisma/schema.prisma

model Job {
  id          String   @id @default(uuid()) @db.Uuid
  type        String   // "image_extraction", "customer_enrichment", etc.
  payload     Json
  status      String   @default("pending") // "pending", "processing", "completed", "failed"
  attempts    Int      @default(0)
  error       String?
  createdAt   DateTime @default(now())
  completedAt DateTime?

  @@index([status, createdAt])
}
```

Run migration:

```bash
cd web
npx prisma migrate dev --name add_job_queue
```

### 2. Set Environment Variables

Add to `.env.local`:

```bash
# Job processor API key (generate a secure random string)
JOB_PROCESSOR_API_KEY=your-secret-key-here
```

Generate a secure key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Set Up Cron Job (Production)

#### Option A: Vercel Cron

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/jobs/process",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

#### Option B: GitHub Actions

Create `.github/workflows/job-processor.yml`:

```yaml
name: Process Job Queue
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes

jobs:
  process-jobs:
    runs-on: ubuntu-latest
    steps:
      - name: Process Jobs
        run: |
          curl -X POST https://your-app.vercel.app/api/jobs/process \
            -H "x-api-key: ${{ secrets.JOB_PROCESSOR_API_KEY }}"
```

#### Option C: External Service (cron-job.org, EasyCron, etc.)

Set up a webhook to call:

```
POST https://your-app.vercel.app/api/jobs/process
Headers: x-api-key: your-secret-key
```

## Usage Examples

### Enqueue a Job

```typescript
// In your API route or server action
import { enqueueJob } from '@/lib/job-queue';

// Example: Enqueue image extraction job
const jobId = await enqueueJob('image_extraction', {
  scanId: scan.id,
  imageUrl: uploadedImageUrl,
  scanType: 'business_card'
});

// Return job ID to client for status polling
return NextResponse.json({
  jobId,
  status: 'processing',
  message: 'Job enqueued successfully'
});
```

### Check Job Status

```typescript
import { getJobStatus } from '@/lib/job-queue';

const job = await getJobStatus(jobId);

if (job) {
  console.log(`Job status: ${job.status}`);

  if (job.status === 'completed') {
    console.log('Job completed at:', job.completedAt);
  } else if (job.status === 'failed') {
    console.log('Job error:', job.error);
  }
}
```

### Process Jobs Manually (Testing)

```bash
# Process up to 10 jobs
curl -X POST http://localhost:3000/api/jobs/process \
  -H "x-api-key: your-secret-key"

# Process specific number of jobs
curl -X POST "http://localhost:3000/api/jobs/process?maxJobs=5" \
  -H "x-api-key: your-secret-key"

# Get queue status
curl -X GET http://localhost:3000/api/jobs/process \
  -H "x-api-key: your-secret-key"
```

## Supported Job Types

### 1. Image Extraction

Extracts structured data from business cards and liquor licenses using Claude Vision.

```typescript
await enqueueJob('image_extraction', {
  scanId: string,
  imageUrl: string,
  scanType: 'business_card' | 'liquor_license'
});
```

### 2. Customer Enrichment

AI-powered product data enrichment (coming soon).

```typescript
await enqueueJob('customer_enrichment', {
  customerId: string,
  productId?: string
});
```

### 3. Report Generation

Generates complex reports asynchronously (coming soon).

### 4. Bulk Import

Processes bulk data imports (CSV, Excel) (coming soon).

## Adding New Job Types

### Step 1: Define Job Type

```typescript
// In job-queue.ts

export interface MyCustomPayload {
  customField: string;
  anotherField: number;
}

// Add to JobType union
export type JobType =
  | 'image_extraction'
  | 'my_custom_job'; // Add here
```

### Step 2: Create Handler Function

```typescript
// In job-queue.ts

async function processMyCustomJob(payload: MyCustomPayload): Promise<void> {
  const { customField, anotherField } = payload;

  // Your processing logic here
  console.log('Processing custom job:', customField);

  // Update database, call APIs, etc.
}
```

### Step 3: Add to Router

```typescript
// In routeJobToHandler()

async function routeJobToHandler(type: JobType, payload: JobPayload): Promise<void> {
  switch (type) {
    // ... existing cases

    case 'my_custom_job':
      await processMyCustomJob(payload as MyCustomPayload);
      break;
  }
}
```

## Monitoring & Maintenance

### Monitor Queue Status

```typescript
import { getPendingJobs } from '@/lib/job-queue';

const pending = await getPendingJobs();
console.log(`${pending.length} jobs pending`);
```

### Clean Up Old Jobs

Run periodically to prevent database bloat:

```typescript
import { cleanupOldJobs } from '@/lib/job-queue';

// Delete jobs older than 30 days
const deleted = await cleanupOldJobs(30);
console.log(`Deleted ${deleted} old jobs`);
```

### Error Handling

Jobs automatically retry up to 3 times. Failed jobs are marked with:
- `status: 'failed'`
- `error: string` (error message)
- `attempts: 3` (max attempts reached)

## Architecture Notes

### Why Database-Backed?

- **Serverless-friendly**: No long-running processes required
- **Durable**: Jobs survive crashes and deployments
- **Simple**: No additional infrastructure (Redis, RabbitMQ, etc.)
- **Debuggable**: Inspect jobs directly in database

### Performance Considerations

- **Batch Processing**: Process multiple jobs per invocation (default: 10)
- **Indexing**: Jobs table indexed on `[status, createdAt]` for fast queries
- **Cleanup**: Regularly delete old completed/failed jobs
- **Monitoring**: Track pending job count in production

### Scaling

For high-volume scenarios (1000+ jobs/minute), consider:
1. Upgrading to dedicated queue service (BullMQ, SQS, etc.)
2. Horizontal scaling with multiple processors
3. Database connection pooling
4. Job batching and prioritization

## Integration with Leora Features

### Business Card Scanning

```typescript
// /app/api/scan/business-card/route.ts

export async function POST(request: Request) {
  // 1. Upload image
  const imageUrl = await uploadImage(file, tenantId, 'business-card');

  // 2. Create scan record
  const scan = await prisma.imageScan.create({
    data: {
      tenantId,
      userId,
      imageUrl,
      scanType: 'business_card',
      status: 'processing'
    }
  });

  // 3. Enqueue async extraction
  await enqueueJob('image_extraction', {
    scanId: scan.id,
    imageUrl,
    scanType: 'business_card'
  });

  // 4. Return immediately
  return NextResponse.json({
    scanId: scan.id,
    status: 'processing'
  });
}
```

### License Scanning

Same pattern as business card, but with `scanType: 'liquor_license'`.

## Troubleshooting

### Jobs Not Processing

1. **Check cron job is running**: Verify Vercel Cron or GitHub Actions
2. **Check API key**: Ensure `JOB_PROCESSOR_API_KEY` is set correctly
3. **Check logs**: Look for errors in job processing
4. **Manual trigger**: Test with `curl` to rule out cron issues

### Jobs Failing Repeatedly

1. **Check error message**: `job.error` field contains details
2. **Check API keys**: Ensure `ANTHROPIC_API_KEY` is set (for image extraction)
3. **Check payload**: Verify job payload structure is correct
4. **Check max attempts**: Failed jobs stop after 3 attempts

### Slow Processing

1. **Increase maxJobs**: Process more jobs per invocation
2. **Increase cron frequency**: Run every 1-2 minutes instead of 5
3. **Check AI API latency**: Claude Vision calls may be slow
4. **Monitor database**: Ensure queries are fast (check indexes)

## Security Best Practices

1. **API Key**: Use strong random key for `JOB_PROCESSOR_API_KEY`
2. **Environment Variables**: Never commit keys to git
3. **HTTPS Only**: Always use HTTPS for job processor endpoint
4. **Rate Limiting**: Consider adding rate limits to prevent abuse
5. **Payload Validation**: Validate job payloads before processing

## Next Steps

1. ✅ Database schema added
2. ✅ Job queue infrastructure created
3. ✅ API route implemented
4. 🔲 Set up cron job (production)
5. 🔲 Implement image extraction (requires ANTHROPIC_API_KEY)
6. 🔲 Add job status polling to UI
7. 🔲 Set up monitoring/alerting

## Files Created

```
web/
├── src/
│   ├── lib/
│   │   └── job-queue.ts           # Core job queue logic
│   └── app/
│       └── api/
│           └── jobs/
│               └── process/
│                   └── route.ts   # Job processor endpoint
└── prisma/
    └── schema.prisma              # Add Job model here
```

## Additional Resources

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [GitHub Actions Scheduled Events](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [Prisma Job Queues](https://www.prisma.io/docs/guides/performance-and-optimization/job-queues)
