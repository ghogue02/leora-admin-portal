# Twilio SMS - Quick Reference Card

## 🚀 Emergency Quick Start (5 minutes)

```bash
# 1. Install Twilio
npm install twilio

# 2. Add to .env.local
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# 3. Send test SMS
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{"customerId":"test","message":"Hello!"}'
```

---

## 📞 Twilio Console Links

| Resource | URL |
|----------|-----|
| Dashboard | https://console.twilio.com/ |
| Phone Numbers | https://console.twilio.com/phone-numbers/numbers |
| SMS Logs | https://console.twilio.com/monitor/logs/sms |
| Messaging Services | https://console.twilio.com/messaging/services |
| Account Settings | https://console.twilio.com/project/settings |

---

## 🔑 Environment Variables

```env
# Required
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_keep_secret
TWILIO_PHONE_NUMBER=+1234567890

# Optional but recommended
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WEBHOOK_BASE_URL=https://yourdomain.com
```

---

## 📡 API Endpoints

### Send SMS
```bash
POST /api/sms/send
```
```json
{
  "customerId": "cust_123",
  "message": "Your custom message"
}
```

### Send with Template
```json
{
  "customerId": "cust_123",
  "templateId": "weekly_specials",
  "templateVariables": {
    "firstName": "John",
    "special": "20% off wine",
    "deadline": "Friday"
  }
}
```

### Webhooks
- **Incoming:** `POST /api/sales/marketing/webhooks/twilio`
- **Status:** `POST /api/sales/marketing/webhooks/twilio/status`

---

## 📝 Template IDs

| ID | Name | Category | Use Case |
|----|------|----------|----------|
| `weekly_specials` | Weekly Specials | Marketing | Promotions |
| `delivery_notification` | Delivery Alert | Notification | Order updates |
| `tasting_invitation` | Tasting Invite | Sales | Samples |
| `order_confirmation` | Order Confirm | Notification | Confirmations |
| `customer_checkin` | Check-In | Service | Follow-up |
| `payment_reminder` | Payment Due | Service | Collections |
| `reorder_reminder` | Reorder | Marketing | Retention |
| `appointment_reminder` | Appointment | Notification | Scheduling |

---

## 🧪 Quick Tests

### Test SMS Send
```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "your-customer-id",
    "templateId": "weekly_specials",
    "templateVariables": {
      "firstName": "Test",
      "special": "Test special",
      "deadline": "Friday"
    }
  }'
```

### Test Webhook (Simulate Incoming)
```bash
curl -X POST http://localhost:3000/api/sales/marketing/webhooks/twilio \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SM123&From=%2B1234567890&To=%2B1987654321&Body=Test"
```

---

## 🚨 Troubleshooting

| Issue | Quick Fix |
|-------|-----------|
| SMS not received | Check Twilio logs, verify E.164 format |
| Webhook not working | Verify HTTPS URL, check signature |
| Activity not logging | Verify SMS activity type exists |
| Invalid credentials | Rotate auth token in Twilio console |
| Rate limit | Wait 1 second, add rate limiting |
| Opted out customer | Check `sms_opt_in` field |

---

## 💰 Pricing Cheat Sheet

| Item | Cost |
|------|------|
| Phone Number | $1.15/month |
| Outbound SMS | $0.0075 each |
| Inbound SMS | $0.0075 each |
| 100 messages | ~$2/month |
| 1,000 messages | ~$9/month |
| 10,000 messages | ~$76/month |

---

## 📊 Key Metrics

| Metric | Target |
|--------|--------|
| Delivery Rate | > 95% |
| Response Time | < 2 seconds |
| Reply Rate | > 30% |
| Opt-Out Rate | < 2% |
| Webhook Latency | < 500ms |

---

## 🔒 Security Checklist

- [x] Webhook signature validation enabled
- [ ] Environment variables in .env.local (not .env)
- [ ] .env.local in .gitignore
- [ ] HTTPS-only webhooks
- [ ] Auth token rotated every 90 days
- [ ] No credentials in code

---

## 📞 Quick Support

| Need | Resource |
|------|----------|
| Setup help | [SETUP_GUIDE.md](./SETUP_GUIDE.md) |
| Testing | [TESTING_GUIDE.md](./TESTING_GUIDE.md) |
| Production | [PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md) |
| Templates | [TEMPLATES.md](./TEMPLATES.md) |
| Twilio support | https://support.twilio.com/ |

---

## ⌨️ Code Snippets

### Send SMS in TypeScript
```typescript
import { sendSMS } from '@/lib/services/twilio/client';

const result = await sendSMS({
  to: '+1234567890',
  body: 'Hello from Leora CRM!',
});

if (result.success) {
  console.log('Sent:', result.messageSid);
} else {
  console.error('Failed:', result.error);
}
```

### Render Template
```typescript
import { renderTemplate } from '@/lib/services/twilio/templates';

const { message } = renderTemplate('weekly_specials', {
  firstName: 'John',
  special: '20% off Chardonnay',
  deadline: 'Friday 5pm',
});

console.log(message);
```

### Check Twilio Status
```typescript
import { isTwilioConfigured, getTwilioStatus } from '@/lib/services/twilio/client';

if (isTwilioConfigured()) {
  console.log('Twilio ready!');
} else {
  console.log('Missing config:', getTwilioStatus());
}
```

---

## 🎯 Most Common Tasks

### 1. Send Weekly Special
```typescript
await sendSMS({
  customerId: customer.id,
  templateId: 'weekly_specials',
  templateVariables: {
    firstName: customer.firstName,
    special: 'Premium wines 25% off',
    deadline: 'Friday 5pm',
  },
});
```

### 2. Send Delivery Notification
```typescript
await sendSMS({
  customerId: order.customerId,
  templateId: 'delivery_notification',
  templateVariables: {
    firstName: customer.firstName,
    orderNumber: order.number,
    deliveryDate: 'tomorrow',
    timeWindow: '2-4pm',
  },
});
```

### 3. Check Opt-In Status
```sql
SELECT
  name,
  phone,
  sms_opt_in,
  sms_opt_in_date,
  sms_opt_out_date
FROM customers
WHERE sms_opt_in = false;
```

---

## 📱 Phone Number Formats

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| 1234567890 | +11234567890 |
| (123) 456-7890 | +11234567890 |
| 123-456-7890 | +11234567890 |
| +1 123 456 7890 | +11234567890 |

**Rule:** Always use E.164 format: `+[country][number]`

---

## 🔔 Webhook Events

### Incoming Message
```json
{
  "MessageSid": "SMxxxxxxxx",
  "From": "+1234567890",
  "To": "+1987654321",
  "Body": "Customer message",
  "NumMedia": "0"
}
```

### Status Callback
```json
{
  "MessageSid": "SMxxxxxxxx",
  "MessageStatus": "delivered",
  "To": "+1234567890",
  "ErrorCode": null
}
```

**Statuses:**
- `queued` → `sending` → `sent` → `delivered`
- Or: `failed` / `undelivered`

---

## 🎓 Training Quick Tips

### For Sales Team
1. Always personalize with first name
2. Keep under 160 characters
3. Send 8am-9pm only
4. Use templates for consistency
5. Respect opt-outs immediately

### For Admins
1. Check Twilio dashboard daily
2. Monitor delivery rates (>95%)
3. Track costs monthly
4. Update templates quarterly
5. Train team on best practices

---

## 🔗 Important URLs

**Get Credentials:**
- Account SID & Token: https://console.twilio.com/
- Buy Phone Number: https://console.twilio.com/phone-numbers/search

**Configure Webhooks:**
- Phone Settings: https://console.twilio.com/phone-numbers/numbers
- Messaging Service: https://console.twilio.com/messaging/services

**Monitor:**
- SMS Logs: https://console.twilio.com/monitor/logs/sms
- Usage: https://console.twilio.com/usage
- Billing: https://console.twilio.com/billing

**Support:**
- Docs: https://www.twilio.com/docs/sms
- Status: https://status.twilio.com/
- Help: https://support.twilio.com/

---

**Print this for your desk!** 📋

**Last Updated:** October 27, 2025
