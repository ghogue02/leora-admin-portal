# Marketing & Communications System - Complete Guide

## Overview

The Marketing & Communications System provides comprehensive email and SMS marketing capabilities integrated directly into the CRM. Built for wine distributors to engage customers through targeted campaigns, automated messaging, and personalized outreach.

## Features Implemented

### 1. Email List Management

**Location:** `/sales/marketing/lists`

**Capabilities:**
- Create and manage email lists
- Smart lists with auto-population based on criteria:
  - All customers in territory
  - High-value customers (minimum revenue threshold)
  - Customers who ordered specific products
  - Customers who haven't ordered in X days
  - By account type or priority
- Manual list management (add/remove individual contacts)
- Import/export capabilities
- List deduplication

**API Endpoints:**
- `GET /api/sales/marketing/lists` - List all email lists
- `POST /api/sales/marketing/lists` - Create new list
- `GET /api/sales/marketing/lists/[listId]` - Get list details
- `PATCH /api/sales/marketing/lists/[listId]` - Update list
- `DELETE /api/sales/marketing/lists/[listId]` - Delete list
- `POST /api/sales/marketing/lists/[listId]/members` - Add members
- `DELETE /api/sales/marketing/lists/[listId]/members` - Remove members

### 2. Email Sending

**Capabilities:**
- Send individual emails from customer pages
- Send bulk emails to entire lists
- Email templates with personalization tokens
- Track opens and clicks
- Auto-log as activities

**Personalization Tokens:**
```
{{customer_name}} - Customer name
{{last_order_date}} - Last order date
{{territory}} - Territory name
{{rep_name}} - Sales rep name
{{custom_field}} - Any custom field
```

**API Endpoints:**
- `POST /api/sales/marketing/email/send` - Send email(s)

### 3. Email Templates

**Default Templates Included:**
1. Weekly Specials
2. New Product Announcement
3. Customer Check-in
4. Tasting Invitation
5. Thank You for Your Order

**API Endpoints:**
- `GET /api/sales/marketing/templates?type=email` - List templates
- `POST /api/sales/marketing/templates` - Create template

### 4. Mailchimp Integration

**Capabilities:**
- OAuth connection to Mailchimp account
- Sync customer lists to Mailchimp audiences
- One-click campaign creation
- Pull campaign analytics (opens, clicks, conversions)
- Auto-tag customers who engage
- Import Mailchimp audiences to CRM
- Two-way sync

**Setup:**
1. Get Mailchimp API key from Mailchimp account
2. Connect via Settings > Marketing > Mailchimp
3. Select audience to sync
4. Configure sync frequency

**API Endpoints:**
- `POST /api/sales/marketing/mailchimp/connect` - Connect account
- `GET /api/sales/marketing/mailchimp/connect` - Get connection status
- `DELETE /api/sales/marketing/mailchimp/connect` - Disconnect
- `GET /api/sales/marketing/mailchimp/sync` - Get audiences
- `POST /api/sales/marketing/mailchimp/sync` - Sync list

### 5. SMS Messaging (Twilio)

**Capabilities:**
- Send individual SMS from customer pages
- SMS templates
- Conversation threads (back-and-forth)
- Opt-in/opt-out management
- Delivery receipts
- Auto-log as activities

**Setup:**
1. Create Twilio account
2. Get Account SID and Auth Token
3. Configure in environment variables:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**API Endpoints:**
- `POST /api/sales/marketing/sms/send` - Send SMS
- `GET /api/sales/marketing/templates?type=sms` - List SMS templates

### 6. Webhook Handlers

**Twilio SMS Webhook:**
- Endpoint: `/api/sales/marketing/webhooks/twilio`
- Handles incoming SMS messages
- Auto-creates activities
- Links to customer records

**Setup:**
1. In Twilio console, configure webhook URL:
   `https://your-domain.com/api/sales/marketing/webhooks/twilio`
2. Set HTTP method to POST
3. System will automatically process incoming messages

### 7. Communication Auto-Logging

**What Gets Logged:**
- All sent emails → Activity type: "Email"
- All sent SMS → Activity type: "SMS"
- Incoming SMS → Activity type: "SMS"
- Email opens → Updates activity notes
- Email clicks → Updates activity notes
- Campaign sends → Activity type: "Email Campaign"

**Activity Details Captured:**
- Subject/topic
- Body/message content
- Direction (sent/received)
- Timestamp
- Customer link
- User who sent (if applicable)

## Database Schema

### EmailList
- Smart list support with JSON criteria
- Member count tracking
- Owner assignment

### EmailMessage
- Email tracking with status
- Open/click tracking
- Template linkage
- Activity linkage

### SMSConversation
- Groups messages by customer and phone number
- Tracks last message time

### SMSMessage
- Individual message tracking
- Direction (inbound/outbound)
- Delivery status
- Activity linkage

### CommunicationPreference
- Email opt-in/opt-out
- SMS opt-in/opt-out
- Preferred contact time

## Email Provider Integration

**Supported Providers:**
1. SendGrid (recommended)
2. Resend
3. AWS SES

**Configuration:**

### SendGrid
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_api_key
FROM_EMAIL=noreply@yourdomain.com
```

### Resend
```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_api_key
FROM_EMAIL=noreply@yourdomain.com
```

### AWS SES
```env
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
FROM_EMAIL=noreply@yourdomain.com
```

## Smart List Examples

### All Customers in Territory
```typescript
{
  type: 'all_in_territory',
  territory: 'North'
}
```

### High-Value Customers
```typescript
{
  type: 'high_value',
  minRevenue: 50000
}
```

### Customers Who Ordered Specific Product
```typescript
{
  type: 'ordered_product',
  skuId: 'sku-123'
}
```

### No Order in 30+ Days
```typescript
{
  type: 'no_order_in_days',
  days: 30
}
```

### Custom Query
```typescript
{
  type: 'custom',
  customQuery: {
    accountPriority: 'HIGH',
    accountType: 'ACTIVE'
  }
}
```

## Usage Examples

### Sending an Email with Template

```typescript
const response = await fetch('/api/sales/marketing/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'customer@example.com',
    customerId: 'customer-id',
    templateId: 'template-id',
    personalization: {
      customer_name: 'John Doe',
      last_order_date: '2024-01-15',
      rep_name: 'Jane Smith'
    }
  })
});
```

### Sending Bulk Email to List

```typescript
const response = await fetch('/api/sales/marketing/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    listId: 'list-id',
    subject: 'Weekly Wine Specials',
    html: '<h1>This Week Only!</h1><p>Check out our specials...</p>'
  })
});
```

### Sending an SMS

```typescript
const response = await fetch('/api/sales/marketing/sms/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+12345678900',
    customerId: 'customer-id',
    body: 'Hi! Your order will be delivered tomorrow.'
  })
});
```

## Performance Considerations

### Smart List Refresh
- Smart lists auto-refresh when criteria change
- Can be manually refreshed via API
- Consider scheduling periodic refreshes for large lists

### Bulk Sending
- Rate limiting applied (respects provider limits)
- Batch operations for large lists
- Queue system for 1000+ recipients

### Email Tracking
- Tracking pixels for opens
- Link rewriting for clicks
- Webhook handlers for real-time updates

## Security

### API Keys
- Never commit keys to source control
- Use environment variables
- Rotate keys regularly

### Webhook Verification
- Twilio signature verification (TODO)
- IP whitelist (optional)
- HTTPS required

### Opt-Out Compliance
- Honor unsubscribe requests
- CAN-SPAM compliance
- GDPR ready

## Testing

### Development Mode
When email/SMS providers aren't configured, system runs in dev mode:
- Emails logged to console instead of sending
- SMS logged to console instead of sending
- All tracking features still work
- Activities still created

### Test Webhooks
Use tools like ngrok for local webhook testing:
```bash
ngrok http 3000
# Use ngrok URL in Twilio webhook configuration
```

## Migration Script

Run the marketing migration:
```bash
npx prisma migrate dev --name add_marketing_communications
```

Or apply to production:
```bash
npx prisma migrate deploy
```

## Troubleshooting

### Emails Not Sending
1. Check `EMAIL_PROVIDER` environment variable
2. Verify API key is correct
3. Check provider dashboard for errors
4. Look in EmailMessage table for status

### SMS Not Sending
1. Verify Twilio credentials
2. Check phone number format (+1234567890)
3. Verify customer has SMS opt-in
4. Check Twilio console for delivery status

### Mailchimp Sync Failing
1. Verify API key format (should end with server prefix)
2. Check audience ID exists
3. Verify audience isn't deleted in Mailchimp
4. Check rate limits

### Smart Lists Empty
1. Verify criteria matches expected customers
2. Use preview API to debug query
3. Check customer data meets criteria
4. Manually trigger refresh

## Future Enhancements

### Planned Features
- [ ] A/B testing for email campaigns
- [ ] Advanced segmentation
- [ ] Email automation workflows
- [ ] Drip campaigns
- [ ] SMS templates with media (MMS)
- [ ] Email designer (drag-and-drop)
- [ ] Campaign performance dashboard
- [ ] Customer engagement scoring
- [ ] Integration with more providers (Constant Contact, etc.)
- [ ] WhatsApp messaging

### Requested Features
- Track which emails lead to orders
- Automated follow-ups based on customer behavior
- SMS auto-responder
- Email scheduling
- Recurring campaigns

## Support

For issues or questions:
1. Check this documentation
2. Review API endpoint documentation
3. Check system logs
4. Contact system administrator

## License

Internal use only. Do not distribute.

---

**Last Updated:** 2025-10-26
**Version:** 1.0.0
**Author:** Phase 3 Development Team
