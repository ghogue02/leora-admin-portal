# Email Integration Setup Guide

Complete guide for setting up email functionality in Well Crafted CRM.

## Table of Contents

1. [Overview](#overview)
2. [SendGrid Setup](#sendgrid-setup)
3. [DNS Configuration](#dns-configuration)
4. [Environment Configuration](#environment-configuration)
5. [Testing](#testing)
6. [Email Templates](#email-templates)
7. [API Usage](#api-usage)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The CRM supports email sending through **SendGrid** (recommended), Resend, or AWS SES. This guide focuses on SendGrid setup.

**Features:**
- ✅ Professional email templates (5 built-in)
- ✅ Personalization tokens
- ✅ Bulk email sending
- ✅ Email tracking (opens/clicks)
- ✅ Automatic activity logging
- ✅ Custom template creation

---

## SendGrid Setup

### Step 1: Create SendGrid Account

1. Visit [SendGrid Signup](https://signup.sendgrid.com/)
2. Create free account (40,000 emails/month for 30 days, then 100/day free)
3. Verify your email address

### Step 2: Generate API Key

1. Log into SendGrid Dashboard
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name: `Well-Crafted-CRM-Production`
5. Permissions: **Full Access** (or Mail Send + Activity Read)
6. Click **Create & View**
7. **IMPORTANT:** Copy the API key immediately (shown only once!)

```
Example: SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Verify Sender Identity

**Option A: Single Sender Verification (Quick)**
1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Enter details:
   - From Email: `sales@wellcraftedbeverage.com`
   - From Name: `Well Crafted Wine & Beverage`
   - Reply To: `sales@wellcraftedbeverage.com`
   - Company: `Well Crafted Wine & Beverage`
4. Check email for verification link
5. Click to verify

**Option B: Domain Authentication (Recommended for Production)**
1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Select DNS host (e.g., GoDaddy, Cloudflare)
4. Enter domain: `wellcraftedbeverage.com`
5. Follow DNS configuration steps below

---

## DNS Configuration

### Required DNS Records

SendGrid provides these records after domain authentication setup:

#### 1. SPF Record
```
Type: TXT
Host: @
Value: v=spf1 include:sendgrid.net ~all
TTL: 3600
```

#### 2. DKIM Records (2 records)
```
Type: CNAME
Host: s1._domainkey
Value: s1.domainkey.u12345678.wl123.sendgrid.net
TTL: 3600

Type: CNAME
Host: s2._domainkey
Value: s2.domainkey.u12345678.wl123.sendgrid.net
TTL: 3600
```

#### 3. DMARC Record
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:admin@wellcraftedbeverage.com
TTL: 3600
```

### DNS Provider Examples

**GoDaddy:**
1. Log into GoDaddy
2. Domains → My Domains → DNS
3. Add each record
4. Wait 24-48 hours for propagation

**Cloudflare:**
1. Log into Cloudflare
2. Select domain → DNS → Records
3. Add each record
4. Propagation usually faster (1-2 hours)

### Verify DNS Configuration

```bash
# Check SPF
dig TXT wellcraftedbeverage.com

# Check DKIM
dig CNAME s1._domainkey.wellcraftedbeverage.com

# Check DMARC
dig TXT _dmarc.wellcraftedbeverage.com
```

Or use online tools:
- [MXToolbox](https://mxtoolbox.com/SuperTool.aspx)
- [SendGrid DNS Checker](https://app.sendgrid.com/settings/sender_auth)

---

## Environment Configuration

### Add to `.env.local`

```bash
# Email Provider Configuration
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_actual_key_here
FROM_EMAIL=sales@wellcraftedbeverage.com
FROM_NAME=Well Crafted Wine & Beverage

# Optional
REPLY_TO_EMAIL=support@wellcraftedbeverage.com
```

### Security Best Practices

1. **Never commit `.env.local` to git**
2. **Rotate API keys quarterly**
3. **Use different keys for dev/staging/production**
4. **Enable IP access management in SendGrid**

### Development vs Production

**Development:**
```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.dev_key_here
FROM_EMAIL=dev@wellcraftedbeverage.com
```

**Production:**
```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.prod_key_here
FROM_EMAIL=sales@wellcraftedbeverage.com
```

---

## Testing

### Test 1: Validate API Key

```bash
curl -X POST http://localhost:3000/api/sales/marketing/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "validate-api-key"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "SendGrid API key is valid"
}
```

### Test 2: Send Single Test Email

```bash
curl -X POST http://localhost:3000/api/sales/marketing/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "send-test",
    "to": "your-email@example.com"
  }'
```

### Test 3: Send Test with Template

```bash
curl -X POST http://localhost:3000/api/sales/marketing/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "send-test",
    "to": "your-email@example.com",
    "templateId": "weekly-specials"
  }'
```

### Test 4: Test All Templates

```bash
curl -X POST http://localhost:3000/api/sales/marketing/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "test-all-templates",
    "to": "your-email@example.com"
  }'
```

This will send all 5 templates with `[TEST]` prefix.

### Email Deliverability Checklist

- [ ] SendGrid API key is valid
- [ ] Sender email is verified
- [ ] DNS records are configured (SPF, DKIM, DMARC)
- [ ] Test emails arrive in inbox (not spam)
- [ ] Links in emails work correctly
- [ ] Images display properly
- [ ] Mobile rendering looks good
- [ ] Unsubscribe link is present (for marketing emails)

---

## Email Templates

### Built-in Templates

1. **Weekly Specials** (`weekly-specials`)
   - Category: Marketing
   - Use: Weekly promotional emails

2. **New Product Announcement** (`new-product-announcement`)
   - Category: Announcement
   - Use: Announce new wine arrivals

3. **Customer Check-in** (`customer-check-in`)
   - Category: Follow-up
   - Use: Post-purchase follow-up

4. **Wine Tasting Invitation** (`tasting-invitation`)
   - Category: Announcement
   - Use: Event invitations

5. **Thank You for Order** (`thank-you-order`)
   - Category: Transactional
   - Use: Order confirmations

### Personalization Tokens

Templates support `{{token}}` syntax:

```html
<p>Hello {{customer_name}},</p>
<p>Your order {{order_number}} is ready!</p>
```

Common tokens:
- `{{customer_name}}`
- `{{order_number}}`
- `{{order_date}}`
- `{{product_name}}`
- `{{event_name}}`
- `{{special_wine_1}}`

### List All Templates

```bash
curl http://localhost:3000/api/sales/marketing/email/templates \
  -H "x-tenant-id: your-tenant-id"
```

### Get Single Template

```bash
curl http://localhost:3000/api/sales/marketing/email/templates/weekly-specials \
  -H "x-tenant-id: your-tenant-id"
```

### Create Custom Template

```bash
curl -X POST http://localhost:3000/api/sales/marketing/email/templates \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: your-tenant-id" \
  -d '{
    "name": "Custom Promotion",
    "subject": "Special Offer: {{offer_name}}",
    "category": "marketing",
    "description": "Custom promotional template",
    "html": "<h1>{{offer_name}}</h1><p>{{offer_description}}</p>",
    "tokens": ["offer_name", "offer_description"]
  }'
```

---

## API Usage

### Send Single Email

```typescript
const response = await fetch('/api/sales/marketing/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
    'x-user-id': userId,
  },
  body: JSON.stringify({
    to: 'customer@example.com',
    subject: 'Your Weekly Wine Specials',
    html: '<p>Hello!</p>',
    customerId: 'cust_123', // Optional - for activity logging
  }),
});
```

### Send with Template

```typescript
const response = await fetch('/api/sales/marketing/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
    'x-user-id': userId,
  },
  body: JSON.stringify({
    to: 'customer@example.com',
    templateId: 'weekly-specials',
    customerId: 'cust_123',
    personalization: {
      customer_name: 'John Smith',
      week_date: '11/27/2024',
      special_wine_1: '2019 Napa Cab',
      special_wine_2: '2020 Chardonnay',
      special_wine_3: '2021 Pinot Noir',
      discount_percent: '15',
      order_link: 'https://example.com/order',
    },
  }),
});
```

### Send Bulk Email

```typescript
const response = await fetch('/api/sales/marketing/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
    'x-user-id': userId,
  },
  body: JSON.stringify({
    listId: 'list_123',
    subject: 'Weekly Specials',
    html: '<p>Check out this week\'s wines!</p>',
  }),
});
```

---

## Troubleshooting

### Problem: API Key Invalid

**Symptoms:**
- Error: "SendGrid API key is invalid"
- 401 Unauthorized errors

**Solutions:**
1. Verify API key is copied correctly (no spaces)
2. Check API key hasn't been deleted in SendGrid
3. Ensure API key has Mail Send permissions
4. Try generating a new API key

### Problem: Emails Going to Spam

**Symptoms:**
- Test emails arrive in spam folder
- Low delivery rate

**Solutions:**
1. Complete domain authentication (not just single sender)
2. Verify all DNS records (SPF, DKIM, DMARC)
3. Use authenticated domain in FROM address
4. Avoid spam trigger words in subject
5. Include unsubscribe link
6. Maintain good sender reputation

### Problem: DNS Not Verifying

**Symptoms:**
- SendGrid shows DNS not verified after 48 hours
- Dig commands show no records

**Solutions:**
1. Double-check record values (no typos)
2. Ensure using correct host names
3. Wait full 48 hours for propagation
4. Clear DNS cache: `sudo dscacheutil -flushcache`
5. Try different DNS checker tool
6. Contact DNS provider support

### Problem: Rate Limiting

**Symptoms:**
- Error: "Rate limit exceeded"
- 429 Too Many Requests

**Solutions:**
1. Check SendGrid plan limits
2. Implement exponential backoff
3. Batch emails properly (max 1000 per request)
4. Upgrade SendGrid plan if needed

### Problem: Personalization Not Working

**Symptoms:**
- Emails show `{{token}}` instead of values
- Missing data in emails

**Solutions:**
1. Verify token names match exactly (case-sensitive)
2. Ensure personalization object passed to API
3. Check template has correct token syntax
4. Use double curly braces: `{{token}}`

### Getting Help

**SendGrid Support:**
- Docs: https://docs.sendgrid.com
- Status: https://status.sendgrid.com
- Support: support@sendgrid.com (paid plans)

**CRM Issues:**
- Check application logs
- Review email_messages table in database
- Test with curl commands
- Enable debug logging

---

## Production Checklist

Before going live:

- [ ] SendGrid account verified
- [ ] Domain authentication complete
- [ ] DNS records verified (48+ hours old)
- [ ] Production API key created
- [ ] Environment variables set in production
- [ ] Test emails sent successfully
- [ ] All 5 templates tested
- [ ] Emails not going to spam
- [ ] Tracking pixels working
- [ ] Unsubscribe links functional
- [ ] Activity logging confirmed
- [ ] Rate limits understood
- [ ] Monitoring/alerts configured
- [ ] Backup email provider considered

---

## Next Steps

1. **Set up webhooks** for email events (opens, clicks, bounces)
2. **Configure email lists** for segmented marketing
3. **Create custom templates** for your specific needs
4. **Set up automated campaigns**
5. **Monitor email analytics**

---

**Last Updated:** November 27, 2024
**Version:** 1.0.0
**Contact:** development@wellcraftedbeverage.com
