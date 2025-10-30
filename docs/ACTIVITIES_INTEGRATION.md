# Activities Full Integration Documentation

## Overview

This document describes the complete activities integration across the Leora2 system, including voice-to-text input, auto-logging from communications, and cross-system integration.

## Features Implemented

### 1. LogActivityModal Component

**Location:** `/web/src/components/shared/LogActivityModal.tsx`

A reusable modal component for logging activities from anywhere in the application.

**Features:**
- Pre-populate fields based on context (customer, order, sample)
- Auto-generate subject line
- Voice-to-text note input using Web Speech API
- Context-aware labeling
- Success toast notifications
- Auto-linking to related records

**Usage:**
```tsx
import LogActivityModal from "@/components/shared/LogActivityModal";

<LogActivityModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onSuccess={() => {
    // Refresh data or show notification
  }}
  customerId="customer-id"
  orderId="order-id" // optional
  sampleId="sample-id" // optional
  activityTypeCode="PHONE_CALL" // optional pre-selection
  initialSubject="Follow-up call" // optional
  contextType="customer" // 'customer' | 'order' | 'sample' | 'carla'
  contextLabel="Acme Wine Shop" // Display name for context
/>
```

### 2. LogActivityButton Component

**Location:** `/web/src/components/shared/LogActivityButton.tsx`

A button component that opens the LogActivityModal.

**Variants:**
- `primary` - Blue button with white text
- `secondary` - White button with border
- `icon` - Icon button with light background

**Sizes:**
- `sm` - Small button
- `md` - Medium button (default)
- `lg` - Large button

**Usage:**
```tsx
import LogActivityButton from "@/components/shared/LogActivityButton";

<LogActivityButton
  customerId={customer.id}
  contextType="customer"
  contextLabel={customer.name}
  variant="primary"
  size="md"
  label="Log Activity"
  onSuccess={() => {
    // Refresh activity list
  }}
/>
```

### 3. Voice-to-Text Integration

**Technology:** Web Speech API

**Browser Support:**
- ✅ Chrome/Edge (full support)
- ✅ Safari (iOS 14.5+)
- ⚠️ Firefox (limited)

**Features:**
- Real-time transcription
- Continuous recording mode
- Interim results display
- Edit before saving
- Visual recording indicator
- Error handling

**How It Works:**
1. Click the microphone button in the notes field
2. Browser requests microphone permission
3. Speak your notes
4. Text appears in real-time
5. Click microphone again to stop
6. Edit text as needed
7. Save activity

**Fallback:**
If Web Speech API is not supported, the microphone button is hidden and users can type normally.

### 4. Quick-Log API Endpoint

**Location:** `/web/src/app/api/sales/activities/quick-log/route.ts`

**Method:** POST

**Purpose:** Fast activity creation with auto-linking to related records

**Request Body:**
```json
{
  "activityTypeCode": "PHONE_CALL",
  "customerId": "customer-uuid",
  "orderId": "order-uuid", // optional
  "sampleId": "sample-uuid", // optional
  "subject": "Follow-up call",
  "notes": "Discussed new product lineup...",
  "occurredAt": "2025-10-26T14:30:00Z",
  "followUpAt": "2025-11-02T10:00:00Z", // optional
  "outcome": "SUCCESS" // PENDING | SUCCESS | FAILED | NO_RESPONSE
}
```

**Features:**
- Validates customer assignment to sales rep
- Auto-links to orders and samples
- Creates activity with all relationships
- Returns full activity record

### 5. Auto-Logging System

#### Email Auto-Logging

**Location:** `/web/src/lib/auto-logging/email-tracker.ts`

**Integration Methods:**

1. **SMTP Webhook** (Recommended)
   - Integrate with your email provider (SendGrid, Mailgun, etc.)
   - Configure webhook to call your endpoint
   - Automatically creates activity when email sent

2. **IMAP Monitoring**
   - Monitor sent emails folder
   - Periodically check for new emails
   - Match recipients to customers

3. **Manual Logging Helper**
   - For emails sent outside the system
   - Quick manual entry

**Setup Example (SendGrid):**
```typescript
// In your SendGrid webhook handler
import { handleEmailWebhook } from '@/lib/auto-logging/email-tracker';

export async function POST(request: Request) {
  const webhookData = await request.json();
  await handleEmailWebhook(webhookData);
  return new Response('OK', { status: 200 });
}
```

**Activity Created:**
- Type: EMAIL_FOLLOW_UP
- Subject: "Email: [Original Subject]"
- Notes: Email body preview + metadata
- Outcome: SUCCESS
- Auto-linked to customer

#### Phone Call Auto-Logging

**Location:** `/web/src/lib/auto-logging/call-tracker.ts`

**Integration Methods:**

1. **Twilio Integration**
   - Configure Twilio webhook
   - Captures call duration, recording URL, transcription
   - Auto-creates activity

2. **VoIP System**
   - Generic webhook handler
   - Supports most VoIP systems

3. **Manual Call Logging**
   - For calls outside integrated systems

**Setup Example (Twilio):**
```typescript
// In your Twilio webhook handler
import { handleTwilioCallWebhook } from '@/lib/auto-logging/call-tracker';

export async function POST(request: Request) {
  const webhookData = await request.json();
  await handleTwilioCallWebhook(webhookData);
  return new Response('OK', { status: 200 });
}
```

**Activity Created:**
- Type: PHONE_CALL
- Subject: "Phone Call - Incoming/Outgoing"
- Notes: Duration, phone number, transcription (if available)
- Outcome: SUCCESS (if call > 30 seconds) or NO_RESPONSE
- Includes recording URL if available

#### SMS/Text Auto-Logging

**Location:** `/web/src/lib/auto-logging/sms-tracker.ts`

**Integration Methods:**

1. **Twilio SMS**
   - Configure SMS webhook
   - Captures messages and media
   - Auto-creates activity

2. **SMS Gateway**
   - Generic SMS gateway integration
   - Supports most SMS providers

3. **Thread-Based Logging**
   - Groups conversation threads
   - Creates single activity for multi-message conversations

**Setup Example (Twilio SMS):**
```typescript
// In your Twilio SMS webhook handler
import { handleTwilioSMSWebhook } from '@/lib/auto-logging/sms-tracker';

export async function POST(request: Request) {
  const webhookData = await request.json();
  await handleTwilioSMSWebhook(webhookData);
  return new Response('OK', { status: 200 });
}
```

**Activity Created:**
- Type: TEXT_MESSAGE
- Subject: "Text Message - Received/Sent"
- Notes: Message body + media URLs
- Outcome: SUCCESS
- Captures images/attachments

### 6. Customer Lookup API Endpoints

**By Email:** `/web/src/app/api/sales/customers/by-email/route.ts`
**By Phone:** `/web/src/app/api/sales/customers/by-phone/route.ts`

**Purpose:** Enable auto-logging to find customers by contact information

**Usage:**
```typescript
// Find customer by email
const response = await fetch(
  `/api/sales/customers/by-email?email=${encodeURIComponent(email)}`
);
const { customer } = await response.json();

// Find customer by phone
const response = await fetch(
  `/api/sales/customers/by-phone?phone=${encodeURIComponent(phone)}`
);
const { customer } = await response.json();
```

## Integration Points

### Customer Detail Pages

**Location:** `/web/src/app/sales/customers/[customerId]/`

**Integration:**
1. **QuickActions Section** - Icon button for quick activity logging
2. **ActivityTimeline Section** - Primary button to log new activity
3. Pre-populated customer ID
4. Context-aware subject generation

### Order Detail Pages

**Location:** `/web/src/app/portal/orders/[orderId]/`

**Integration:**
1. Add LogActivityButton to order header
2. Pre-populate customer and order ID
3. Auto-generate subject: "Order Follow-up - Order #123"
4. Link activity to both customer and order

### Sample Screens

**Location:** `/web/src/app/sales/samples/`

**Integration:**
1. Add LogActivityButton to sample list items
2. Add to sample detail view
3. Pre-populate customer and sample ID
4. Auto-generate subject: "Sample Follow-up - [Product Name]"
5. Track tasting results in notes

### CARLA Weekly View

**Location:** `/web/src/app/sales/calendar/` or `/web/src/app/sales/call-plan/`

**Integration:**
1. Quick-log button in weekly calendar view
2. Pre-populate from calendar selection
3. Context: "Quick log from CARLA"
4. One-click logging after customer visits

## Activity Types Supported

The system supports these activity types (from database):

- **PHONE_CALL** - Phone conversations
- **EMAIL_FOLLOW_UP** - Email communications
- **TEXT_MESSAGE** - SMS/text messages
- **IN_PERSON_VISIT** - Face-to-face meetings
- **TASTING_APPOINTMENT** - Wine tasting sessions
- **PUBLIC_TASTING_EVENT** - Public tasting events
- **CUSTOMER_MEETING** - Scheduled meetings

## Activity Outcomes

- **PENDING** - No outcome yet
- **SUCCESS** - Positive result (order, follow-up scheduled, etc.)
- **FAILED** - Negative result (customer unavailable, declined, etc.)
- **NO_RESPONSE** - Customer didn't respond

## Database Schema

The activities integration uses these database relationships:

```prisma
model Activity {
  id             String          @id @default(cuid())
  tenantId       String
  activityTypeId String
  userId         String
  customerId     String
  orderId        String?         // Optional link to order
  sampleId       String?         // Optional link to sample
  subject        String
  notes          String?
  occurredAt     DateTime
  followUpAt     DateTime?
  outcome        ActivityOutcome?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  activityType   ActivityType    @relation(...)
  customer       Customer        @relation(...)
  order          Order?          @relation(...)
  sample         Sample?         @relation(...)
  user           User            @relation(...)
  tenant         Tenant          @relation(...)
}
```

## Configuration

### Enable/Disable Auto-Logging

Add to environment variables:

```env
# Auto-logging feature flags
ENABLE_EMAIL_AUTO_LOG=true
ENABLE_CALL_AUTO_LOG=true
ENABLE_SMS_AUTO_LOG=true

# Integration credentials (if needed)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
SENDGRID_API_KEY=your_api_key
```

### Activity Type Mapping

Create a configuration file for custom activity type mappings:

**Location:** `/web/src/config/activity-types.ts`

```typescript
export const ACTIVITY_TYPE_MAPPINGS = {
  email: 'EMAIL_FOLLOW_UP',
  call: 'PHONE_CALL',
  sms: 'TEXT_MESSAGE',
  visit: 'IN_PERSON_VISIT',
  tasting: 'TASTING_APPOINTMENT',
  meeting: 'CUSTOMER_MEETING',
};

export const DEFAULT_OUTCOMES = {
  email: 'SUCCESS',
  call_completed: 'SUCCESS',
  call_missed: 'NO_RESPONSE',
  sms: 'SUCCESS',
};
```

## Best Practices

### 1. Subject Line Guidelines
- Keep it concise (< 100 characters)
- Include activity type
- Include customer name
- Add context (order number, product name, etc.)

**Examples:**
- ✅ "Phone Call - Acme Wine Shop - Order Follow-up"
- ✅ "In-Person Visit - Joe's Bistro - New Product Demo"
- ✅ "Email: Q4 Wine Selection - Downtown Bar"
- ❌ "Call" (too vague)
- ❌ "Talked to customer about wines and pricing and upcoming events" (too long)

### 2. Notes Guidelines
- Capture key discussion points
- Note any commitments or next steps
- Include relevant product/pricing info
- Use voice-to-text for quick entry
- Edit for clarity before saving

### 3. Follow-up Dates
- Always set follow-up date if customer requests callback
- Use follow-up dates to create tasks/reminders
- Review follow-ups weekly

### 4. Activity Outcomes
- Set outcome immediately after activity
- Use SUCCESS for positive interactions
- Use PENDING for ongoing situations
- Use FAILED sparingly (better to use NO_RESPONSE)

## Testing

### Manual Testing Checklist

- [ ] Log activity from customer detail page
- [ ] Log activity from Quick Actions
- [ ] Log activity from Activity Timeline
- [ ] Voice-to-text input works on Chrome
- [ ] Voice-to-text input works on Safari (mobile)
- [ ] Activity links to customer correctly
- [ ] Activity links to order when provided
- [ ] Activity links to sample when provided
- [ ] Success toast appears
- [ ] Activity appears in timeline immediately
- [ ] Follow-up date saves correctly
- [ ] Outcome saves correctly

### Auto-Logging Testing

**Email:**
- [ ] Send test email to customer
- [ ] Verify activity created automatically
- [ ] Check email subject in activity
- [ ] Verify body preview in notes
- [ ] Confirm customer linkage

**Phone Call:**
- [ ] Make test call via Twilio
- [ ] Verify activity created after call ends
- [ ] Check call duration captured
- [ ] Verify phone number stored
- [ ] Confirm recording URL (if available)

**SMS:**
- [ ] Send test SMS via Twilio
- [ ] Verify activity created
- [ ] Check message body captured
- [ ] Verify media URLs (if sent)
- [ ] Confirm customer linkage

## Troubleshooting

### Voice Input Not Working

**Issue:** Microphone button doesn't appear

**Solution:**
- Check browser compatibility (Chrome/Edge/Safari)
- Ensure HTTPS (required for Web Speech API)
- Check browser permissions for microphone
- Try in incognito mode

**Issue:** "Recording..." but no text appears

**Solution:**
- Check microphone is unmuted
- Speak clearly and loudly
- Wait 1-2 seconds after speaking
- Check browser console for errors

### Auto-Logging Not Working

**Issue:** Activities not created from emails

**Solution:**
- Verify webhook configured correctly
- Check webhook endpoint is reachable
- Verify customer exists with matching email
- Check server logs for errors
- Ensure API endpoint is not rate-limited

**Issue:** Activities created with wrong customer

**Solution:**
- Verify email/phone lookup logic
- Check customer email/phone data in database
- Add logging to lookup endpoints
- Consider fuzzy matching for phone numbers

### Activity Not Linking to Order/Sample

**Issue:** Activity created but not linked

**Solution:**
- Verify orderId/sampleId passed to API
- Check order/sample belongs to customer
- Verify foreign key constraints
- Check API response for errors

## Performance Considerations

### Auto-Logging at Scale

For high-volume auto-logging:

1. **Use Background Jobs**
   - Don't block webhook response
   - Queue activity creation
   - Process asynchronously

2. **Batch Processing**
   - Group activities by customer
   - Create in batches
   - Reduce database round-trips

3. **Caching**
   - Cache customer lookups
   - Cache activity types
   - Use Redis for hot data

4. **Rate Limiting**
   - Limit auto-logging API calls
   - Prevent duplicate activities
   - Add deduplication logic

## Future Enhancements

### Planned Features

1. **AI-Powered Activity Summaries**
   - Automatically generate activity summaries from notes
   - Extract action items
   - Categorize activities

2. **Activity Templates**
   - Pre-filled templates for common activities
   - Save custom templates
   - Share templates across team

3. **Bulk Activity Import**
   - Import activities from CSV
   - Import from other CRMs
   - Batch creation UI

4. **Advanced Auto-Logging**
   - Calendar integration (Google, Outlook)
   - Social media mentions
   - Website visit tracking
   - Email open/click tracking

5. **Activity Analytics**
   - Activity trends over time
   - Conversion by activity type
   - Rep performance comparison
   - Customer engagement scoring

6. **Mobile App Integration**
   - Native voice input
   - Offline activity logging
   - Push notification reminders
   - GPS-based auto-logging

## Support

For issues or questions about the activities integration:

1. Check this documentation
2. Review the code examples
3. Test in development environment
4. Check server logs for errors
5. Contact the development team

## Version History

- **v1.0.0** (2025-10-26) - Initial activities integration
  - LogActivityModal component
  - Voice-to-text input
  - Auto-logging system
  - Customer/order/sample integration
  - Quick-log API endpoint
