# Image Scanning Features

## Overview

Leora includes OCR-powered scanning capabilities for business cards and liquor license placards. These features enable quick customer onboarding and compliance verification.

## Features

### 1. Business Card Scanner

**Location:** `/sales/customers/scan-card`

**Purpose:** Automatically extract contact information from business cards

**Flow:**
1. Open device camera
2. Capture business card photo
3. Process with OCR (Tesseract.js)
4. Extract fields:
   - Company name
   - Contact name
   - Job title
   - Email address
   - Phone number
   - Physical address
   - Website
5. Review and edit extracted data
6. Create customer with pre-populated form

**Technology:**
- Tesseract.js for client-side OCR
- Device camera API (MediaDevices)
- Canvas API for image processing
- Pattern matching for field extraction

**Accuracy:**
- Email: 90%+ (reliable regex pattern)
- Phone: 85%+ (multiple format support)
- Name: 70%+ (heuristic-based)
- Company: 60%+ (keyword matching)

### 2. License Placard Scanner

**Location:** `/sales/customers/scan-license`

**Purpose:** Extract and verify liquor license information for compliance

**Flow:**
1. Open device camera
2. Capture license placard photo
3. Process with OCR
4. Extract license data:
   - License number (required)
   - Business name
   - License type
   - Issue date
   - Expiration date
   - Licensed premises address
5. Verify license status (API integration)
6. Create customer with license tracking

**Compliance Features:**
- License number extraction
- Expiration date tracking
- Automatic compliance alerts
- License verification (when API available)
- Image storage for records

## Image Processing

### Camera Component

**Features:**
- Front/back camera switching
- Rotation controls
- Real-time preview
- Capture with high resolution
- Overlay guides for alignment

**Configuration:**
```typescript
{
  facingMode: 'environment', // Rear camera for documents
  width: 1920,               // High resolution
  height: 1080,
  aspectRatio: 16/9
}
```

### Image Enhancement

**Adjustments Available:**
- Brightness (50-150%)
- Contrast (50-150%)
- Rotation (90° increments)
- Cropping (planned)

**Processing:**
- Canvas-based image manipulation
- Filter application before OCR
- JPEG compression (90% quality)
- Base64 encoding for transfer

## OCR Engine

### Tesseract.js

**Why Tesseract:**
- Free and open source
- Client-side processing (privacy)
- No API costs
- Works offline
- Good accuracy for English text

**Limitations:**
- Slower than cloud APIs (~2-5 seconds)
- Lower accuracy on poor quality images
- Limited to Latin characters
- Requires good lighting

**Alternative Options:**
```typescript
// Google Cloud Vision API
{
  provider: 'google-vision',
  apiKey: process.env.GOOGLE_VISION_KEY,
  // 90%+ accuracy, fast, costs $1.50/1000 images
}

// AWS Textract
{
  provider: 'aws-textract',
  // 95%+ accuracy, structural analysis, $1.50/1000 pages
}
```

## Field Extraction Logic

### Business Card Parsing

```typescript
// Email detection
const emailRegex = /[\w.-]+@[\w.-]+\.\w+/gi;

// Phone detection (multiple formats)
const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;

// Company name (keyword matching)
const companyRegex = /(.*?(?:Inc|LLC|Corp|Corporation|Company|Co\.|Ltd|Limited)\.?)/i;

// Name heuristic: First substantial line
// Title heuristic: Second line (if not contact info)
// Address: Look for zip code pattern
```

### License Parsing

```typescript
// License number patterns (state-specific)
const patterns = [
  /(?:License|Lic|L)[\s#:]+([A-Z0-9-]{5,20})/i,  // Standard format
  /\b([A-Z]{2,3}[-\s]?\d{4,10})\b/,              // State prefix
  /\b(\d{6,12})\b/,                               // Numeric only
];

// Date extraction
const dateRegex = /(?:Exp|Expiration|Valid Until|Expires?)[\s:]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i;

// License type
const typeRegex = /(?:Type|Class|Category)[\s:]+([A-Z0-9-]+)/i;
```

## Storage Integration

### Supabase Storage

**Bucket:** `customer-documents`

**Structure:**
```
customers/
  {customerId}/
    cards/
      {timestamp}-business-card.jpg
    licenses/
      {timestamp}-license.jpg
```

**Configuration:**
- Public bucket (authenticated access)
- 10MB file size limit
- Allowed types: JPEG, PNG, WebP, PDF
- Automatic unique naming
- Public URL generation

**Upload Process:**
1. Convert base64 to Blob
2. Generate unique filename
3. Upload to Supabase Storage
4. Get public URL
5. Store URL in customer record

## Compliance Tracking

### License Verification

**Mock Implementation:**
```typescript
async function verifyLicense(licenseNumber: string) {
  // Simulate API call to state liquor control board
  // Returns: { isValid, status, expirationDate, ... }
}
```

**Production Integration:**
State-specific APIs:
- California: ABC API
- New York: SLA API
- Texas: TABC API
- (Varies by jurisdiction)

### Compliance Alerts

**Alert Types:**
- `missing` - No license on file
- `expiring_soon` - Expires within 60 days
- `expired` - Past expiration date
- `suspended` - License suspended/revoked

**Severity Levels:**
```typescript
{
  critical: 0-7 days or expired
  high: 8-30 days or missing license
  medium: 31-60 days
  low: 60+ days
}
```

**Alert Generation:**
```typescript
generateLicenseAlerts(customers) -> LicenseAlert[]
```

## User Experience

### Business Card Flow

1. **Camera** (Step 1)
   - Launch camera
   - Position card in guide overlay
   - Adjust brightness/rotation
   - Capture image

2. **Preview** (Step 2)
   - Review captured image
   - Adjust brightness/contrast
   - Rotate if needed
   - Retake or confirm

3. **Processing** (Step 3)
   - Show loading spinner
   - Run OCR extraction
   - Parse fields
   - Display confidence score

4. **Review** (Step 4)
   - Show extracted fields
   - Edit incorrect data
   - View raw OCR text
   - Create customer

### License Flow

1. **Capture** (Step 1)
   - Same as business card

2. **Extract** (Step 2)
   - OCR processing
   - License number extraction
   - Field parsing
   - Edit form

3. **Verify** (Step 3)
   - API verification call
   - Status check (active/expired/invalid)
   - Warning display
   - Create customer

## Mobile Optimization

### Camera Permissions

**iOS:**
```xml
<!-- Info.plist -->
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan business cards and licenses</string>
```

**Android:**
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
```

### PWA Support

**Manifest:**
```json
{
  "name": "Leora Mobile",
  "display": "standalone",
  "orientation": "portrait",
  "permissions": ["camera"]
}
```

**Service Worker:**
- Cache OCR engine files
- Offline scanning capability
- Background image processing

### Responsive Design

- Vertical layout for mobile
- Full-screen camera view
- Touch-friendly controls
- Large capture button
- Swipe gestures (planned)

## Testing

### Device Testing

**iOS:**
- Safari (iOS 14+)
- Chrome (iOS 14+)
- Test on iPhone 12+

**Android:**
- Chrome (Android 9+)
- Firefox (Android 9+)
- Test on Pixel/Samsung devices

### OCR Accuracy Testing

**Business Cards:**
- Test various card designs
- Different fonts and layouts
- Dark backgrounds
- Glossy/matte finishes
- International formats

**Licenses:**
- State-specific formats
- Laminated placards
- Wall-mounted licenses
- Different lighting conditions
- Worn/damaged licenses

### Edge Cases

- Low light conditions
- Blurry images
- Tilted/rotated documents
- Partial captures
- Multiple languages
- Handwritten text
- Poor contrast

## Best Practices

### For Users

**Business Cards:**
1. Use good lighting
2. Position card flat
3. Fill the camera frame
4. Avoid shadows
5. Keep camera steady
6. Review extracted data

**Licenses:**
1. Clean placard surface
2. Remove glare/reflections
3. Capture entire document
4. Ensure text is readable
5. Verify license number
6. Check expiration date

### For Developers

**Image Quality:**
- Use highest resolution available
- Apply brightness/contrast adjustments
- Rotate to correct orientation
- Crop to document boundaries
- Compress for storage (90% quality)

**OCR Processing:**
- Initialize worker once
- Reuse worker for multiple scans
- Terminate worker when done
- Handle errors gracefully
- Provide fallback manual entry

**Storage:**
- Compress images before upload
- Use unique filenames
- Implement retry logic
- Clean up failed uploads
- Set appropriate permissions

## Future Enhancements

### Planned Features

1. **Advanced Image Processing**
   - Auto-crop detection
   - Perspective correction
   - Shadow removal
   - Edge enhancement

2. **Batch Scanning**
   - Multiple cards in one session
   - Bulk customer import
   - Progress tracking

3. **Cloud OCR Integration**
   - Google Vision API option
   - AWS Textract option
   - Hybrid approach (client + cloud)

4. **Enhanced Verification**
   - Real-time license verification
   - Multi-state support
   - Automated compliance checks
   - Email verification

5. **AR Features**
   - Real-time text overlay
   - Field highlighting
   - Confidence indicators
   - Live extraction preview

### API Integrations

**License Verification APIs:**
- California ABC API
- New York SLA API
- Texas TABC API
- Multi-state aggregator

**Contact Enrichment:**
- Clearbit API
- Hunter.io (email verification)
- FullContact API
- ZoomInfo API

## Troubleshooting

### Common Issues

**Camera not opening:**
- Check browser permissions
- Verify HTTPS connection
- Test on different browser
- Check device compatibility

**Poor OCR accuracy:**
- Improve lighting
- Clean document surface
- Increase image resolution
- Adjust brightness/contrast
- Try manual entry

**Upload failures:**
- Check internet connection
- Verify Supabase credentials
- Check file size limits
- Review error logs

**Performance issues:**
- Close other apps
- Clear browser cache
- Update browser version
- Test on desktop first

## Dependencies

```json
{
  "tesseract.js": "^4.1.1",
  "@supabase/supabase-js": "^2.38.0",
  "react": "^18.2.0",
  "next": "^14.0.0"
}
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Cloud OCR APIs
GOOGLE_VISION_API_KEY=your-google-key
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

## Usage Example

```typescript
import { tesseractOCR } from '@/lib/ocr/tesseract';
import { uploadBusinessCard } from '@/lib/storage/supabase-storage';

// Scan business card
const result = await tesseractOCR.scanBusinessCard(imageData);

if (result.success && result.data) {
  // Upload image
  const upload = await uploadBusinessCard(imageData, customerId);

  // Create customer
  const customer = {
    ...result.data,
    imageUrl: upload.url,
  };
}
```

## Support

For issues or questions:
- Check device compatibility
- Review browser console
- Test camera permissions
- Verify image quality
- Try manual entry fallback
