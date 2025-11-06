# Email System Quick Start Guide

Get the email delivery system running in 5 minutes.

---

## 🚀 Quick Setup (Development)

### 1. Get Resend API Key (2 minutes)

1. Sign up at **https://resend.com** (free tier: 100 emails/day)
2. Go to **API Keys** in dashboard
3. Click **Create API Key**
4. Copy the key (starts with `re_`)

### 2. Configure Environment (1 minute)

Add to `/Users/greghogue/Leora2/web/.env.local`:

```bash
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Cron Secret (generate random string)
CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Email Provider
EMAIL_PROVIDER=resend

# App URL
NEXT_PUBLIC_URL=http://localhost:3000
```

**Generate Cron Secret**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Test Email Sending (2 minutes)

```bash
# Set test email address
export TEST_EMAIL=your-email@example.com

# Send test email
tsx scripts/test-email-delivery.ts send

# Check your inbox!
```

---

## ✅ Verify It's Working

### Send Test Email
```bash
tsx scripts/test-email-delivery.ts send
```

**Expected output**:
```
📧 Testing direct email send...

✅ Email sent successfully!
   External ID: abc123-def456-ghi789

✅ Test complete!
```

### Queue and Process Email
```bash
# Queue email
tsx scripts/test-email-delivery.ts queue

# Wait 1 minute, then process
tsx scripts/test-email-delivery.ts process
```

**Expected output**:
```
📬 Testing email queuing...

✅ Email queued successfully!
   Email ID: email-queue-123
   Will be sent in 1 minute

⚙️  Processing email queue...

📊 Processing Results:
   Total processed: 1
   ✅ Sent: 1
   ❌ Failed: 0
```

### Check Statistics
```bash
tsx scripts/test-email-delivery.ts stats
```

---

## 🎨 Available Templates

### 1. Order Status Changed
```typescript
import { sendEmailWithResend } from '@/lib/email/resend-service';

await sendEmailWithResend({
  to: customer.email,
  subject: 'Order Status Update',
  templateName: 'orderStatusChanged',
  templateData: {
    orderId: order.id,
    orderNumber: 'WC-2024-001',
    customerName: 'John Doe',
    previousStatus: 'SUBMITTED',
    newStatus: 'PICKED',
    orderDate: '2024-11-06',
    totalAmount: '1,250.00',
    baseUrl: process.env.NEXT_PUBLIC_URL!,
  },
  tenantId: tenant.id,
  customerId: customer.id,
});
```

### 2. Invoice Ready
```typescript
await sendEmailWithResend({
  to: customer.email,
  subject: 'Invoice Ready',
  templateName: 'invoiceReady',
  templateData: {
    invoiceId: invoice.id,
    invoiceNumber: 'INV-2024-001',
    customerName: 'John Doe',
    invoiceDate: '2024-11-06',
    dueDate: '2024-12-06',
    totalAmount: '2,500.00',
    baseUrl: process.env.NEXT_PUBLIC_URL!,
  },
  tenantId: tenant.id,
  customerId: customer.id,
});
```

### 3. Low Inventory Alert
```typescript
await sendEmailWithResend({
  to: salesRep.email,
  subject: 'Low Inventory Alert',
  templateName: 'lowInventoryAlert',
  templateData: {
    salesRepName: 'Jane Smith',
    items: [
      {
        productName: 'Premium Chardonnay',
        skuCode: 'SKU-001',
        currentQuantity: 5,
        reorderPoint: 20,
        recommendedOrder: 40,
      },
    ],
    baseUrl: process.env.NEXT_PUBLIC_URL!,
  },
  tenantId: tenant.id,
});
```

### 4. Daily Summary
```typescript
await sendEmailWithResend({
  to: salesRep.email,
  subject: 'Daily Summary',
  templateName: 'dailySummary',
  templateData: {
    salesRepName: 'Jane Smith',
    date: '2024-11-06',
    metrics: {
      ordersCount: 5,
      ordersTotal: '5,000.00',
      newCustomers: 2,
      activitiesCompleted: 8,
      tasksCompleted: 3,
      tasksPending: 5,
    },
    topOrders: [
      { orderNumber: 'WC-001', customerName: 'ABC Restaurant', totalAmount: '1,500.00' },
    ],
    upcomingTasks: [
      { title: 'Follow up with ABC', dueDate: 'Tomorrow', priority: 'HIGH' },
    ],
    baseUrl: process.env.NEXT_PUBLIC_URL!,
  },
  tenantId: tenant.id,
});
```

---

## 🔄 Queue vs. Immediate Send

### Immediate Send
**Use when**: User-triggered actions (order confirmation, invoice sent)

```typescript
import { sendEmailWithResend } from '@/lib/email/resend-service';

const result = await sendEmailWithResend({
  to: 'customer@example.com',
  subject: 'Order Confirmed',
  templateName: 'orderStatusChanged',
  templateData: { /* ... */ },
  tenantId: tenant.id,
});

if (!result.success) {
  console.error('Failed to send:', result.error);
}
```

### Queue for Later
**Use when**: Scheduled emails (daily summaries, batch notifications)

```typescript
import { queueEmail } from '@/lib/email/resend-service';

// Send tomorrow at 9 AM
const tomorrow9AM = new Date();
tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
tomorrow9AM.setHours(9, 0, 0, 0);

await queueEmail({
  to: 'salesrep@example.com',
  subject: 'Daily Summary',
  templateName: 'dailySummary',
  templateData: { /* ... */ },
  tenantId: tenant.id,
  scheduledFor: tomorrow9AM,
});
```

**Cron job will process** every 5 minutes!

---

## 🐛 Troubleshooting

### Email not received?

**Check 1**: Resend API key is correct
```bash
# Verify in .env.local
cat .env.local | grep RESEND_API_KEY
```

**Check 2**: Sender domain verified in Resend
- Go to Resend dashboard → Domains
- Verify your sending domain (or use test mode)

**Check 3**: Check spam folder
- Resend test mode may trigger spam filters
- Verify domain to improve deliverability

**Check 4**: Database logs
```sql
-- Check email status
SELECT id, subject, status, "sentAt", "metadata"
FROM "EmailMessage"
ORDER BY "createdAt" DESC
LIMIT 5;

-- Check failed emails
SELECT id, subject, "metadata"->>'error' as error
FROM "EmailMessage"
WHERE status = 'FAILED';
```

### Cron job not running?

**Local development**: Cron jobs only run in production (Vercel)

**Manual process**:
```bash
tsx scripts/test-email-delivery.ts process
```

**Production**: Check Vercel dashboard → Cron Jobs

---

## 📚 Next Steps

1. **Integrate with order workflow**:
   - Add email sending to order status updates
   - See: `/src/app/api/orders/[id]/route.ts`

2. **Integrate with invoice generation**:
   - Send invoice ready emails automatically
   - See: `/src/app/api/invoices/route.ts`

3. **Set up daily summaries**:
   - Create scheduled task for sales rep summaries
   - Queue emails for next day delivery

4. **Monitor email performance**:
   - Check `getEmailStats()` for delivery rates
   - Review failed emails weekly

---

## 🎯 Production Deployment

See **[PHASE4_SPRINT4_EMAIL_COMPLETE.md](./PHASE4_SPRINT4_EMAIL_COMPLETE.md)** for full deployment guide.

**Quick checklist**:
- [ ] Get Resend API key (production account)
- [ ] Add environment variables in Vercel
- [ ] Verify sender domain in Resend
- [ ] Deploy to Vercel
- [ ] Verify cron job is running
- [ ] Send test email in production

---

**Questions?** See full documentation in `PHASE4_SPRINT4_EMAIL_COMPLETE.md`
