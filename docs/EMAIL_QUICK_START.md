# Email Service - Quick Start Guide

Get your email service running in **15 minutes**.

## Prerequisites
- [ ] SendGrid account (free tier works)
- [ ] Access to DNS settings for your domain
- [ ] `.env.local` file access

---

## Step 1: Get SendGrid API Key (5 minutes)

1. **Sign up:** https://signup.sendgrid.com/
2. **Login** to SendGrid dashboard
3. **Settings** → **API Keys** → **Create API Key**
4. **Name:** `Well-Crafted-CRM`
5. **Permissions:** Full Access
6. **Create & View**
7. **COPY the key** (starts with `SG.`)

---

## Step 2: Configure Environment (2 minutes)

Edit `/web/.env.local`:

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.paste_your_key_here
FROM_EMAIL=sales@wellcraftedbeverage.com
FROM_NAME=Well Crafted Wine & Beverage
```

Save the file.

---

## Step 3: Verify Sender (3 minutes)

**Quick Method (for development):**

1. SendGrid → **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill out form:
   - **From Email:** sales@wellcraftedbeverage.com
   - **From Name:** Well Crafted Wine & Beverage
   - **Reply To:** sales@wellcraftedbeverage.com
4. **Create**
5. Check your email
6. Click verification link

---

## Step 4: Test It (5 minutes)

### Validate Setup

```bash
npx tsx scripts/email-setup-check.ts
```

You should see all green checkmarks ✓

### Send Test Email

Replace `your-email@example.com` with your actual email:

```bash
curl -X POST http://localhost:3000/api/sales/marketing/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "send-test",
    "to": "your-email@example.com"
  }'
```

### Check Your Inbox

You should receive a test email within seconds!

### Test with Template

```bash
curl -X POST http://localhost:3000/api/sales/marketing/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "send-test",
    "to": "your-email@example.com",
    "templateId": "weekly-specials"
  }'
```

---

## ✅ You're Done!

Your email service is now ready to use.

## Next Steps

### Send Email from Code

```typescript
const response = await fetch('/api/sales/marketing/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-id': 'your-tenant-id',
    'x-user-id': 'your-user-id',
  },
  body: JSON.stringify({
    to: 'customer@example.com',
    templateId: 'weekly-specials',
    personalization: {
      customer_name: 'John Smith',
      week_date: new Date().toLocaleDateString(),
      special_wine_1: '2019 Napa Valley Cabernet',
      special_wine_2: '2020 Russian River Chardonnay',
      special_wine_3: '2021 Willamette Valley Pinot Noir',
      discount_percent: '15',
      order_link: 'https://example.com/order',
    },
  }),
});
```

### Available Templates

1. **weekly-specials** - Weekly promotional emails
2. **new-product-announcement** - New wine arrivals
3. **customer-check-in** - Post-purchase follow-up
4. **tasting-invitation** - Event invitations
5. **thank-you-order** - Order confirmations

### Test All Templates

```bash
curl -X POST http://localhost:3000/api/sales/marketing/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "test-all-templates",
    "to": "your-email@example.com"
  }'
```

This will send all 5 templates to your inbox!

---

## Production Setup

For production deployment:

1. **Domain Authentication** (recommended)
   - SendGrid → Settings → Sender Authentication
   - Authenticate Your Domain
   - Add DNS records (SPF, DKIM, DMARC)
   - Wait 24-48 hours for verification

2. **Use Production API Key**
   - Create separate key for production
   - Name it `Well-Crafted-CRM-Production`
   - Add to production environment variables

3. **Monitor Usage**
   - SendGrid Dashboard → Activity
   - Check delivery rates
   - Monitor for bounces/spam

---

## Troubleshooting

**Problem:** API key invalid
**Solution:** Verify key starts with `SG.` and is copied correctly

**Problem:** Emails not arriving
**Solution:** Check spam folder, verify sender is verified

**Problem:** Validation script fails
**Solution:** Run `npm install @sendgrid/mail`

**Need help?** See `docs/EMAIL_SETUP_GUIDE.md` for detailed troubleshooting.

---

**That's it! You're ready to send emails.** 🎉

For detailed documentation: `docs/EMAIL_SETUP_GUIDE.md`
For deployment info: `docs/EMAIL_DEPLOYMENT_SUMMARY.md`
