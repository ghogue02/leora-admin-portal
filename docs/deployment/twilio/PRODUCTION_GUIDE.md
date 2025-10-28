# Twilio SMS Production Deployment Guide

## Overview
Complete guide for deploying Twilio SMS integration to production.

---

## Pre-Deployment Checklist

### Account Setup
- [ ] Twilio production account created (not trial)
- [ ] Credit card added for billing
- [ ] Phone number purchased
- [ ] Messaging service created (recommended)
- [ ] Billing alerts configured
- [ ] Account verified and upgraded

### Configuration
- [ ] All environment variables set in production
- [ ] Webhook URLs use HTTPS
- [ ] Webhook signature validation enabled
- [ ] Status callbacks configured
- [ ] Rate limiting tested
- [ ] Error handling verified

### Compliance
- [ ] SMS opt-in process implemented
- [ ] Opt-out handling tested (STOP, UNSUBSCRIBE)
- [ ] Privacy policy updated
- [ ] TCPA compliance reviewed
- [ ] Consent records maintained
- [ ] Business hours restrictions configured

### Testing
- [ ] All test scenarios passed
- [ ] Templates tested with real data
- [ ] Webhook delivery confirmed
- [ ] Activity logging verified
- [ ] Error scenarios handled
- [ ] Load testing completed

---

## Part 1: Production Account Setup

### Step 1: Upgrade from Trial

1. **Add Payment Method**
   - Go to: https://console.twilio.com/billing/manage-billing/billing-overview
   - Click "Add Payment Method"
   - Enter credit card details
   - Verify billing address

2. **Upgrade Account**
   - Go to: https://console.twilio.com/
   - Click "Upgrade" in top right
   - Select plan (Pay As You Go recommended)
   - Confirm upgrade

3. **Enable Auto-Recharge (Recommended)**
   - Set threshold: $20
   - Auto-recharge amount: $50
   - Prevents service interruption

### Step 2: Configure Messaging Service

**Why Use Messaging Service?**
- Better deliverability
- Automatic failover
- Easier scaling
- Advanced features

**Setup:**
1. Go to: https://console.twilio.com/messaging/services
2. Click "Create Messaging Service"
3. Configure:
   - **Name:** Leora CRM Production
   - **Use case:** Notifications
   - **Sender pool:** Add your phone number
   - **Opt-out management:** Enabled
   - **Sticky sender:** Enabled
4. Copy Messaging Service SID

### Step 3: Configure Webhooks

1. **Incoming Messages**
   - URL: `https://yourdomain.com/api/sms/webhooks/incoming`
   - Method: POST
   - Save configuration

2. **Status Callbacks**
   - URL: `https://yourdomain.com/api/sms/webhooks/status`
   - Events: All
   - Save configuration

3. **Test Webhooks**
   ```bash
   # Send test message
   curl https://yourdomain.com/api/sms/webhooks/incoming \
     -X POST \
     -d "MessageSid=TEST123&From=%2B1234567890&Body=Test"
   ```

---

## Part 2: Environment Configuration

### Production Environment Variables

```env
# Twilio Production Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_production_auth_token
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WEBHOOK_BASE_URL=https://leora.yourdomain.com

# Optional: Rate Limiting
TWILIO_RATE_LIMIT_PER_SECOND=10
TWILIO_MAX_CONCURRENT_REQUESTS=50

# Optional: Retry Configuration
TWILIO_RETRY_ATTEMPTS=3
TWILIO_RETRY_DELAY_MS=1000
```

### Secure Configuration Management

**Vercel:**
```bash
# Add environment variables via CLI
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN
vercel env add TWILIO_PHONE_NUMBER
vercel env add TWILIO_MESSAGING_SERVICE_SID
vercel env add TWILIO_WEBHOOK_BASE_URL

# Or via Vercel Dashboard:
# Project Settings → Environment Variables
```

**Railway:**
```bash
# Add via Railway Dashboard
# Project → Variables → Add Variable
```

**Heroku:**
```bash
heroku config:set TWILIO_ACCOUNT_SID=ACxxxxxxxx
heroku config:set TWILIO_AUTH_TOKEN=your_token
heroku config:set TWILIO_PHONE_NUMBER=+15551234567
```

### Security Best Practices

1. **Never commit credentials to git**
   ```bash
   # Verify .env.local is in .gitignore
   grep -q "\.env\.local" .gitignore || echo ".env.local" >> .gitignore
   ```

2. **Rotate auth tokens regularly**
   - Every 90 days minimum
   - Immediately if compromised
   - Update in all environments

3. **Use webhook signature validation**
   - Already implemented in code
   - Never disable in production
   - Log validation failures

---

## Part 3: Database Setup

### Required Database Schema

```sql
-- Ensure SMS activity type exists
INSERT INTO activity_types (
  code,
  name,
  description,
  category,
  is_active
) VALUES (
  'sms',
  'SMS Message',
  'Text message sent or received via Twilio',
  'communication',
  true
) ON CONFLICT (code) DO NOTHING;

-- Add SMS opt-in fields to customers (if not exists)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_opt_in_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sms_opt_out_date TIMESTAMPTZ;

-- Create index for phone number lookup
CREATE INDEX IF NOT EXISTS idx_customers_phone
ON customers(phone) WHERE phone IS NOT NULL;

-- Create index for SMS activities
CREATE INDEX IF NOT EXISTS idx_activities_sms
ON activities(activity_type_id, customer_id)
WHERE activity_type_id = (
  SELECT id FROM activity_types WHERE code = 'sms'
);
```

### Run Migrations

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Verify schema
npm run prisma:studio
```

---

## Part 4: Monitoring & Alerts

### Twilio Dashboard Monitoring

**Key Metrics to Watch:**
1. **Message Volume**
   - Daily/weekly trends
   - Unusual spikes
   - Compare to budget

2. **Delivery Rates**
   - Should be > 95%
   - Track failed deliveries
   - Monitor error codes

3. **Opt-Out Rate**
   - Target < 2%
   - Monitor trends
   - Adjust messaging if high

4. **Response Time**
   - Webhook latency
   - API response time
   - Track SLA compliance

### Set Up Alerts

**Twilio Alerts:**
```javascript
// Configure via Twilio Console
// Monitor → Alerts → Create Alert

1. High usage alert: $100/day
2. Failed messages: > 5% rate
3. Webhook failures: > 10 in 1 hour
4. Rate limit reached
```

**Application Monitoring:**
```typescript
// src/lib/services/twilio/monitoring.ts

export async function logSMSMetrics(result: SendSMSResult) {
  // Log to your monitoring service (Sentry, DataDog, etc.)
  if (!result.success) {
    console.error('SMS Send Failed:', {
      error: result.error,
      timestamp: new Date(),
    });

    // Alert on repeated failures
    await alertIfRepeatedFailures();
  }

  // Track success metrics
  await trackMetric('sms.sent', 1);
  await trackMetric('sms.cost', 0.0075); // Update with actual cost
}
```

### Health Checks

```typescript
// src/app/api/health/sms/route.ts

export async function GET() {
  const status = getTwilioStatus();

  return Response.json({
    sms: {
      configured: status.configured,
      components: {
        accountSid: status.hasAccountSid ? 'ok' : 'missing',
        authToken: status.hasAuthToken ? 'ok' : 'missing',
        phoneNumber: status.hasPhoneNumber ? 'ok' : 'missing',
      },
      lastSent: await getLastSentTimestamp(),
      last24Hours: await getSMSCount24Hours(),
    },
  });
}
```

---

## Part 5: Rate Limiting & Scalability

### Twilio Rate Limits

**Default Limits:**
- **Trial:** 1 message/second
- **Paid:** 100 messages/second (enterprise)
- **Concurrent connections:** Unlimited
- **Burst:** 200 messages

### Implement Rate Limiting

```typescript
// src/lib/services/twilio/rate-limiter.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 s'),
});

export async function sendSMSWithRateLimit(params: SendSMSParams) {
  const { success } = await ratelimit.limit('sms-send');

  if (!success) {
    return {
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
    };
  }

  return sendSMS(params);
}
```

### Bulk Sending

```typescript
// For campaigns, batch and throttle
export async function sendBulkSMS(
  recipients: Array<{ customerId: string; phone: string }>,
  template: string,
  variables: Record<string, string>
) {
  const BATCH_SIZE = 10;
  const DELAY_MS = 1000;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(recipient =>
        sendSMS({
          to: recipient.phone,
          body: renderTemplate(template, {
            ...variables,
            firstName: recipient.firstName,
          }).message,
        })
      )
    );

    // Delay between batches
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
}
```

---

## Part 6: Cost Optimization

### Current Pricing (as of 2025)

**Twilio SMS (USA):**
- Outbound: $0.0075/message
- Inbound: $0.0075/message
- Phone number: $1.15/month

**Monthly Cost Estimates:**
- 1,000 messages: ~$15
- 5,000 messages: ~$75
- 10,000 messages: ~$150
- 50,000 messages: ~$750

### Optimization Strategies

**1. Use Messaging Service**
- Better routing
- Automatic failover
- Slightly cheaper at scale

**2. Optimize Message Length**
```typescript
// Keep under 160 characters to avoid multi-part
function optimizeMessage(text: string): string {
  if (text.length <= 160) return text;

  // Abbreviate common words
  return text
    .replace(/tomorrow/gi, 'tmrw')
    .replace(/Thursday/gi, 'Thurs')
    .slice(0, 160);
}
```

**3. Avoid Unnecessary Messages**
```typescript
// Don't send duplicates
const recentActivity = await checkRecentSMS(customerId, '24h');
if (recentActivity.count > 3) {
  console.log('Skipping: customer already contacted recently');
  return;
}
```

**4. Use Smart Scheduling**
```typescript
// Batch messages during off-peak (nights/weekends may be cheaper)
const isBusinessHours = hour >= 8 && hour <= 20;
if (!isBusinessHours && !urgent) {
  await queueForLater(message, '8:00 AM next business day');
}
```

---

## Part 7: Compliance & Legal

### SMS Compliance Requirements (USA)

**1. Obtain Consent**
```typescript
// Track explicit consent
await updateCustomer(customerId, {
  sms_opt_in: true,
  sms_opt_in_date: new Date(),
  sms_consent_method: 'web_form', // or 'verbal', 'written'
  sms_consent_ip: request.ip,
});
```

**2. Honor Opt-Outs**
- Automatically handled in webhook
- Process within 24 hours
- Never re-enable without new consent

**3. Identify Your Business**
```
✅ Good: "Hi John! Well Crafted Wine here..."
❌ Bad: "Hi John! Great deals on wine..."
```

**4. Provide Opt-Out Instructions**
```
"Reply STOP to opt out"
"Text STOP to unsubscribe"
```

**5. Respect Quiet Hours**
```typescript
// Don't send 9pm-8am local time
const localHour = getLocalHour(customer.timezone);
if (localHour < 8 || localHour >= 21) {
  return { success: false, error: 'Outside business hours' };
}
```

### Privacy Policy Updates

Add to your privacy policy:
```
SMS Communications:
- We may send order updates and promotional messages via SMS
- Standard message and data rates apply
- You can opt out anytime by texting STOP
- We store your phone number and message history
- We share data with Twilio for message delivery
- Messages are stored for [retention period]
```

---

## Part 8: Disaster Recovery

### Backup Plans

**1. Service Outage**
```typescript
// Fallback to email if SMS fails
async function sendCriticalMessage(customer, message) {
  const smsResult = await sendSMS({ to: customer.phone, body: message });

  if (!smsResult.success) {
    // Fallback to email
    await sendEmail({
      to: customer.email,
      subject: 'Important Update',
      body: message,
    });

    console.log('SMS failed, sent via email instead');
  }
}
```

**2. Credential Rotation**
```bash
# Rotate auth token immediately if compromised
# 1. Generate new token in Twilio console
# 2. Update environment variable
# 3. Deploy new version
# 4. Delete old token

vercel env rm TWILIO_AUTH_TOKEN production
vercel env add TWILIO_AUTH_TOKEN production
vercel --prod
```

**3. Data Backup**
```sql
-- Backup SMS activities
COPY (
  SELECT * FROM activities
  WHERE activity_type_id = (SELECT id FROM activity_types WHERE code = 'sms')
  AND activity_date >= NOW() - INTERVAL '90 days'
) TO '/backup/sms_activities.csv' WITH CSV HEADER;
```

---

## Part 9: Performance Benchmarks

### Target Metrics

**Response Times:**
- Send SMS API: < 2 seconds
- Webhook processing: < 500ms
- Template rendering: < 50ms
- Activity logging: < 1 second

**Reliability:**
- Delivery rate: > 95%
- Webhook success: > 99%
- API availability: > 99.9%
- Zero data loss

**Scale Targets:**
- 1,000 SMS/day: No changes needed
- 10,000 SMS/day: Add rate limiting
- 100,000 SMS/day: Consider dedicated short code
- 1M+ SMS/day: Contact Twilio for enterprise

### Load Testing

```bash
# Test sending 100 concurrent messages
npm run test:load:sms
```

```typescript
// tests/load/sms-load-test.ts
import { test } from '@playwright/test';

test('SMS load test - 100 concurrent', async () => {
  const promises = Array.from({ length: 100 }, (_, i) =>
    fetch('/api/sms/send', {
      method: 'POST',
      body: JSON.stringify({
        customerId: `customer-${i}`,
        templateId: 'weekly_specials',
        templateVariables: { firstName: 'Test', special: 'Test', deadline: 'Test' },
      }),
    })
  );

  const results = await Promise.all(promises);
  const successful = results.filter(r => r.ok).length;

  console.log(`Success rate: ${(successful / 100) * 100}%`);
});
```

---

## Deployment Steps

### Final Checklist

```bash
# 1. Install dependencies
npm install

# 2. Build application
npm run build

# 3. Run database migrations
npm run prisma:migrate

# 4. Verify environment variables
npm run verify:env

# 5. Test SMS functionality
npm run test:sms

# 6. Deploy to production
vercel --prod

# 7. Configure Twilio webhooks
# Update webhook URLs in Twilio console

# 8. Send test message
curl https://yourdomain.com/api/sms/send \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"customerId":"test-customer","message":"Production test"}'

# 9. Monitor for 24 hours
# Check Twilio dashboard and application logs

# 10. Enable for all users
# Remove any feature flags
```

---

## Support & Troubleshooting

### Common Production Issues

**Issue: High failure rate**
- Check Twilio console for error codes
- Verify phone numbers are in E.164 format
- Check for carrier blocks
- Review message content for spam triggers

**Issue: Slow webhook responses**
- Add database indexes
- Optimize activity logging
- Use background jobs for non-critical tasks
- Cache customer lookups

**Issue: Unexpected costs**
- Review daily usage reports
- Check for retry loops
- Verify rate limiting is working
- Look for spam/abuse

### Getting Help

- **Twilio Support:** https://support.twilio.com/
- **Twilio Status:** https://status.twilio.com/
- **Documentation:** https://www.twilio.com/docs/sms
- **Community:** https://community.twilio.com/

---

**Last Updated:** October 27, 2025
**Author:** System Architecture Designer
**Status:** Production Ready
