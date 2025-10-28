# Twilio SMS Testing Guide

## Overview
Comprehensive testing guide for the Twilio SMS integration in Leora CRM.

---

## Pre-Testing Checklist

### Required Setup
- [ ] Twilio account created and verified
- [ ] Phone number purchased
- [ ] Environment variables configured
- [ ] Twilio SDK installed: `npm install twilio`
- [ ] Application deployed or running locally
- [ ] Webhooks configured in Twilio console

### Verification
```bash
# Check if environment variables are loaded
node -e "console.log({
  accountSid: process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Missing',
  authToken: process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Missing',
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'Missing'
})"
```

---

## Part 1: Test SMS Sending (1 hour)

### Test 1: Send Basic SMS from API

**Method:** Direct API call

```bash
# Test sending SMS via API
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "your-customer-id",
    "message": "Test message from Leora CRM"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "messageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "queued",
  "to": "+1234567890",
  "message": "SMS sent successfully"
}
```

**Verify:**
- [ ] API returns success
- [ ] Message SID is present
- [ ] SMS received on phone
- [ ] Activity logged in CRM

### Test 2: Send SMS with Template

```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "your-customer-id",
    "templateId": "weekly_specials",
    "templateVariables": {
      "firstName": "John",
      "special": "20% off Chardonnay",
      "deadline": "Friday 5pm"
    }
  }'
```

**Expected Result:**
- SMS with personalized content
- Under 160 characters
- All variables replaced

**Verify:**
- [ ] Template renders correctly
- [ ] Variables are substituted
- [ ] Message is delivered
- [ ] Character count is correct

### Test 3: Test All Templates

Test each of the 8 built-in templates:

1. **Weekly Specials**
```json
{
  "templateId": "weekly_specials",
  "templateVariables": {
    "firstName": "Sarah",
    "special": "Italian Prosecco 25% off",
    "deadline": "Sunday 6pm"
  }
}
```

2. **Delivery Notification**
```json
{
  "templateId": "delivery_notification",
  "templateVariables": {
    "firstName": "Mike",
    "orderNumber": "12345",
    "deliveryDate": "tomorrow",
    "timeWindow": "2-4pm"
  }
}
```

3. **Tasting Invitation**
```json
{
  "templateId": "tasting_invitation",
  "templateVariables": {
    "firstName": "Lisa",
    "productName": "French Bordeaux"
  }
}
```

4. **Order Confirmation**
```json
{
  "templateId": "order_confirmation",
  "templateVariables": {
    "itemCount": "8",
    "total": "675.00",
    "deliveryDate": "Wed 3/20",
    "phone": "415-555-0100"
  }
}
```

5. **Customer Check-In**
```json
{
  "templateId": "customer_checkin",
  "templateVariables": {
    "firstName": "Tom",
    "topProduct": "Pinot Noir"
  }
}
```

6. **Payment Reminder**
```json
{
  "templateId": "payment_reminder",
  "templateVariables": {
    "firstName": "Emily",
    "invoiceNumber": "INV-123",
    "amount": "425.00",
    "dueDate": "Apr 15",
    "paymentLink": "wellcrafted.com/pay"
  }
}
```

7. **Reorder Reminder**
```json
{
  "templateId": "reorder_reminder",
  "templateVariables": {
    "productName": "Cabernet Sauvignon",
    "weeksAgo": "4"
  }
}
```

8. **Appointment Reminder**
```json
{
  "templateId": "appointment_reminder",
  "templateVariables": {
    "salesRep": "Alex",
    "date": "Tuesday",
    "time": "3pm",
    "purpose": "new catalog review",
    "phone": "415-555-0100"
  }
}
```

**Checklist:**
- [ ] All 8 templates render correctly
- [ ] All stay under 160 characters
- [ ] Variables are properly substituted
- [ ] Messages are delivered
- [ ] Activities are logged

---

## Part 2: Test Two-Way Conversation (30 minutes)

### Test 4: Receive Incoming SMS

**Steps:**
1. Send SMS to your Twilio number from your phone
2. Check application logs
3. Verify webhook was called
4. Check activity log in CRM

**Expected Behavior:**
- Webhook receives message
- Customer is identified by phone number
- Activity is auto-logged
- Auto-reply is sent (optional)

**Verify:**
- [ ] Webhook endpoint receives POST request
- [ ] Signature validation passes
- [ ] Customer is found by phone
- [ ] Activity is created
- [ ] Incoming message appears in CRM

### Test 5: SMS Threading

**Steps:**
1. Send SMS to customer
2. Customer replies
3. Send follow-up SMS
4. Customer replies again

**Verify:**
- [ ] All messages are logged
- [ ] Messages are threaded by customer
- [ ] Conversation history is complete
- [ ] Direction is correctly marked (inbound/outbound)

---

## Part 3: Test Opt-In/Opt-Out (30 minutes)

### Test 6: Customer Opt-Out

**Steps:**
1. Send "STOP" to your Twilio number
2. Check customer record in database
3. Try to send SMS to opted-out customer
4. Verify error is returned

**Verify:**
- [ ] `sms_opt_in` is set to `false`
- [ ] `sms_opt_out_date` is recorded
- [ ] Attempting to send returns 403 error
- [ ] Opt-out is logged as activity

**Test Keywords:**
- STOP
- STOPALL
- UNSUBSCRIBE
- CANCEL
- END
- QUIT

### Test 7: Customer Opt-In

**Steps:**
1. Send "START" to your Twilio number
2. Check customer record
3. Verify can send SMS again

**Verify:**
- [ ] `sms_opt_in` is set to `true`
- [ ] `sms_opt_in_date` is recorded
- [ ] Can send messages successfully

**Test Keywords:**
- START
- YES
- UNSTOP

---

## Part 4: Test Error Handling (30 minutes)

### Test 8: Invalid Phone Number

```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-with-invalid-phone",
    "message": "Test"
  }'
```

**Expected Result:**
```json
{
  "error": "Invalid phone number format: 1234567890. Use E.164 format (e.g., +1234567890)"
}
```

**Verify:**
- [ ] Error message is clear
- [ ] No SMS is sent
- [ ] No activity is logged
- [ ] Returns 400 status

### Test 9: Missing Phone Number

```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-without-phone",
    "message": "Test"
  }'
```

**Expected Result:**
```json
{
  "error": "Customer has no phone number"
}
```

### Test 10: Message Too Long

```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "your-customer-id",
    "message": "This is a very long message that exceeds the maximum allowed length of 1600 characters... [repeat text until > 1600 chars]"
  }'
```

**Expected Result:**
```json
{
  "error": "Message too long: 1650 characters. Maximum is 1600."
}
```

### Test 11: Twilio API Error

**Simulate:** Use invalid credentials in .env

**Expected Result:**
- Clear error message
- No crash
- Error is logged

---

## Part 5: Test Activity Logging (30 minutes)

### Test 12: Verify Auto-Logging

**Steps:**
1. Send SMS via API
2. Query activities table
3. Verify activity record

**SQL Query:**
```sql
SELECT
  a.id,
  a.subject,
  a.description,
  a.direction,
  a.status,
  a.metadata->>'messageSid' as message_sid,
  a.activity_date,
  c.name as customer_name
FROM activities a
JOIN customers c ON a.customer_id = c.id
WHERE a.activity_type_id = (
  SELECT id FROM activity_types WHERE code = 'sms'
)
ORDER BY a.activity_date DESC
LIMIT 10;
```

**Verify:**
- [ ] Activity is created
- [ ] Subject is descriptive
- [ ] Description contains message
- [ ] Direction is correct (inbound/outbound)
- [ ] Metadata contains Twilio details
- [ ] Customer is linked
- [ ] Sales rep is linked (if applicable)

### Test 13: Status Updates

**Steps:**
1. Send SMS
2. Wait for delivery
3. Check activity status updates

**Verify:**
- [ ] Initial status is "queued"
- [ ] Status updates to "sent"
- [ ] Status updates to "delivered"
- [ ] Metadata tracks status changes
- [ ] Failed messages are marked as "failed"

---

## Part 6: Test Production Scenarios (30 minutes)

### Test 14: Bulk SMS

**Send to 10+ customers:**
```bash
#!/bin/bash
for id in customer-id-1 customer-id-2 customer-id-3; do
  curl -X POST http://localhost:3000/api/sms/send \
    -H "Content-Type: application/json" \
    -d "{\"customerId\":\"$id\",\"templateId\":\"weekly_specials\",\"templateVariables\":{\"firstName\":\"Customer\",\"special\":\"20% off all wines\",\"deadline\":\"Friday\"}}"
  sleep 1
done
```

**Verify:**
- [ ] All messages send successfully
- [ ] No rate limiting issues
- [ ] All activities logged
- [ ] Twilio dashboard shows all sends

### Test 15: Webhook Security

**Test invalid signature:**
```bash
curl -X POST https://yourdomain.com/api/sms/webhooks/incoming \
  -H "X-Twilio-Signature: invalid-signature" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SM123&From=+1234567890&Body=Test"
```

**Expected Result:**
```json
{
  "error": "Invalid signature"
}
```

**Verify:**
- [ ] Returns 401 status
- [ ] Webhook is rejected
- [ ] No activity is logged
- [ ] Security is enforced

### Test 16: Character Encoding

**Test special characters:**
- Emojis: 😀🎉
- Accents: àéîôü
- Symbols: $€£¥

**Verify:**
- [ ] Characters are preserved
- [ ] Message is delivered correctly
- [ ] Character count is accurate
- [ ] No encoding errors

---

## Test Results Checklist

### SMS Sending
- [ ] Basic SMS sends successfully
- [ ] Templates render correctly
- [ ] All 8 templates work
- [ ] Character limits are enforced
- [ ] Personalization works

### Two-Way Communication
- [ ] Incoming messages are received
- [ ] Webhooks process correctly
- [ ] Conversations are threaded
- [ ] Customer lookup works

### Opt-In/Opt-Out
- [ ] STOP keywords work
- [ ] START keywords work
- [ ] Opted-out customers can't be messaged
- [ ] Opt-in/out is tracked

### Activity Logging
- [ ] All sent messages logged
- [ ] All received messages logged
- [ ] Status updates work
- [ ] Metadata is complete

### Error Handling
- [ ] Invalid numbers rejected
- [ ] Missing phones handled
- [ ] Long messages rejected
- [ ] API errors graceful

### Security
- [ ] Webhook signatures validated
- [ ] Unauthorized requests rejected
- [ ] Environment vars secure
- [ ] No credentials exposed

---

## Common Issues & Solutions

### Issue: SMS not received
**Solutions:**
- Check Twilio console logs
- Verify phone number format (E.164)
- Check trial account limitations
- Verify phone is verified (trial mode)

### Issue: Webhook not working
**Solutions:**
- Verify webhook URL is HTTPS
- Check URL is publicly accessible
- Test with ngrok for local dev
- Check Twilio console for errors

### Issue: Activity not logging
**Solutions:**
- Verify `sms` activity type exists
- Check Supabase connection
- Review application logs
- Verify database permissions

### Issue: Template variables not replacing
**Solutions:**
- Check variable names match
- Verify template ID is correct
- Check for typos in variable names
- Review template configuration

---

## Performance Benchmarks

### Expected Performance
- **Send SMS:** < 2 seconds
- **Receive webhook:** < 500ms
- **Log activity:** < 1 second
- **Template render:** < 50ms

### Twilio Limits
- **Rate limit:** 100 messages/second (enterprise)
- **Rate limit:** 1 message/second (trial)
- **Max message length:** 1600 characters
- **Concurrent requests:** Unlimited

---

## Next Steps After Testing

1. ✅ All tests passing
2. ⏭️ Add SMS button to customer detail page
3. ⏭️ Train team on SMS features
4. ⏭️ Create SMS campaign workflows
5. ⏭️ Monitor delivery rates
6. ⏭️ Optimize templates based on engagement
7. ⏭️ Upgrade to production account if needed

---

**Last Updated:** October 27, 2025
**Author:** System Architecture Designer
**Status:** Ready for Testing
