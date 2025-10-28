# Image Scanning Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Environment Variables
- [ ] `ANTHROPIC_API_KEY` set in production environment
- [ ] `SUPABASE_URL` configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured
- [ ] Test keys work in production environment

### 2. Database Migration
```bash
cd web
npx prisma migrate deploy
npx prisma generate
```

Expected changes:
- [x] Add `ImageScan` table
- [x] Add `Job` table
- [x] Add foreign keys to Tenant, User, Customer
- [x] Add indexes for performance

### 3. Supabase Storage Setup
```bash
cd web
npx tsx scripts/init-supabase-storage.ts
```

Expected outcome:
- [x] 'customer-scans' bucket created
- [x] Public access enabled
- [x] 5MB file size limit set
- [x] MIME types configured (JPEG, PNG, WebP)

### 4. Dependencies Installation
```bash
cd web
npm install
```

New packages:
- [x] `@anthropic-ai/sdk`
- [x] `@supabase/supabase-js`

### 5. Test API Endpoints

Test business card upload:
```bash
curl -X POST https://your-domain.com/api/scan/business-card \
  -F "image=@test-business-card.jpg" \
  -F "tenantId=test-tenant-id" \
  -F "userId=test-user-id"
```

Test license upload:
```bash
curl -X POST https://your-domain.com/api/scan/license \
  -F "image=@test-license.jpg" \
  -F "tenantId=test-tenant-id" \
  -F "userId=test-user-id"
```

Test status polling:
```bash
curl https://your-domain.com/api/scan/{scanId}
```

### 6. Job Queue Processing

Ensure job processing endpoint is configured:
```bash
# Test job processing
curl -X POST https://your-domain.com/api/jobs/process
```

Set up cron job or webhook to call this endpoint regularly:
- Recommended: Every 30-60 seconds
- Example (Vercel): Use Vercel Cron Jobs
- Example (AWS): Use EventBridge scheduled rules

### 7. Monitor Initial Scans

Check first few scans:
```sql
SELECT * FROM "ImageScan"
ORDER BY "createdAt" DESC
LIMIT 10;
```

Verify:
- [ ] Images uploaded to Supabase Storage
- [ ] Jobs created and processed
- [ ] Extracted data stored correctly
- [ ] Confidence scores reasonable (>0.8)
- [ ] Processing time <10 seconds

### 8. Error Monitoring

Set up alerts for:
- [ ] Failed scans (status = 'failed')
- [ ] Low confidence scores (<0.6)
- [ ] Jobs with max retries (attempts >= 3)
- [ ] Upload errors (500 responses)

Example query:
```sql
SELECT COUNT(*) as failed_count
FROM "ImageScan"
WHERE status = 'failed'
AND "createdAt" > NOW() - INTERVAL '1 hour';
```

### 9. Performance Testing

Test with realistic images:
- [ ] High-quality business card: Should extract all fields
- [ ] Low-quality card: Should complete but lower confidence
- [ ] Liquor license: Should extract license #, business name, dates
- [ ] Damaged/partial image: Should fail gracefully

Expected metrics:
- Upload time: 1-2s
- Processing time: 3-8s
- Total time: 5-10s
- Confidence: >0.9 for good images

### 10. Security Audit

Verify:
- [ ] Tenant isolation works (users can't access other tenants' scans)
- [ ] File upload size limits enforced (5MB)
- [ ] File type validation works (only JPEG, PNG, WebP)
- [ ] Service role key not exposed to client
- [ ] Error messages don't leak sensitive data

### 11. Documentation

Ensure team has access to:
- [ ] `/docs/IMAGE_SCANNING_SETUP.md` - Setup guide
- [ ] `/docs/API_IMAGE_SCANNING.md` - API reference
- [ ] `IMPLEMENTATION_SUMMARY.md` - Technical overview
- [ ] Test images for manual testing

### 12. Rollback Plan

If issues occur:
```sql
-- Disable image scanning (soft rollback)
-- Don't delete tables, just prevent new scans
-- Option 1: Remove API routes temporarily
-- Option 2: Add feature flag

-- Hard rollback (if needed)
DROP TABLE "ImageScan" CASCADE;
DROP TABLE "Job" CASCADE;

-- Then run:
-- npx prisma migrate resolve --rolled-back <migration-name>
```

## 📊 Post-Deployment Monitoring

### Week 1
- [ ] Monitor scan success rate (target: >90%)
- [ ] Check average confidence scores (target: >0.85)
- [ ] Review failed scans manually
- [ ] Adjust prompts if needed
- [ ] Monitor API costs (Anthropic usage)

### Week 2-4
- [ ] Gather user feedback
- [ ] Identify common extraction errors
- [ ] Consider prompt improvements
- [ ] Optimize job queue settings
- [ ] Plan UI enhancements

## 🔧 Troubleshooting Common Issues

### Issue: Scans stay in "processing" forever
**Fix:**
1. Check job queue is running: `curl -X POST /api/jobs/process`
2. Check job attempts: `SELECT * FROM "Job" WHERE status = 'pending'`
3. Manually process: Call job processing endpoint
4. Check for errors in logs

### Issue: Low confidence scores (<0.7)
**Fix:**
1. Check image quality
2. Review extracted data manually
3. Consider adjusting prompts
4. Add image preprocessing

### Issue: "Bucket not found" errors
**Fix:**
```bash
npx tsx scripts/init-supabase-storage.ts
```

### Issue: "API key invalid" errors
**Fix:**
1. Verify `ANTHROPIC_API_KEY` in environment
2. Test key: `curl https://api.anthropic.com/v1/messages ...`
3. Check Anthropic dashboard for key status
4. Rotate key if needed

### Issue: Upload fails with 500 errors
**Fix:**
1. Check Supabase storage status
2. Verify service role key permissions
3. Check file size (<5MB)
4. Check file type (JPEG, PNG, WebP)
5. Review server logs

## 📈 Success Metrics

Track these KPIs:
- **Scan Success Rate**: % of scans that complete successfully
- **Average Confidence**: Mean confidence score of completed scans
- **Processing Time**: p50, p95, p99 latency
- **Extraction Accuracy**: % of fields correctly extracted (manual audit)
- **Customer Creation Rate**: % of scans that result in customer creation
- **Cost per Scan**: Anthropic API costs + storage costs

Target metrics:
- Success rate: >90%
- Confidence: >0.85 average
- Processing: <10s p95
- Accuracy: >95% for high-quality images
- Cost: <$0.01 per scan

## 🚀 Ready for Production

When all checkboxes are complete and metrics are acceptable:
- [ ] All checklist items above completed
- [ ] Team trained on image scanning features
- [ ] Documentation published
- [ ] Monitoring and alerts configured
- [ ] Support team briefed on troubleshooting
- [ ] Rollback plan tested
- [ ] User announcement prepared

**Deployment Approved:** _______________  **Date:** ___________
