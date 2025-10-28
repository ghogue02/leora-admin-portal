# Twilio SMS Integration - Complete Documentation

## 📱 Overview

Complete SMS messaging system for Leora CRM using Twilio. Enables two-way SMS communication with customers, automated notifications, marketing campaigns, and full activity tracking.

**Status:** ✅ Ready for Deployment
**Timeline:** Monday (Day 1) - 3 hours
**Priority:** HIGH - Enables SMS features

---

## 🎯 Features

### Core Capabilities
- ✅ **Two-way SMS** - Send and receive messages
- ✅ **Template System** - 8 pre-built templates
- ✅ **Auto-logging** - All messages saved as activities
- ✅ **Opt-in/Opt-out** - Automatic compliance handling
- ✅ **Webhook Integration** - Real-time message processing
- ✅ **Personalization** - Variable substitution
- ✅ **Status Tracking** - Delivery confirmation
- ✅ **Security** - Signature validation

### Template Categories
- 📢 **Marketing** (2) - Weekly specials, reorder reminders
- 🔔 **Notifications** (3) - Delivery, order confirmation, appointments
- 🤝 **Service** (2) - Check-ins, payment reminders
- 💼 **Sales** (1) - Tasting invitations

---

## 📚 Documentation

### Quick Start
1. **[Setup Guide](./SETUP_GUIDE.md)** - Account creation, configuration, webhooks
2. **[Testing Guide](./TESTING_GUIDE.md)** - Comprehensive testing procedures
3. **[Production Guide](./PRODUCTION_GUIDE.md)** - Deployment and monitoring
4. **[Template Library](./TEMPLATES.md)** - All 8 templates with examples

### Implementation Details

**File Structure:**
```
web/
├── src/
│   ├── lib/services/twilio/
│   │   ├── client.ts              # Twilio SDK wrapper
│   │   └── templates.ts           # Template system
│   └── app/api/
│       ├── sms/
│       │   └── send/
│       │       └── route.ts       # Send SMS endpoint
│       └── sales/marketing/webhooks/twilio/
│           ├── route.ts           # Incoming messages
│           └── status/
│               └── route.ts       # Status callbacks
└── docs/deployment/twilio/
    ├── README.md                  # This file
    ├── SETUP_GUIDE.md
    ├── TESTING_GUIDE.md
    ├── PRODUCTION_GUIDE.md
    └── TEMPLATES.md
```

---

## 🚀 Quick Setup (15 minutes)

### 1. Install Dependencies
```bash
npm install twilio@^5.3.7
```

### 2. Configure Environment
```bash
# Add to .env.local
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WEBHOOK_BASE_URL=https://yourdomain.com
```

### 3. Setup Database
```sql
-- Add SMS activity type
INSERT INTO activity_types (code, name, category)
VALUES ('sms', 'SMS Message', 'communication');

-- Add opt-in fields to customers
ALTER TABLE customers
ADD COLUMN sms_opt_in BOOLEAN DEFAULT true,
ADD COLUMN sms_opt_in_date TIMESTAMPTZ,
ADD COLUMN sms_opt_out_date TIMESTAMPTZ;
```

### 4. Configure Webhooks
In Twilio Console, set webhook URLs:
- **Incoming:** `https://yourdomain.com/api/sales/marketing/webhooks/twilio`
- **Status:** `https://yourdomain.com/api/sales/marketing/webhooks/twilio/status`

### 5. Test
```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "your-customer-id",
    "message": "Test message"
  }'
```

---

## 📖 API Reference

### Send SMS

**Endpoint:** `POST /api/sms/send`

**Request:**
```typescript
{
  customerId: string;              // Required
  message?: string;                // Custom message
  templateId?: string;             // Or use template
  templateVariables?: {            // Template variables
    firstName: string;
    [key: string]: string;
  };
  salesRepId?: string;             // For activity log
}
```

**Response:**
```typescript
{
  success: true,
  messageSid: "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  status: "queued",
  to: "+1234567890",
  message: "SMS sent successfully"
}
```

### Send with Template

```bash
curl -X POST /api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust_123",
    "templateId": "weekly_specials",
    "templateVariables": {
      "firstName": "John",
      "special": "20% off Chardonnay",
      "deadline": "Friday 5pm"
    }
  }'
```

### Webhook Endpoints

**Incoming Messages:** `POST /api/sales/marketing/webhooks/twilio`
- Receives SMS from customers
- Auto-logs as activity
- Handles opt-in/opt-out
- Returns TwiML response

**Status Callbacks:** `POST /api/sales/marketing/webhooks/twilio/status`
- Receives delivery updates
- Updates activity status
- Tracks failures

---

## 📋 Templates

### 1. Weekly Specials (Marketing)
```
Hi {{firstName}}! This week at Well Crafted: {{special}}.
Order by {{deadline}}. Reply STOP to opt out.
```

### 2. Delivery Notification
```
Hi {{firstName}}! Your Well Crafted order #{{orderNumber}}
will be delivered {{deliveryDate}} between {{timeWindow}}.
```

### 3. Sample Tasting Invitation
```
Hi {{firstName}}! We have {{productName}} samples for you.
When can we stop by? Reply with preferred day/time.
```

### 4. Order Confirmation
```
Order confirmed! {{itemCount}} items, ${{total}}.
Delivery {{deliveryDate}}. Questions? Call {{phone}}.
```

### 5. Customer Check-In
```
Hi {{firstName}}! How is everything with your recent order?
Need to restock {{topProduct}}? Reply YES to schedule.
```

### 6. Payment Reminder
```
Hi {{firstName}}, invoice #{{invoiceNumber}} for ${{amount}}
is due {{dueDate}}. Pay online: {{paymentLink}}
```

### 7. Reorder Reminder
```
Time to restock {{productName}}? Last order was {{weeksAgo}}
weeks ago. Reply YES and we'll call to place order.
```

### 8. Appointment Reminder
```
Reminder: {{salesRep}} will visit {{date}} at {{time}}
for {{purpose}}. Reply CONFIRM or call {{phone}}.
```

See [TEMPLATES.md](./TEMPLATES.md) for full documentation.

---

## 🔒 Security & Compliance

### Security Features
- ✅ Webhook signature validation
- ✅ Environment variable encryption
- ✅ No credentials in code
- ✅ HTTPS-only webhooks
- ✅ Rate limiting support

### Compliance Features
- ✅ Automatic opt-out handling (STOP, UNSUBSCRIBE)
- ✅ Opt-in tracking with timestamps
- ✅ Business hours enforcement
- ✅ Consent record keeping
- ✅ Privacy policy ready

### TCPA Compliance Checklist
- [ ] Written consent obtained before marketing SMS
- [ ] Consent records stored for 4 years
- [ ] Opt-out mechanism working (STOP commands)
- [ ] Do Not Call lists honored
- [ ] Business identified in messages
- [ ] Frequency disclosed to customers

---

## 💰 Cost Estimates

### Twilio Pricing (USA, 2025)
- **Outbound SMS:** $0.0075 per message
- **Inbound SMS:** $0.0075 per message
- **Phone Number:** $1.15/month
- **Messaging Service:** Free (included)

### Monthly Estimates
| Volume | Cost |
|--------|------|
| 100 SMS | $0.75 + $1.15 = **$1.90** |
| 1,000 SMS | $7.50 + $1.15 = **$8.65** |
| 10,000 SMS | $75 + $1.15 = **$76.15** |
| 50,000 SMS | $375 + $1.15 = **$376.15** |

### Trial Account
- **Credit:** $15.50
- **Limitations:** Only verified numbers
- **Duration:** Never expires
- **Perfect for:** Development and testing

---

## 📊 Monitoring & Metrics

### Key Metrics to Track

**Operational:**
- Delivery rate (target: > 95%)
- Webhook response time (target: < 500ms)
- API response time (target: < 2s)
- Error rate (target: < 1%)

**Business:**
- Reply rate by template
- Opt-out rate (target: < 2%)
- Conversion rate
- Customer engagement

**Cost:**
- Daily SMS volume
- Monthly spending
- Cost per customer
- ROI per campaign

### Twilio Console
Monitor at: https://console.twilio.com/monitor/logs/sms

**Check daily:**
- Message volume
- Delivery failures
- Error codes
- Webhook status

---

## 🧪 Testing

### Test Scenarios

**Before Production:**
1. ✅ Send basic SMS
2. ✅ Send with all 8 templates
3. ✅ Receive incoming SMS
4. ✅ Test opt-out (STOP)
5. ✅ Test opt-in (START)
6. ✅ Verify activity logging
7. ✅ Test invalid phone numbers
8. ✅ Test message length limits
9. ✅ Verify webhook signatures
10. ✅ Test status callbacks

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for detailed procedures.

---

## 🚨 Troubleshooting

### Common Issues

**SMS not received**
- Check Twilio console logs
- Verify E.164 phone format (+1234567890)
- Check trial account limitations
- Verify number is verified (trial mode)

**Webhook not working**
- Verify HTTPS URL
- Check public accessibility
- Use ngrok for local testing
- Review Twilio error logs

**Activity not logging**
- Verify 'sms' activity type exists
- Check database connection
- Review application logs
- Verify Supabase permissions

**High opt-out rate**
- Review message frequency
- Check message relevance
- Verify timing (business hours)
- Improve personalization

---

## 📈 Performance Benchmarks

### Expected Performance
- **Send SMS:** < 2 seconds
- **Receive webhook:** < 500ms
- **Log activity:** < 1 second
- **Template render:** < 50ms

### Twilio Rate Limits
- **Trial:** 1 message/second
- **Paid:** 100 messages/second
- **Burst:** 200 messages
- **Concurrent:** Unlimited

### Scale Recommendations
- **< 1K/day:** No changes needed
- **1K-10K/day:** Add rate limiting
- **10K-100K/day:** Use messaging service
- **100K+/day:** Contact Twilio for enterprise

---

## 🎓 Training & Onboarding

### For Sales Team

**Using SMS Features:**
1. Navigate to customer detail page
2. Click "Send SMS" button
3. Choose template or write custom message
4. Fill in personalization fields
5. Click "Send"
6. Message auto-logs as activity

**Best Practices:**
- Always personalize with customer name
- Keep under 160 characters when possible
- Don't send after 9pm or before 8am
- Respect opt-out requests immediately
- Use templates for consistency

### For Developers

**Adding New Templates:**
1. Edit `src/lib/services/twilio/templates.ts`
2. Add new template object
3. Test rendering
4. Update documentation
5. Deploy

**Monitoring:**
1. Check Twilio dashboard daily
2. Review delivery rates
3. Monitor costs
4. Track errors
5. Analyze engagement

---

## 🗺️ Roadmap

### Phase 1: Launch (Monday)
- [x] Twilio account setup
- [x] Environment configuration
- [x] Webhook implementation
- [x] Template system
- [x] Activity logging
- [ ] UI integration

### Phase 2: Enhancements (Week 2)
- [ ] SMS campaigns
- [ ] Scheduled messages
- [ ] Message templates UI
- [ ] Analytics dashboard
- [ ] A/B testing

### Phase 3: Advanced (Month 2)
- [ ] AI-powered responses
- [ ] Chatbot integration
- [ ] Multi-language support
- [ ] MMS (images)
- [ ] Short codes

---

## 📞 Support

### Resources
- **Twilio Docs:** https://www.twilio.com/docs/sms
- **API Reference:** https://www.twilio.com/docs/sms/api
- **Community:** https://community.twilio.com/
- **Support:** https://support.twilio.com/
- **Status:** https://status.twilio.com/

### Getting Help
1. Check this documentation first
2. Review Twilio console logs
3. Test with Twilio's tools
4. Contact Twilio support
5. File issue in project repo

---

## ✅ Success Criteria

### Technical
- [ ] All tests passing
- [ ] Webhooks configured
- [ ] Templates working
- [ ] Activity logging verified
- [ ] Error handling tested
- [ ] Production deployed

### Business
- [ ] Team trained
- [ ] Templates approved
- [ ] Compliance verified
- [ ] Budget approved
- [ ] Monitoring active
- [ ] Users enabled

---

## 📝 Change Log

**v1.0.0 - October 27, 2025**
- Initial implementation
- 8 SMS templates
- Two-way messaging
- Activity logging
- Opt-in/opt-out handling
- Webhook integration
- Complete documentation

---

## 👥 Contributors

**Author:** System Architecture Designer
**Date:** October 27, 2025
**Project:** Leora CRM - Twilio SMS Integration

---

## 📄 License

Internal use only. See main project license.

---

**Status:** ✅ Ready for Monday Deployment
**Next Steps:** Follow [SETUP_GUIDE.md](./SETUP_GUIDE.md) to begin implementation
