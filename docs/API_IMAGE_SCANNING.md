# Image Scanning API Reference

## Overview

The Image Scanning API uses Claude Vision to extract structured data from business cards and liquor licenses. Processing is asynchronous via job queue to avoid serverless timeouts.

## Endpoints

### POST /api/scan/business-card

Upload a business card image for extraction.

**Request:**
```http
POST /api/scan/business-card
Content-Type: multipart/form-data

image: File (JPEG/PNG/WebP, max 5MB)
tenantId: string
userId: string
```

**Response (200):**
```json
{
  "scanId": "abc123...",
  "status": "processing",
  "message": "Business card scan initiated. Poll /api/scan/{scanId} for results."
}
```

**Errors:**
- `400` - Missing required fields or invalid file
- `500` - Upload or job creation failed

**Example:**
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('tenantId', currentTenant.id);
formData.append('userId', currentUser.id);

const res = await fetch('/api/scan/business-card', {
  method: 'POST',
  body: formData
});

const { scanId } = await res.json();
```

---

### POST /api/scan/license

Upload a liquor license image for extraction.

**Request:**
```http
POST /api/scan/license
Content-Type: multipart/form-data

image: File (JPEG/PNG/WebP, max 5MB)
tenantId: string
userId: string
```

**Response (200):**
```json
{
  "scanId": "xyz789...",
  "status": "processing",
  "message": "License scan initiated. Poll /api/scan/{scanId} for results."
}
```

**Errors:**
- `400` - Missing required fields or invalid file
- `500` - Upload or job creation failed

---

### GET /api/scan/{scanId}

Check scan status and retrieve extracted data.

**Request:**
```http
GET /api/scan/{scanId}
```

**Response - Processing (200):**
```json
{
  "scanId": "abc123...",
  "status": "processing",
  "scanType": "business_card",
  "createdAt": "2025-01-26T12:00:00Z"
}
```

**Response - Completed Business Card (200):**
```json
{
  "scanId": "abc123...",
  "status": "completed",
  "scanType": "business_card",
  "extractedData": {
    "name": "John Smith",
    "title": "Sales Director",
    "company": "Wine Co",
    "phone": "(555) 123-4567",
    "email": "john@wineco.com",
    "address": "123 Main St, New York, NY 10001",
    "website": "www.wineco.com",
    "notes": "LinkedIn: linkedin.com/in/johnsmith",
    "confidence": 0.95
  },
  "customerId": null,
  "customer": null,
  "completedAt": "2025-01-26T12:00:08Z"
}
```

**Response - Completed License (200):**
```json
{
  "scanId": "xyz789...",
  "status": "completed",
  "scanType": "liquor_license",
  "extractedData": {
    "licenseNumber": "ABC-123456",
    "businessName": "Best Liquor Store",
    "licenseType": "Off-Premises",
    "issuedDate": "2024-01-15",
    "expiryDate": "2025-01-14",
    "state": "NY",
    "address": "456 Oak Ave, New York, NY 10002",
    "restrictions": "No Sunday sales before 12pm",
    "notes": "Class A license",
    "confidence": 0.92
  },
  "customerId": null,
  "customer": null,
  "completedAt": "2025-01-26T12:00:06Z"
}
```

**Response - Failed (200):**
```json
{
  "scanId": "abc123...",
  "status": "failed",
  "errorMessage": "Could not extract name from business card",
  "completedAt": "2025-01-26T12:00:05Z"
}
```

**Errors:**
- `404` - Scan not found

**Polling Example:**
```javascript
async function pollScanStatus(scanId) {
  const maxAttempts = 30; // 60 seconds max
  const interval = 2000; // 2 seconds

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`/api/scan/${scanId}`);
    const data = await res.json();

    if (data.status === 'completed') {
      return data.extractedData;
    }

    if (data.status === 'failed') {
      throw new Error(data.errorMessage);
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Scan timeout');
}
```

---

### POST /api/scan/{scanId}

Create a customer from extracted scan data.

**Request:**
```http
POST /api/scan/{scanId}
Content-Type: application/json

{
  "createCustomer": true
}
```

**Response (200):**
```json
{
  "customerId": "customer-123...",
  "customer": {
    "id": "customer-123...",
    "tenantId": "tenant-456...",
    "name": "Wine Co",
    "billingEmail": "john@wineco.com",
    "phone": "(555) 123-4567",
    "street1": "123 Main St, New York, NY 10001"
  }
}
```

**Errors:**
- `400` - Scan not completed or customer already created
- `404` - Scan not found
- `500` - Customer creation failed

**Example:**
```javascript
const res = await fetch(`/api/scan/${scanId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ createCustomer: true })
});

const { customerId, customer } = await res.json();
```

---

### POST /api/scan/{scanId}/retry

Retry a failed scan.

**Request:**
```http
POST /api/scan/{scanId}/retry
```

**Response (200):**
```json
{
  "scanId": "abc123...",
  "status": "processing",
  "message": "Scan retry initiated. Poll /api/scan/{scanId} for results."
}
```

**Errors:**
- `400` - Can only retry failed scans
- `404` - Scan not found

**Example:**
```javascript
await fetch(`/api/scan/${scanId}/retry`, {
  method: 'POST'
});

// Then poll for results again
const data = await pollScanStatus(scanId);
```

---

## Data Models

### BusinessCardData
```typescript
{
  name: string;          // Required
  title?: string;
  company?: string;
  phone?: string;        // Formatted as (XXX) XXX-XXXX
  email?: string;
  address?: string;
  website?: string;
  notes?: string;        // Additional info (social media, etc.)
  confidence: number;    // 0-1 scale
}
```

### LicenseData
```typescript
{
  licenseNumber: string;     // Required
  businessName: string;      // Required
  licenseType?: string;      // e.g., "On-Premises", "Off-Premises"
  issuedDate?: string;       // YYYY-MM-DD format
  expiryDate?: string;       // YYYY-MM-DD format
  state?: string;            // State abbreviation
  address?: string;
  restrictions?: string;
  notes?: string;            // Permit classes, endorsements
  confidence: number;        // 0-1 scale
}
```

## Workflow

```
1. Upload image → /api/scan/business-card or /api/scan/license
   ↓
   Returns scanId immediately (non-blocking)

2. Poll status → GET /api/scan/{scanId} every 2 seconds
   ↓
   status: "processing" → Keep polling
   status: "completed" → Extract data available
   status: "failed" → Check errorMessage

3. (Optional) Create customer → POST /api/scan/{scanId}
   ↓
   Creates Customer record from extracted data
   Links customer to scan

4. (If failed) Retry → POST /api/scan/{scanId}/retry
   ↓
   Re-processes the scan
   Go back to step 2
```

## Error Handling

### Upload Errors
- **File too large**: Max 5MB
- **Invalid file type**: Must be JPEG, PNG, or WebP
- **Missing fields**: tenantId and userId required

### Processing Errors
- **Extraction failed**: Image quality too poor
- **Missing required fields**: Name (business card) or license number/business name (license)
- **JSON parsing failed**: Claude Vision returned invalid response
- **API errors**: Rate limits, network issues

### Retry Logic
- Automatic retry: Jobs retry up to 3 times via job queue
- Manual retry: Use `/api/scan/{scanId}/retry` endpoint
- Check `attempts` field in Job model for retry count

## Rate Limits

- **Claude Vision API**: ~50 requests/minute (Anthropic limits)
- **Supabase Storage**: Standard limits apply
- **Recommendation**: Implement client-side throttling if batch uploading

## Best Practices

1. **Validate images client-side** before upload (size, type)
2. **Show progress indicator** while processing
3. **Handle low confidence** (< 0.7): Prompt user to verify/edit
4. **Cache results** on client to avoid re-polling
5. **Provide manual editing** option for extracted data
6. **Set timeout** for polling (30-60 seconds max)
7. **Show retry option** for failed scans

## Example UI Flow

```javascript
// 1. Upload
async function handleImageUpload(file) {
  setLoading(true);
  setError(null);

  try {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('tenantId', tenant.id);
    formData.append('userId', user.id);

    const res = await fetch('/api/scan/business-card', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw new Error('Upload failed');

    const { scanId } = await res.json();

    // 2. Poll for results
    const extractedData = await pollScanStatus(scanId);

    // 3. Show results with confidence indicator
    if (extractedData.confidence < 0.7) {
      setWarning('Low confidence - please verify data');
    }

    setExtractedData(extractedData);
    setScanId(scanId);

  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}

// 4. Create customer
async function handleCreateCustomer() {
  const res = await fetch(`/api/scan/${scanId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ createCustomer: true })
  });

  const { customerId } = await res.json();
  router.push(`/customers/${customerId}`);
}
```

## Testing

See `/docs/IMAGE_SCANNING_SETUP.md` for test instructions.
