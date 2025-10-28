# Phase 4: Scanner Features Installation Guide

## Overview

This guide covers installation and setup of the OCR scanning features for business cards and liquor licenses.

## Dependencies

### Required Dependencies

Add Tesseract.js for OCR processing:

```bash
npm install tesseract.js@^4.1.1
```

### Verification

The following dependencies should already be installed:
- `@supabase/supabase-js` (for storage)
- `react`, `next` (framework)
- All UI components from previous phases

## Supabase Storage Setup

### 1. Create Storage Bucket

In Supabase Dashboard:

1. Go to Storage section
2. Create new bucket: `customer-documents`
3. Set bucket to **Public**
4. Configure settings:
   - File size limit: 10MB
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`

### 2. Set Storage Policies

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'customer-documents');

-- Allow authenticated users to read documents
CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'customer-documents');

-- Allow authenticated users to delete their documents
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'customer-documents');
```

## Database Schema Updates

Add license tracking fields to customers table:

```sql
-- Add license tracking columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS license_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS license_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS license_issue_date DATE,
ADD COLUMN IF NOT EXISTS license_expiration_date DATE,
ADD COLUMN IF NOT EXISTS license_image_url TEXT,
ADD COLUMN IF NOT EXISTS business_card_image_url TEXT;

-- Create index for license expiration tracking
CREATE INDEX IF NOT EXISTS idx_customers_license_expiration
ON customers(license_expiration_date)
WHERE license_expiration_date IS NOT NULL;

-- Create index for license number lookups
CREATE INDEX IF NOT EXISTS idx_customers_license_number
ON customers(license_number)
WHERE license_number IS NOT NULL;
```

## Environment Variables

Ensure these are set in `.env.local`:

```env
# Required for scanner features
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: For cloud OCR (not currently used)
# GOOGLE_VISION_API_KEY=your-google-key
# AWS_ACCESS_KEY_ID=your-aws-key
# AWS_SECRET_ACCESS_KEY=your-aws-secret
```

## Build and Test

### 1. Install Dependencies

```bash
cd /Users/greghogue/Leora2/web
npm install tesseract.js
```

### 2. Build Project

```bash
npm run build
```

### 3. Run Development Server

```bash
npm run dev
```

## Testing the Scanners

### Business Card Scanner

1. Navigate to: `http://localhost:3000/sales/customers/scan-card`
2. Grant camera permissions when prompted
3. Position a business card in the camera frame
4. Capture the image
5. Review extracted data
6. Test the "Create Customer" flow

### License Scanner

1. Navigate to: `http://localhost:3000/sales/customers/scan-license`
2. Grant camera permissions
3. Capture a liquor license placard
4. Review extracted license information
5. Test verification flow
6. Verify customer creation with license data

## Mobile Testing

### iOS Testing

1. Ensure HTTPS is enabled (required for camera access)
2. Use ngrok or similar for local HTTPS:
   ```bash
   ngrok http 3000
   ```
3. Open ngrok URL on iPhone
4. Test camera access and scanning

### Android Testing

1. Same HTTPS requirement
2. Test on Chrome for Android
3. Verify camera permissions dialog
4. Test capture and processing

## Troubleshooting

### Camera Not Working

**Issue:** Camera permission denied
**Solution:**
- Check browser settings
- Ensure HTTPS connection (required)
- Try different browser
- Check device camera permissions

**Issue:** Black screen on camera
**Solution:**
- Check if another app is using camera
- Restart browser
- Clear browser cache
- Test on different device

### OCR Not Working

**Issue:** Tesseract worker fails to initialize
**Solution:**
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules
npm install
```

**Issue:** Poor extraction accuracy
**Solution:**
- Improve lighting
- Hold camera steady
- Ensure document is flat
- Increase image quality
- Clean document surface

### Storage Issues

**Issue:** Upload fails
**Solution:**
- Verify Supabase credentials
- Check storage bucket exists
- Verify bucket is public
- Check file size (max 10MB)
- Review storage policies

**Issue:** Images not displaying
**Solution:**
- Check public URL generation
- Verify bucket permissions
- Test direct URL access
- Review CORS settings

## Navigation Integration

Add scanner links to customer page navigation:

```typescript
// In /sales/customers page
<div className="flex gap-2">
  <Link
    href="/sales/customers/scan-card"
    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
  >
    Scan Business Card
  </Link>
  <Link
    href="/sales/customers/scan-license"
    className="px-4 py-2 bg-green-600 text-white rounded-lg"
  >
    Scan License
  </Link>
  <Link
    href="/sales/customers/new"
    className="px-4 py-2 bg-gray-600 text-white rounded-lg"
  >
    Manual Entry
  </Link>
</div>
```

## Performance Optimization

### Image Compression

Images are automatically compressed to 90% JPEG quality before storage. To adjust:

```typescript
// In CameraCapture.tsx
const imageData = canvas.toDataURL('image/jpeg', 0.9); // 90% quality

// For higher quality (larger files):
const imageData = canvas.toDataURL('image/jpeg', 0.95);

// For lower quality (smaller files):
const imageData = canvas.toDataURL('image/jpeg', 0.75);
```

### OCR Worker Management

Tesseract worker is reused across scans. To optimize:

```typescript
// Initialize once at app start
import { tesseractOCR } from '@/lib/ocr/tesseract';

// In _app.tsx or layout.tsx
useEffect(() => {
  tesseractOCR.initialize();
  return () => tesseractOCR.terminate();
}, []);
```

## Compliance Features

### License Expiration Alerts

Add to customer dashboard:

```typescript
import { generateLicenseAlerts } from '@/lib/compliance/license-verification';

// In customers list page
const alerts = generateLicenseAlerts(customers);

// Display critical alerts
const criticalAlerts = alerts.filter(a => a.severity === 'critical');
```

### Automated Compliance Checks

Set up cron job for daily checks:

```typescript
// In API route: /api/cron/check-licenses
import { generateLicenseAlerts } from '@/lib/compliance/license-verification';

export async function GET(request: Request) {
  const customers = await fetchCustomersWithLicenses();
  const alerts = generateLicenseAlerts(customers);

  // Send notifications for critical alerts
  await sendComplianceAlerts(alerts);

  return Response.json({ success: true, alerts: alerts.length });
}
```

## API Integration (Future)

### State License Verification APIs

To integrate real license verification:

```typescript
// Update verifyLicense function in license-verification.ts

async function verifyLicense(licenseNumber: string, state: string) {
  // California ABC API
  if (state === 'CA') {
    const response = await fetch(
      `https://api.abc.ca.gov/licenses/${licenseNumber}`
    );
    return response.json();
  }

  // Add other states...
}
```

### Rate Limiting

Implement rate limiting for API calls:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
});

app.use('/api/verify-license', limiter);
```

## Security Considerations

### Image Storage Security

1. **Sanitize Filenames:**
   - Remove special characters
   - Use timestamps for uniqueness
   - Prevent path traversal

2. **Virus Scanning:**
   - Consider ClamAV for uploaded files
   - Scan before storing permanently

3. **Access Control:**
   - Implement row-level security
   - Restrict access to customer's own documents
   - Audit file access

### Data Privacy

1. **GDPR Compliance:**
   - Store consent for image capture
   - Provide data deletion
   - Allow export of stored images

2. **PII Protection:**
   - Encrypt sensitive license data
   - Limit access to compliance team
   - Audit access logs

## Monitoring

### Error Tracking

Add error logging:

```typescript
try {
  const result = await tesseractOCR.scanBusinessCard(image);
} catch (error) {
  // Log to monitoring service
  console.error('OCR Error:', {
    error: error.message,
    timestamp: new Date(),
    imageSize: image.length,
  });

  // Send to Sentry, LogRocket, etc.
  Sentry.captureException(error);
}
```

### Usage Analytics

Track scanner usage:

```typescript
// Track successful scans
analytics.track('Business Card Scanned', {
  confidence: result.confidence,
  fieldsExtracted: Object.keys(result.data).length,
  processingTime: processingTime,
});

// Track failures
analytics.track('OCR Failed', {
  errorType: error.type,
  imageQuality: imageQuality,
});
```

## Next Steps

1. Install dependencies: `npm install tesseract.js`
2. Run database migrations
3. Create Supabase storage bucket
4. Test on mobile devices
5. Set up compliance monitoring
6. Configure license verification APIs (when available)

## Support

For issues with scanner features:
- Check browser console for errors
- Verify camera permissions
- Test image quality
- Review Supabase logs
- Check storage bucket configuration
