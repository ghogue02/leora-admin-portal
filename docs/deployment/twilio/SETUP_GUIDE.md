# Twilio SMS Integration Setup Guide

## Overview
This guide walks through the complete Twilio SMS integration setup for the Leora CRM system, enabling two-way SMS communication with customers.

## Timeline
- **Day:** Monday (Day 1)
- **Duration:** 3 hours
- **Priority:** HIGH

---

## Part 1: Twilio Account Setup (45 minutes)

### Step 1: Create Twilio Account

1. **Sign up for Twilio**
   - Visit: https://www.twilio.com/try-twilio
   - Click "Sign up and start building"
   - Fill in your information:
     - First and Last Name
     - Email address
     - Password
   - Click "Start your free trial"

2. **Verify Your Email**
   - Check your email inbox
   - Click the verification link from Twilio
   - Complete email verification

3. **Verify Your Phone Number**
   - Twilio will prompt you to verify a phone number
   - Enter your mobile number
   - Enter the verification code sent via SMS
   - This number will be used for testing during trial

### Step 2: Choose Account Type

**Trial Account (Free)**
- $15.50 in trial credit
- Can only send to verified phone numbers
- Perfect for development and testing
- No credit card required initially

**Production Account (Paid)**
- Unlimited sending to any number
- Requires credit card
- Pay-as-you-go pricing: ~$0.0075 per SMS
- Recommended before going live

### Step 3: Get a Phone Number

1. **Navigate to Phone Numbers**
   - Log into Twilio Console: https://console.twilio.com/
   - Click "# Phone Numbers" in left sidebar
   - Click "Buy a number"

2. **Search for a Number**
   - Select your country (e.g., United States)
   - Check "SMS" capability
   - Optional filters:
     - Local area code (e.g., 415 for San Francisco)
     - Toll-free number
     - Specific pattern
   - Click "Search"

3. **Purchase the Number**
   - Select a number from results
   - Click "Buy"
   - Confirm purchase
   - **Cost:** $1.15/month for local number
   - **Save this number** - you'll need it for configuration

### Step 4: Collect Credentials

1. **Account SID and Auth Token**
   - Go to: https://console.twilio.com/
   - Scroll to "Account Info" section
   - Copy **Account SID** (starts with "AC...")
   - Click "View" under Auth Token
   - Copy **Auth Token** (keep this secret!)

2. **Phone Number**
   - Go to: https://console.twilio.com/phone-numbers/numbers
   - Copy your purchased phone number (format: +1234567890)

3. **Create Messaging Service (Optional but Recommended)**
   - Go to: https://console.twilio.com/messaging/services
   - Click "Create Messaging Service"
   - Name: "Leora CRM SMS"
   - Use case: "Notify my users"
   - Click "Create Messaging Service"
   - Add your phone number to the service
   - Copy **Messaging Service SID** (starts with "MG...")

### Credentials Checklist
- [ ] Account SID (ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)
- [ ] Auth Token (keep secret!)
- [ ] Phone Number (+1234567890)
- [ ] Messaging Service SID (MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx) - optional

---

## Part 2: Environment Configuration (15 minutes)

### Step 1: Add Environment Variables

1. **Open your environment file:**
   ```bash
   # For local development
   nano /Users/greghogue/Leora2/web/.env.local

   # For production
   nano /Users/greghogue/Leora2/web/.env
   ```

2. **Add Twilio configuration:**
   ```env
   # Twilio SMS Configuration
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

   # Webhook Configuration
   TWILIO_WEBHOOK_BASE_URL=https://yourdomain.com
   ```

3. **Replace placeholder values:**
   - `TWILIO_ACCOUNT_SID`: Your Account SID from Twilio Console
   - `TWILIO_AUTH_TOKEN`: Your Auth Token (keep secret!)
   - `TWILIO_PHONE_NUMBER`: Your Twilio phone number with country code
   - `TWILIO_MESSAGING_SERVICE_SID`: Your Messaging Service SID (if created)
   - `TWILIO_WEBHOOK_BASE_URL`: Your production domain (for webhooks)

### Step 2: Update .env.example

Add the same variables (without real values) to `.env.example`:

```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_MESSAGING_SERVICE_SID=
TWILIO_WEBHOOK_BASE_URL=
```

### Step 3: Verify Configuration

```bash
# Test that environment variables are loaded
npm run dev

# In a separate terminal, check if variables are accessible
node -e "console.log('Twilio SID:', process.env.TWILIO_ACCOUNT_SID ? 'Configured' : 'Missing')"
```

---

## Part 3: Webhook Configuration (30 minutes)

### Understanding Webhooks

Webhooks allow Twilio to notify your application when:
- A customer replies to your SMS
- A message is delivered
- A message fails to deliver
- A customer opts out

### Step 1: Deploy Your Application

Before configuring webhooks, ensure your application is accessible via HTTPS:

**For Local Development (use ngrok):**
```bash
# Install ngrok
brew install ngrok

# Create tunnel to your local server
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

**For Production:**
- Deploy to Vercel, Railway, or your hosting provider
- Ensure SSL/HTTPS is enabled
- Note your production URL (e.g., https://leora.yourdomain.com)

### Step 2: Configure Webhook in Twilio

1. **Navigate to Messaging Configuration**
   - Go to: https://console.twilio.com/phone-numbers/numbers
   - Click on your phone number
   - Scroll to "Messaging Configuration"

2. **Set Webhook URL for Incoming Messages**
   - Under "A MESSAGE COMES IN"
   - Set to: `https://yourdomain.com/api/sales/marketing/webhooks/twilio`
   - Method: `POST`
   - Click "Save"

3. **Configure Status Callbacks (Optional)**
   - Under "Messaging Service" settings
   - Set Status Callback URL: `https://yourdomain.com/api/sales/marketing/webhooks/twilio/status`
   - Click "Save"

### Step 3: Webhook Security

Twilio signs all webhook requests. Verify signatures to prevent spoofing:

```typescript
// This is handled automatically in the webhook endpoint
// src/app/api/sales/marketing/webhooks/twilio/route.ts
```

### Step 4: Test Webhook Delivery

1. **Send a test SMS from your phone to your Twilio number**
2. **Check application logs:**
   ```bash
   # View Next.js logs
   npm run dev

   # You should see:
   # "Received Twilio webhook: [message details]"
   ```

3. **Verify in Twilio Console:**
   - Go to: https://console.twilio.com/monitor/logs/sms
   - Check recent message logs
   - Look for webhook delivery status
   - Debug any errors

### Webhook Testing Checklist
- [ ] Webhook URL is HTTPS
- [ ] Webhook endpoint is accessible
- [ ] Signature validation is working
- [ ] Incoming messages are logged
- [ ] Status callbacks are received
- [ ] Error handling is in place

---

## Part 4: Testing (Next Steps)

After completing setup:

1. **Test SMS Sending**
   - Navigate to a customer in CRM
   - Click "Send SMS"
   - Verify delivery

2. **Test Two-Way Conversation**
   - Reply to SMS from your phone
   - Verify reply appears in CRM

3. **Test Templates**
   - Use pre-built templates
   - Verify personalization works

See `TESTING_GUIDE.md` for detailed testing procedures.

---

## Troubleshooting

### Common Issues

**1. "Authentication Error" when sending SMS**
- Check Account SID and Auth Token are correct
- Ensure no extra spaces in environment variables
- Verify Auth Token hasn't expired

**2. "Invalid Phone Number" error**
- Use E.164 format: +1234567890
- Include country code
- No spaces, dashes, or parentheses

**3. Webhooks not receiving messages**
- Verify webhook URL is HTTPS
- Check webhook URL is publicly accessible
- Test with ngrok for local development
- Check Twilio logs for delivery errors

**4. Trial account limitations**
- Can only send to verified numbers
- Add recipient numbers in Twilio Console:
  - Go to: https://console.twilio.com/phone-numbers/verified
  - Click "Add a new number"
  - Verify via SMS

### Support Resources

- **Twilio Docs:** https://www.twilio.com/docs/sms
- **API Reference:** https://www.twilio.com/docs/sms/api
- **Support:** https://support.twilio.com/
- **Status Page:** https://status.twilio.com/

---

## Cost Estimates

### Development (Trial Account)
- **Setup:** Free
- **Phone Number:** $1.15/month
- **SMS:** $0.0075 per message (covered by trial credit)
- **Trial Credit:** $15.50

### Production (Paid Account)
- **Phone Number:** $1.15/month per number
- **SMS (USA):** $0.0075 per message sent
- **SMS (Canada):** $0.0075 per message sent
- **SMS (International):** Varies by country

### Example Monthly Costs
- **100 SMS/month:** $0.75 + $1.15 = $1.90/month
- **1,000 SMS/month:** $7.50 + $1.15 = $8.65/month
- **10,000 SMS/month:** $75 + $1.15 = $76.15/month

---

## Compliance & Best Practices

### SMS Compliance (USA)
1. **Opt-In Required:** Customers must opt-in to receive messages
2. **Opt-Out Handling:** Honor STOP, UNSUBSCRIBE, QUIT requests
3. **Frequency Disclosure:** Tell customers how often you'll message
4. **Business Hours:** Send during reasonable hours (8am-9pm)

### TCPA Compliance
- Get written consent before sending marketing SMS
- Keep consent records for 4 years
- Implement opt-out mechanism
- Honor Do Not Call lists

### Best Practices
1. Keep messages under 160 characters
2. Include your business name
3. Provide clear opt-out instructions
4. Don't send too frequently
5. Personalize messages when possible
6. Track delivery and engagement

---

## Next Steps

After completing this setup:

1. ✅ Twilio account created and configured
2. ✅ Environment variables set
3. ✅ Webhooks configured
4. ⏭️ Test SMS sending (see TESTING_GUIDE.md)
5. ⏭️ Create SMS templates (see TEMPLATES.md)
6. ⏭️ Enable activity logging
7. ⏭️ Go to production

---

## Quick Reference

### Twilio Console URLs
- **Dashboard:** https://console.twilio.com/
- **Phone Numbers:** https://console.twilio.com/phone-numbers/numbers
- **Messaging Services:** https://console.twilio.com/messaging/services
- **SMS Logs:** https://console.twilio.com/monitor/logs/sms
- **API Credentials:** https://console.twilio.com/project/settings

### Environment Variables
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_secret_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WEBHOOK_BASE_URL=https://yourdomain.com
```

### Webhook Endpoints
- **Incoming SMS:** `/api/sales/marketing/webhooks/twilio`
- **Status Callbacks:** `/api/sales/marketing/webhooks/twilio/status`

---

**Last Updated:** October 27, 2025
**Author:** System Architecture Designer
**Status:** Ready for Implementation
