# Marketing System - Environment Variable Template

Copy these variables to your `.env` file and fill in the values.

```env
# ============================================================
# MARKETING & COMMUNICATIONS SYSTEM
# Phase 3 Implementation
# ============================================================

# ------------------------------------------------------------
# Email Configuration
# ------------------------------------------------------------

# Choose your email provider: 'sendgrid', 'resend', 'ses', or leave blank for dev mode
EMAIL_PROVIDER=sendgrid

# Sender email address (must be verified with your provider)
FROM_EMAIL=noreply@yourdomain.com

# ------------------------------------------------------------
# SendGrid Configuration (if EMAIL_PROVIDER=sendgrid)
# ------------------------------------------------------------

# Get from: https://app.sendgrid.com/settings/api_keys
# Format: SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_API_KEY=

# ------------------------------------------------------------
# Resend Configuration (if EMAIL_PROVIDER=resend)
# ------------------------------------------------------------

# Get from: https://resend.com/api-keys
# Format: re_xxxxxxxxxxxxxxxxxxxx
RESEND_API_KEY=

# ------------------------------------------------------------
# AWS SES Configuration (if EMAIL_PROVIDER=ses)
# ------------------------------------------------------------

# AWS Region (e.g., us-east-1, us-west-2, eu-west-1)
AWS_REGION=us-east-1

# IAM User Access Key
AWS_ACCESS_KEY_ID=

# IAM User Secret Key
AWS_SECRET_ACCESS_KEY=

# ------------------------------------------------------------
# Twilio SMS Configuration (Optional)
# ------------------------------------------------------------

# Get from: https://console.twilio.com/
# Format: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_ACCOUNT_SID=

# Auth token from Twilio console
# Format: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=

# Your Twilio phone number (must include country code)
# Format: +12345678900
TWILIO_PHONE_NUMBER=

# ------------------------------------------------------------
# Mailchimp Configuration (Optional)
# ------------------------------------------------------------

# Note: Mailchimp is connected via UI, not environment variables
# API key format: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us19
# Get from: Account > Extras > API Keys

# ------------------------------------------------------------
# Webhook URLs (Production Only)
# ------------------------------------------------------------

# Your production domain for webhooks
# Used for Twilio SMS webhook configuration
PRODUCTION_URL=https://yourdomain.com

# ------------------------------------------------------------
# Development/Testing Settings
# ------------------------------------------------------------

# Set to 'true' to enable detailed logging
DEBUG_MARKETING=false

# Set to 'true' to prevent actual sending (testing mode)
DRY_RUN_MODE=false

# Set to 'true' to enable webhook signature verification
VERIFY_WEBHOOKS=true

# ------------------------------------------------------------
# Rate Limiting (Optional)
# ------------------------------------------------------------

# Maximum emails per hour (to prevent spam/abuse)
MAX_EMAILS_PER_HOUR=1000

# Maximum SMS per hour
MAX_SMS_PER_HOUR=500

# Maximum API calls per minute
MAX_API_CALLS_PER_MINUTE=60

# ------------------------------------------------------------
# Feature Flags (Optional)
# ------------------------------------------------------------

# Enable/disable specific features
ENABLE_EMAIL=true
ENABLE_SMS=true
ENABLE_MAILCHIMP=true
ENABLE_SMART_LISTS=true
ENABLE_AUTO_LOGGING=true

# ------------------------------------------------------------
# Advanced Settings (Optional)
# ------------------------------------------------------------

# Email batch size for bulk sends
EMAIL_BATCH_SIZE=100

# Delay between batches (milliseconds)
EMAIL_BATCH_DELAY=1000

# Smart list auto-refresh interval (cron format)
# Examples:
#   0 0 * * * = Daily at midnight
#   0 */6 * * * = Every 6 hours
#   0 0 * * 0 = Weekly on Sunday
SMART_LIST_REFRESH_CRON=0 0 * * *

# Email tracking pixel domain (if using custom domain)
TRACKING_DOMAIN=

# Link click tracking enabled
ENABLE_CLICK_TRACKING=true

# Email open tracking enabled
ENABLE_OPEN_TRACKING=true

# ------------------------------------------------------------
# Security Settings
# ------------------------------------------------------------

# Webhook signature secrets (auto-generated, don't change)
TWILIO_WEBHOOK_SECRET=

# API rate limit window (seconds)
RATE_LIMIT_WINDOW=60

# Maximum failed attempts before blocking
MAX_FAILED_ATTEMPTS=5

# ------------------------------------------------------------
# Monitoring & Alerts (Optional)
# ------------------------------------------------------------

# Send alerts when daily email limit reached
ALERT_EMAIL=admin@yourdomain.com

# Webhook for error notifications (e.g., Slack)
ERROR_WEBHOOK_URL=

# Log level: 'debug', 'info', 'warn', 'error'
LOG_LEVEL=info

# ------------------------------------------------------------
# Compliance Settings
# ------------------------------------------------------------

# Company name for email footers
COMPANY_NAME=Your Company Name

# Company address for CAN-SPAM compliance
COMPANY_ADDRESS=123 Main St, City, State 12345

# Privacy policy URL
PRIVACY_POLICY_URL=https://yourdomain.com/privacy

# Terms of service URL
TERMS_URL=https://yourdomain.com/terms

# Unsubscribe page URL (optional, auto-generated if blank)
UNSUBSCRIBE_URL=

# ------------------------------------------------------------
# NOTES
# ------------------------------------------------------------
#
# Required for basic email:
#   - EMAIL_PROVIDER
#   - FROM_EMAIL
#   - Provider API key (SendGrid, Resend, or AWS)
#
# Required for SMS:
#   - TWILIO_ACCOUNT_SID
#   - TWILIO_AUTH_TOKEN
#   - TWILIO_PHONE_NUMBER
#
# Optional but recommended:
#   - PRODUCTION_URL (for webhooks)
#   - ALERT_EMAIL (for notifications)
#   - COMPANY_NAME (for compliance)
#
# Development mode:
#   - Leave EMAIL_PROVIDER blank to run in dev mode
#   - Set DRY_RUN_MODE=true to test without sending
#
# ============================================================
```

## Quick Setup Scenarios

### Scenario 1: SendGrid Only (Simplest)
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_key_here
FROM_EMAIL=noreply@yourdomain.com
```

### Scenario 2: SendGrid + Twilio (Most Common)
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_key_here
FROM_EMAIL=noreply@yourdomain.com

TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxx
TWILIO_PHONE_NUMBER=+12345678900
```

### Scenario 3: Full Setup (All Features)
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_key_here
FROM_EMAIL=noreply@yourdomain.com

TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxx
TWILIO_PHONE_NUMBER=+12345678900

PRODUCTION_URL=https://yourdomain.com
COMPANY_NAME=Your Company
ALERT_EMAIL=admin@yourdomain.com
```

### Scenario 4: Development/Testing
```env
# Leave email provider blank for dev mode
# EMAIL_PROVIDER=

# Or use dry run mode
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_key_here
FROM_EMAIL=noreply@yourdomain.com
DRY_RUN_MODE=true
DEBUG_MARKETING=true
```

## Verification Steps

After setting up, verify each service:

### Email
```bash
curl -X POST http://localhost:3000/api/sales/marketing/email/send \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
```

### SMS
```bash
curl -X POST http://localhost:3000/api/sales/marketing/sms/send \
  -H "Content-Type: application/json" \
  -d '{"to":"+1234567890","body":"Test SMS"}'
```

### Mailchimp
1. Navigate to `/sales/marketing/settings`
2. Enter API key
3. Click "Connect"
4. Should see "Connected successfully"

## Security Checklist

Before deploying to production:

- [ ] All API keys are in `.env`, not in code
- [ ] `.env` is in `.gitignore`
- [ ] Production environment variables are set on server
- [ ] Webhook URLs use HTTPS
- [ ] Rate limiting is enabled
- [ ] Error monitoring is configured
- [ ] Backup admin email is set

## Getting API Keys

### SendGrid
1. Visit: https://app.sendgrid.com/settings/api_keys
2. Click "Create API Key"
3. Select "Full Access"
4. Copy key immediately (won't show again)

### Resend
1. Visit: https://resend.com/api-keys
2. Click "Create API Key"
3. Copy key

### Twilio
1. Visit: https://console.twilio.com/
2. Find Account SID and Auth Token on dashboard
3. Buy a phone number if you don't have one

### Mailchimp
1. Visit: https://admin.mailchimp.com/account/api/
2. Click "Create A Key"
3. Copy key (format: xxxxx-us19)

---

**Last Updated:** 2025-10-26
