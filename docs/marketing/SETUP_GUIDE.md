# Marketing & Communications System - Setup Guide

## Quick Start (5 Minutes)

### 1. Run Database Migration

```bash
cd /Users/greghogue/Leora2/web
npx prisma migrate deploy
npx prisma generate
```

### 2. Configure Environment Variables

Add to `.env`:

```env
# Email Provider (choose one)
EMAIL_PROVIDER=sendgrid  # or 'resend', 'ses', or leave blank for dev mode
FROM_EMAIL=noreply@yourdomain.com

# SendGrid (if using)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx

# Resend (if using)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# AWS SES (if using)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxx

# Twilio SMS (optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Mailchimp (optional)
# Note: API key format is: key-dc (e.g., abc123-us19)
```

### 3. Restart Development Server

```bash
npm run dev
```

### 4. Access Marketing Features

Navigate to: `http://localhost:3000/sales/marketing/lists`

## Detailed Setup by Feature

## Email Setup

### Option 1: SendGrid (Recommended)

**Why SendGrid?**
- Easy to set up
- Generous free tier (100 emails/day)
- Good deliverability
- Click/open tracking included

**Setup Steps:**

1. Sign up at https://sendgrid.com
2. Create an API key:
   - Go to Settings > API Keys
   - Click "Create API Key"
   - Name it "Leora CRM"
   - Select "Full Access"
   - Copy the key (you'll only see it once!)

3. Add to `.env`:
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_key_here
FROM_EMAIL=noreply@yourdomain.com
```

4. Verify domain (optional but recommended):
   - Go to Settings > Sender Authentication
   - Click "Verify a Single Sender" OR "Authenticate Your Domain"
   - Follow the steps to verify

**Testing:**
```bash
# Send test email
curl -X POST http://localhost:3000/api/sales/marketing/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Hello!</h1><p>This is a test.</p>"
  }'
```

### Option 2: Resend

**Why Resend?**
- Modern, developer-friendly API
- Good free tier (3,000 emails/month)
- Built-in email designer
- React email support

**Setup Steps:**

1. Sign up at https://resend.com
2. Create an API key:
   - Go to API Keys
   - Click "Create API Key"
   - Copy the key

3. Add to `.env`:
```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_key_here
FROM_EMAIL=noreply@yourdomain.com
```

### Option 3: AWS SES

**Why SES?**
- Very cost-effective at scale ($0.10 per 1,000 emails)
- High deliverability
- Part of AWS ecosystem

**Setup Steps:**

1. Create AWS account
2. Verify email or domain in SES console
3. Create IAM user with SES permissions
4. Get access key and secret

5. Add to `.env`:
```env
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret
FROM_EMAIL=verified@yourdomain.com
```

**Note:** SES starts in sandbox mode (limited recipients). Request production access from AWS.

## SMS Setup (Twilio)

**Cost:** ~$0.0075 per SMS (varies by country)

**Setup Steps:**

1. Sign up at https://twilio.com
2. Get a phone number:
   - Go to Phone Numbers > Buy a Number
   - Choose a number with SMS capability
   - Purchase it ($1-2/month)

3. Get credentials:
   - Go to Console Dashboard
   - Copy Account SID
   - Copy Auth Token

4. Add to `.env`:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+12345678900
```

5. Configure webhook for incoming SMS:
   - Go to Phone Numbers > Manage > Active Numbers
   - Click your number
   - Under "Messaging", set "A Message Comes In" to:
     `https://yourdomain.com/api/sales/marketing/webhooks/twilio`
   - Set HTTP method to POST
   - Save

**Testing:**
```bash
# Send test SMS
curl -X POST http://localhost:3000/api/sales/marketing/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+12345678900",
    "body": "Test message from CRM",
    "customerId": "customer-id-here"
  }'
```

## Mailchimp Integration

**Why Mailchimp?**
- Industry-standard email marketing
- Advanced segmentation
- Beautiful email designer
- Detailed analytics

**Setup Steps:**

1. Log into Mailchimp account
2. Get API key:
   - Go to Account > Extras > API Keys
   - Click "Create A Key"
   - Copy the key (format: xxxxx-us19)

3. Connect in CRM:
   - Go to `/sales/marketing/settings`
   - Click "Connect Mailchimp"
   - Paste API key
   - Click "Connect"

4. Select audience to sync:
   - After connecting, select an audience
   - Configure sync direction (one-way or two-way)
   - Click "Start Sync"

**Sync Options:**
- **One-way (CRM → Mailchimp):** Pushes new contacts to Mailchimp
- **Two-way:** Syncs contacts both directions
- **Manual:** Only sync when you click "Sync Now"
- **Automatic:** Sync daily at midnight

## Development Mode (No External Services)

If you don't want to set up external services yet:

1. Leave email/SMS provider env vars blank
2. System will run in dev mode
3. All emails/SMS will log to console instead of sending
4. Perfect for testing the UI and workflows

**What Works in Dev Mode:**
- ✅ Email list management
- ✅ Template creation
- ✅ Smart list logic
- ✅ Activity logging
- ✅ All UI features
- ❌ Actual email sending
- ❌ Actual SMS sending
- ❌ Mailchimp sync

## Webhook Testing (Local Development)

To test webhooks locally:

1. Install ngrok:
```bash
brew install ngrok  # Mac
# or download from https://ngrok.com
```

2. Start ngrok:
```bash
ngrok http 3000
```

3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. Configure in Twilio:
   - Webhook URL: `https://abc123.ngrok.io/api/sales/marketing/webhooks/twilio`

5. Send test SMS to your Twilio number
6. Watch console for incoming webhook

## Initial Data Setup

### 1. Create Email Templates

```sql
-- Run in database or via Prisma Studio
INSERT INTO "EmailTemplate" (
  "tenantId",
  "name",
  "subject",
  "body",
  "category",
  "createdById"
) VALUES
(
  'your-tenant-id',
  'Weekly Specials',
  'This Week\'s Special Offers',
  '<h1>Hi {{customer_name}}!</h1><p>Check out our specials...</p>',
  'promotional',
  'your-user-id'
);
```

Or use the UI:
1. Go to `/sales/marketing/templates`
2. Click "Create Template"
3. Fill in details
4. Save

### 2. Create Smart Lists

Example smart lists to create:

**High-Value Customers**
```typescript
{
  name: "High-Value Customers",
  description: "Customers with $50k+ revenue",
  isSmartList: true,
  smartCriteria: {
    type: "high_value",
    minRevenue: 50000
  }
}
```

**Dormant Customers**
```typescript
{
  name: "Dormant Customers",
  description: "No order in 60+ days",
  isSmartList: true,
  smartCriteria: {
    type: "no_order_in_days",
    days: 60
  }
}
```

## Testing Checklist

### Email Testing
- [ ] Send individual email
- [ ] Send bulk email to list
- [ ] Use email template
- [ ] Check personalization tokens work
- [ ] Verify activity is created
- [ ] Test tracking (opens/clicks)

### SMS Testing
- [ ] Send individual SMS
- [ ] Receive incoming SMS
- [ ] Check conversation threading
- [ ] Verify activity is created
- [ ] Test opt-in/opt-out

### Smart Lists
- [ ] Create smart list
- [ ] Verify auto-population
- [ ] Update criteria
- [ ] Check member count updates
- [ ] Test different criteria types

### Mailchimp
- [ ] Connect account
- [ ] Select audience
- [ ] Sync list to Mailchimp
- [ ] Create campaign
- [ ] Pull analytics

## Troubleshooting

### "Email failed to send"

**Check:**
1. Environment variables are set correctly
2. API key is valid
3. FROM_EMAIL is verified (for SES)
4. Check EmailMessage table for error details
5. Look at provider dashboard for failures

**Common Issues:**
- Invalid API key → Re-create in provider dashboard
- Unverified sender → Complete domain/email verification
- Rate limit → Upgrade plan or reduce sending frequency
- Bounced email → Check recipient address is valid

### "SMS failed to send"

**Check:**
1. Phone number format is correct (+1234567890)
2. Twilio credentials are correct
3. Twilio number is verified
4. Customer has SMS opt-in enabled
5. Check Twilio console for delivery status

**Common Issues:**
- Invalid phone format → Must include country code
- No opt-in → Check CommunicationPreference table
- Blocked number → Customer may have opted out
- Insufficient funds → Add money to Twilio account

### "Mailchimp sync failed"

**Check:**
1. API key format is correct (xxxxx-us19)
2. Audience still exists in Mailchimp
3. Check MailchimpConnection table isActive = true
4. Look for rate limit errors

**Common Issues:**
- Wrong API key → Re-enter in settings
- Deleted audience → Select different audience
- Too many requests → Wait and retry
- Invalid email addresses → Clean list before sync

### "Smart list is empty"

**Check:**
1. Criteria matches expected customers
2. Customer data is populated correctly
3. Test criteria with preview API
4. Check database for matching records

**Debug:**
```typescript
// Test smart list criteria
const preview = await fetch('/api/sales/marketing/lists/preview', {
  method: 'POST',
  body: JSON.stringify({
    criteria: {
      type: 'high_value',
      minRevenue: 10000
    }
  })
});

console.log(await preview.json());
```

## Performance Optimization

### For Large Lists (10,000+ contacts)

**Email Sending:**
1. Use batching (100-500 per batch)
2. Add delays between batches
3. Consider background jobs

**Smart List Refresh:**
1. Schedule during off-hours
2. Use database indexes
3. Limit criteria complexity

**Database Indexes:**
```sql
-- Already included in migration
CREATE INDEX IF NOT EXISTS idx_customer_revenue
  ON "Customer"("establishedRevenue");

CREATE INDEX IF NOT EXISTS idx_customer_last_order
  ON "Customer"("lastOrderDate");
```

## Security Best Practices

### API Keys
1. ✅ Store in environment variables
2. ✅ Never commit to Git
3. ✅ Rotate regularly (quarterly)
4. ✅ Use least-privilege access
5. ✅ Monitor usage for anomalies

### Webhooks
1. ✅ Verify Twilio signatures (TODO)
2. ✅ Use HTTPS only
3. ✅ Rate limit endpoints
4. ✅ Log all webhook requests
5. ✅ IP whitelist (optional)

### Opt-Outs
1. ✅ Honor immediately
2. ✅ Sync to all systems
3. ✅ Keep unsubscribe log
4. ✅ Make opt-out easy
5. ✅ Include in every email

## Production Deployment

### Pre-Deployment Checklist

- [ ] Run migrations on production database
- [ ] Set all environment variables
- [ ] Verify email domain
- [ ] Configure webhook URLs (use production domain)
- [ ] Test email sending
- [ ] Test SMS sending
- [ ] Connect Mailchimp
- [ ] Create initial templates
- [ ] Set up monitoring/alerts
- [ ] Review security settings

### Post-Deployment Verification

1. Send test email to yourself
2. Send test SMS to yourself
3. Create a test smart list
4. Send test campaign to small list
5. Verify activities are created
6. Check Mailchimp sync works
7. Test incoming SMS webhook

## Support

**Documentation:**
- Main guide: `/docs/marketing/MARKETING_SYSTEM_GUIDE.md`
- This setup guide: `/docs/marketing/SETUP_GUIDE.md`
- API docs: `/docs/marketing/API.md` (TODO)

**Logs:**
- Email logs: Check `EmailMessage` table
- SMS logs: Check `SMSMessage` table
- Activities: Check `Activity` table
- System logs: `npm run logs` (if configured)

**Common Commands:**
```bash
# View email messages
npx prisma studio  # Browse EmailMessage table

# View activities
npx prisma studio  # Browse Activity table

# Refresh smart lists manually
# (Use API or create cron job)

# Check migration status
npx prisma migrate status
```

## Next Steps

1. ✅ Complete this setup guide
2. ✅ Test all features
3. 📝 Create first email templates
4. 📝 Build initial smart lists
5. 📝 Send test campaigns
6. 📝 Train team on new features
7. 📝 Monitor usage and feedback

---

**Need Help?**
Contact the development team or check system logs for detailed error messages.

**Last Updated:** 2025-10-26
