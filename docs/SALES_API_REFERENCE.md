# Sales Funnel API Reference

## Authentication

All endpoints require authentication via session cookie. Include valid session token in requests.

## Base URL

```
/api/sales
```

---

## Leads Endpoints

### List Leads

```http
GET /api/sales/leads
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `stage` | string | Filter by funnel stage |
| `assignedRepId` | string | Filter by assigned rep |
| `leadSource` | string | Filter by lead source |
| `interestLevel` | string | Filter by interest level |
| `search` | string | Search company, contact, or email |

**Response:**

```json
[
  {
    "id": "uuid",
    "tenantId": "uuid",
    "companyName": "Acme Corp",
    "contactName": "John Doe",
    "email": "john@acme.com",
    "phone": "+1-555-0100",
    "leadSource": "website",
    "interestLevel": "hot",
    "estimatedValue": 50000,
    "productsInterested": ["Product A", "Service X"],
    "assignedRepId": "rep-uuid",
    "currentStage": "proposal",
    "notes": "Interested in enterprise plan",
    "convertedToCustomerId": null,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-20T14:45:00Z"
  }
]
```

### Create Lead

```http
POST /api/sales/leads
```

**Request Body:**

```json
{
  "companyName": "Acme Corp",
  "contactName": "John Doe",
  "email": "john@acme.com",
  "phone": "+1-555-0100",
  "leadSource": "website",
  "interestLevel": "hot",
  "estimatedValue": 50000,
  "productsInterested": ["Product A"],
  "assignedRepId": "rep-uuid",
  "notes": "Interested in enterprise plan"
}
```

**Response:** `201 Created`

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "companyName": "Acme Corp",
  "contactName": "John Doe",
  "email": "john@acme.com",
  "phone": "+1-555-0100",
  "leadSource": "website",
  "interestLevel": "hot",
  "estimatedValue": 50000,
  "productsInterested": ["Product A"],
  "assignedRepId": "rep-uuid",
  "currentStage": "lead",
  "notes": "Interested in enterprise plan",
  "convertedToCustomerId": null,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### Get Lead

```http
GET /api/sales/leads/:id
```

**Response:**

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "companyName": "Acme Corp",
  ...
}
```

### Update Lead

```http
PATCH /api/sales/leads/:id
```

**Request Body:**

```json
{
  "companyName": "Acme Corporation",
  "estimatedValue": 75000,
  "notes": "Updated estimate after meeting"
}
```

**Response:**

```json
{
  "id": "uuid",
  "companyName": "Acme Corporation",
  "estimatedValue": 75000,
  ...
}
```

### Delete Lead

```http
DELETE /api/sales/leads/:id
```

**Response:** `200 OK`

```json
{
  "message": "Lead deleted successfully"
}
```

### Update Lead Stage

```http
PATCH /api/sales/leads/:id/stage
```

**Request Body:**

```json
{
  "stage": "proposal",
  "notes": "Sent enterprise proposal",
  "winLossReason": null
}
```

**Response:**

```json
{
  "id": "uuid",
  "currentStage": "proposal",
  ...
}
```

### Get Lead History

```http
GET /api/sales/leads/:id/history
```

**Response:**

```json
[
  {
    "id": "uuid",
    "leadId": "lead-uuid",
    "stage": "lead",
    "enteredAt": "2025-01-15T10:30:00Z",
    "exitedAt": "2025-01-16T09:00:00Z",
    "movedBy": "user-uuid",
    "notes": "Lead created",
    "winLossReason": null
  },
  {
    "id": "uuid",
    "leadId": "lead-uuid",
    "stage": "qualified",
    "enteredAt": "2025-01-16T09:00:00Z",
    "exitedAt": null,
    "movedBy": "user-uuid",
    "notes": "Met qualification criteria",
    "winLossReason": null
  }
]
```

---

## Funnel Endpoints

### Get Pipeline Metrics

```http
GET /api/sales/funnel/metrics
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `assignedRepId` | string | Filter by assigned rep |
| `startDate` | string | ISO date for start of range |
| `endDate` | string | ISO date for end of range |

**Response:**

```json
{
  "totalLeads": 150,
  "totalValue": 2500000,
  "weightedValue": 875000,
  "conversionRates": {
    "leadToQualified": 65.5,
    "qualifiedToProposal": 45.2,
    "proposalToClosedWon": 35.8,
    "overallWinRate": 28.5
  },
  "averageTimeInStage": {
    "lead": 3.5,
    "qualified": 7.2,
    "proposal": 12.8,
    "negotiation": 8.5,
    "closed_won": 0,
    "closed_lost": 0
  },
  "averageDaysToClose": 32.5
}
```

---

## Supporting Endpoints

### List Sales Reps

```http
GET /api/sales/reps
```

**Response:**

```json
[
  {
    "id": "uuid",
    "name": "Jane Smith",
    "email": "jane@company.com",
    "territory": "Northeast"
  }
]
```

### List Products

```http
GET /api/sales/products
```

**Response:**

```json
[
  {
    "id": "uuid",
    "name": "Product A",
    "description": "Enterprise solution",
    "price": 10000,
    "category": "Software"
  }
]
```

---

## Enums

### LeadSource

```typescript
enum LeadSource {
  REFERRAL = 'referral',
  COLD_CALL = 'cold_call',
  EVENT = 'event',
  WEBSITE = 'website',
  SOCIAL_MEDIA = 'social_media',
  PARTNER = 'partner',
  OTHER = 'other'
}
```

### InterestLevel

```typescript
enum InterestLevel {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold'
}
```

### FunnelStage

```typescript
enum FunnelStage {
  LEAD = 'lead',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost'
}
```

---

## Error Responses

### 401 Unauthorized

```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found

```json
{
  "error": "Lead not found"
}
```

### 400 Bad Request

```json
{
  "error": "Invalid stage"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to fetch leads"
}
```

---

## Rate Limiting

Not currently implemented. May be added in future versions.

---

## Pagination

Not currently implemented. Consider adding for large datasets:

```http
GET /api/sales/leads?page=1&limit=50
```

Future response format:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

---

## Webhooks

Not currently implemented. Future feature for event notifications:

- `lead.created`
- `lead.updated`
- `lead.stage_changed`
- `lead.converted`
- `lead.deleted`

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Create lead
const response = await fetch('/api/sales/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    companyName: 'Acme Corp',
    contactName: 'John Doe',
    email: 'john@acme.com',
    leadSource: 'website',
    interestLevel: 'hot',
    estimatedValue: 50000
  })
});

const lead = await response.json();

// Update stage
await fetch(`/api/sales/leads/${lead.id}/stage`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    stage: 'qualified',
    notes: 'Met qualification criteria'
  })
});

// Get metrics
const metricsResponse = await fetch('/api/sales/funnel/metrics');
const metrics = await metricsResponse.json();
```

---

## Version History

- **v1.0.0** - Initial release with full CRUD and metrics
