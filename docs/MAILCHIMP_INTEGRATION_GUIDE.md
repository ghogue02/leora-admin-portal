# Mailchimp Integration Guide

## Overview

Leora integrates seamlessly with Mailchimp to sync customers, create targeted segments, and send personalized email campaigns featuring your wine products. This guide covers setup, usage, and best practices.

## Features

- **Auto Customer Sync**: Sync customers to Mailchimp lists automatically
- **Segment Creation**: Create segments based on customer status (ACTIVE, PROSPECT, TARGET)
- **Campaign Builder**: Design and send product-focused email campaigns
- **Tag Management**: Organize customers with tags (VIP, Wine Club, etc.)
- **Opt-Out Handling**: Respect unsubscribe preferences and GDPR compliance
- **Analytics Integration**: Track opens, clicks, and conversions

## Mailchimp Account Setup

### Prerequisites

- Active Mailchimp account (Free or paid tier)
- Admin access to Mailchimp account
- API key generation permissions

### Create Mailchimp API Key

1. **Login to Mailchimp**
   - Go to mailchimp.com
   - Sign in with your account

2. **Navigate to API Keys**
   - Click your profile icon (top right)
   - Select "Account & Billing"
   - Click "Extras" dropdown
   - Select "API keys"

3. **Generate New Key**
   - Click "Create A Key" button
   - Copy API key immediately (shown once)
   - Paste into secure location
   - Note your server prefix (e.g., "us1", "us14")

4. **Server Prefix**
   - Found in API key or Mailchimp URL
   - Example: `https://us1.admin.mailchimp.com` = "us1"
   - Required for API configuration

### Create Mailchimp Audience (List)

1. **Navigate to Audience**
   - Click "Audience" in top menu
   - Select "All contacts"

2. **Create New List**
   - Click "Create Audience" button
   - Or use existing list

3. **Configure List Details**
   - **Name**: "Leora Customers"
   - **From email**: your-sales@company.com
   - **From name**: Your Company Name
   - **Remind contacts**: How they signed up
   - **Contact info**: Your business address

4. **Note List ID**
   - Click "Settings" for your audience
   - Copy "Audience ID" (10-character code)
   - Save for Leora configuration

## API Key Configuration in Leora

### Environment Variables

Add to `.env.local`:

```bash
# Mailchimp Configuration
MAILCHIMP_API_KEY=your-api-key-here-abcd1234
MAILCHIMP_SERVER_PREFIX=us1
MAILCHIMP_LIST_ID=abc123xyz0

# Optional: Default campaign settings
MAILCHIMP_FROM_NAME=Wine Sales Team
MAILCHIMP_FROM_EMAIL=sales@yourcompany.com
MAILCHIMP_REPLY_TO=sales@yourcompany.com
```

### Verify Configuration

1. **Navigate to Settings**
   - Click "Settings" in Leora
   - Select "Integrations"
   - Find "Mailchimp" section

2. **Test Connection**
   - Click "Test Connection" button
   - Should show "✓ Connected"
   - Displays list name and subscriber count

3. **Troubleshooting Connection**
   - Invalid API key: Check for typos
   - Wrong server: Verify prefix matches
   - List not found: Check list ID
   - Permission error: Ensure admin access

## Customer Sync Process

### Automatic Sync

Customers sync to Mailchimp automatically when:

1. **New Customer Created**: Syncs within 5 minutes
2. **Customer Updated**: Syncs changed fields
3. **Status Changed**: Updates tags (ACTIVE, PROSPECT, etc.)
4. **Daily Batch**: Full sync at 2 AM daily

### Manual Sync

Trigger manual sync anytime:

1. **Navigate to Marketing**
   - Click "Marketing" in sidebar
   - Select "Mailchimp Sync"

2. **Choose Sync Option**
   - **Sync All**: All customers (~1 min per 100)
   - **Sync New**: Only customers not in Mailchimp
   - **Sync Updated**: Only changed since last sync
   - **Sync Segment**: Only ACTIVE, PROSPECT, or TARGET

3. **Monitor Progress**
   - Progress bar shows sync status
   - Displays: Synced, Failed, Skipped counts
   - Estimated time remaining

4. **Review Results**
   - Success count
   - Error details (if any)
   - Last sync timestamp updated

### What Gets Synced

**Customer Fields Mapped to Mailchimp**

| Leora Field | Mailchimp Field | Merge Tag |
|-------------|-----------------|-----------|
| email | Email Address | EMAIL |
| first_name | First Name | FNAME |
| last_name | Last Name | LNAME |
| company | Company | COMPANY |
| phone | Phone | PHONE |
| address | Address | ADDRESS |
| status | Tag | - |
| customer_type | Tag | - |

**Tags Applied**

- Customer status: ACTIVE, PROSPECT, TARGET, INACTIVE
- Customer type: RESTAURANT, BAR, RETAIL, DISTRIBUTOR
- Custom tags: VIP, WINE_CLUB, BULK_BUYER

## Segment Creation

### Create Customer Segments

Segments allow targeted campaigns:

1. **Navigate to Segments**
   - Marketing > Mailchimp > Segments
   - Click "Create Segment"

2. **Choose Segment Type**

   **By Status:**
   - Active Customers (ACTIVE tag)
   - Prospects (PROSPECT tag)
   - Target Accounts (TARGET tag)

   **By Type:**
   - Restaurants Only
   - Bars Only
   - Retail Stores

   **By Geography:**
   - San Francisco customers
   - Bay Area (50-mile radius)
   - California statewide

   **By Behavior:**
   - Ordered last 30 days
   - High-value customers (>$10k)
   - Wine club members

3. **Configure Segment**
   - Name: "Active SF Restaurants"
   - Conditions: Status=ACTIVE, Type=RESTAURANT, City=SF
   - Preview: Shows estimated count

4. **Save to Mailchimp**
   - Segment syncs to Mailchimp
   - Auto-updates as customers change
   - Available for campaigns

### Pre-Built Segments

Use these common segments:

- **New Customers**: Created last 30 days
- **VIP Accounts**: Lifetime value >$50k
- **At Risk**: No order in 90 days
- **Wine Club**: Tagged WINE_CLUB
- **Bulk Buyers**: Orders >100 units/month

## Campaign Creation and Sending

### Build Email Campaign

1. **Navigate to Campaigns**
   - Marketing > Mailchimp > Campaigns
   - Click "Create Campaign"

2. **Choose Campaign Type**
   - **Product Showcase**: Feature 3-5 wines
   - **New Arrivals**: Highlight new inventory
   - **Special Offer**: Discount or promotion
   - **Newsletter**: Monthly updates
   - **Event Invitation**: Tasting events

3. **Select Recipients**
   - Choose segment (e.g., "Active Customers")
   - Preview recipient count
   - Exclude unsubscribers (automatic)

4. **Configure Settings**

   ```
   Subject Line: "New Premium Wines This Week"
   Preview Text: "3 exclusive selections just arrived"
   From Name: "Wine Sales Team"
   From Email: sales@yourcompany.com
   Reply-To: sales@yourcompany.com
   ```

5. **Select Products**
   - Search Leora inventory
   - Select 3-5 featured products
   - Add product images
   - Include pricing (optional)
   - Add "Order Now" buttons

6. **Design Email**

   **Product Showcase Template:**
   ```
   [Hero Image]

   Headline: New Arrivals This Week

   [Product 1 Image]
   Chardonnay 2022 - Napa Valley
   $24.99 per bottle
   [Order Now Button]

   [Product 2 Image]
   Pinot Noir 2021 - Russian River
   $32.99 per bottle
   [Order Now Button]

   [Product 3 Image]
   Cabernet Sauvignon 2020 - Sonoma
   $45.99 per bottle
   [Order Now Button]

   [Footer: Unsubscribe | Preferences]
   ```

7. **Preview and Test**
   - Preview in desktop/mobile
   - Send test email to yourself
   - Check all links work
   - Verify product images load

8. **Send or Schedule**
   - **Send Now**: Sends immediately
   - **Schedule**: Choose date/time
   - Best times: Tue-Thu, 10 AM - 2 PM

### Campaign Best Practices

**Subject Lines**
- Keep under 50 characters
- Create urgency: "Limited Stock"
- Personalize: "John, new wines for you"
- A/B test variations

**Content**
- Lead with best product
- Limit to 3-5 products max
- Include clear CTAs
- Mobile-friendly design
- Unsubscribe link required

**Timing**
- **Best Days**: Tuesday, Wednesday, Thursday
- **Best Times**: 10 AM, 11 AM, 1 PM, 2 PM
- **Avoid**: Mondays, Fridays, weekends
- **Frequency**: Max 1-2 per week

**Segmentation**
- Don't blast entire list
- Target specific segments
- Personalize product selection
- Test different segments

## Tag Management

### Apply Tags to Customers

Tags organize and segment customers:

1. **Individual Tagging**
   - Open customer profile
   - Click "Manage Tags"
   - Add/remove tags
   - Syncs to Mailchimp

2. **Bulk Tagging**
   - Select multiple customers
   - Click "Bulk Actions"
   - Choose "Add Tags"
   - Enter tag names

### Common Tags

**Status Tags** (Auto-Applied)
- ACTIVE: Current customers
- PROSPECT: Potential customers
- TARGET: Priority prospects
- INACTIVE: No recent activity

**Type Tags** (Auto-Applied)
- RESTAURANT
- BAR
- RETAIL
- DISTRIBUTOR
- WINE_CLUB

**Custom Tags** (Manual)
- VIP: High-value accounts
- BULK_BUYER: Large orders
- SEASONAL: Holiday-only
- TASTING_ATTENDEE: Event participation
- PREFERRED_VENDOR: Exclusive partnership

### Remove Tags

1. Customer profile > Manage Tags
2. Click "X" next to tag
3. Confirms removal
4. Syncs to Mailchimp

## Opt-Out Handling

### Respect Unsubscribe Requests

Leora automatically syncs opt-outs:

1. **Customer Unsubscribes in Email**
   - Mailchimp marks as unsubscribed
   - Syncs back to Leora (hourly)
   - Customer.email_opt_out = true
   - Excluded from future campaigns

2. **Customer Opts Out in Leora**
   - Admin updates customer profile
   - Check "Opted out of emails"
   - Syncs to Mailchimp
   - Unsubscribed in Mailchimp

3. **Verify Opt-Out Status**
   - Customer profile shows "📧 Opted Out"
   - Marketing tab shows "Unsubscribed"
   - Cannot add to campaigns

### Re-Subscribe Process

If customer wants to re-subscribe:

1. **Confirm Permission**
   - Get explicit consent
   - Document opt-in (email/phone)
   - Note date and method

2. **Update Leora**
   - Customer profile > Edit
   - Uncheck "Opted out of emails"
   - Save changes

3. **Resubscribe in Mailchimp**
   - Syncs automatically
   - Status changes to "Subscribed"
   - Can receive campaigns again

## GDPR Compliance

### Right to Access

Customers can request their data:

1. Customer emails data request
2. Admin exports customer record
3. Include: Profile, orders, emails sent
4. Provide within 30 days

### Right to Deletion

Honor "right to be forgotten":

1. **Delete from Leora**
   - Customer profile > Delete
   - Confirm permanent deletion

2. **Delete from Mailchimp**
   - Automatically deleted (via sync)
   - Or manually: Audience > Delete permanently

3. **Retention Policy**
   - Email history: Kept 1 year
   - Campaign stats: Aggregate only
   - Personal data: Deleted completely

### Consent Management

Track email consent:

1. **Record Consent**
   - Customer.consent_date
   - Customer.consent_method (web, email, phone)
   - Customer.consent_ip_address

2. **Consent Types**
   - Marketing emails: Yes/No
   - Product updates: Yes/No
   - Event invitations: Yes/No

3. **Update Preferences**
   - Customer can manage in profile
   - Preference center link in emails
   - Granular control by email type

## Troubleshooting Sync Issues

### Sync Fails

**Error: "Invalid API Key"**
- Verify API key in .env.local
- Check for extra spaces
- Regenerate key if needed

**Error: "List Not Found"**
- Verify list ID correct
- Ensure list not deleted
- Check list permissions

**Error: "Member Exists"**
- Customer already in Mailchimp
- System updates instead of creates
- Check for duplicate emails

### Partial Sync Success

If some customers fail:

1. **Review Error Log**
   - Marketing > Sync > View Errors
   - Shows failed customer emails
   - Displays error reason

2. **Common Failures**
   - Invalid email format
   - Duplicate in list
   - Missing required field
   - Mailchimp rate limit

3. **Retry Failed**
   - Click "Retry Failed" button
   - Processes errors only
   - Fixed issues sync successfully

### Rate Limiting

Mailchimp limits API calls:

- **Free Tier**: 10 calls/second
- **Paid Tier**: 20 calls/second
- **Batch Endpoint**: 500 operations

**If Rate Limited:**
1. Sync pauses automatically
2. Resumes after cooldown
3. Use batch sync for 100+ customers
4. Avoid multiple simultaneous syncs

## Performance Optimization

### Sync Speed

Expected sync times:

- **10 customers**: ~3 seconds
- **100 customers**: ~20 seconds (batch)
- **1,000 customers**: ~3 minutes (batch)
- **10,000 customers**: ~30 minutes (batched)

### Best Practices

1. **Use Batch Sync**
   - For 100+ customers
   - 10x faster than individual
   - Reduces API calls

2. **Schedule Off-Peak**
   - Run large syncs at night
   - Avoid during business hours
   - Monitor completion

3. **Incremental Sync**
   - Sync only changed customers
   - Use "Sync Updated" option
   - Faster than full sync

4. **Cache List Data**
   - Cache list info 1 hour
   - Reduces API calls
   - Faster UI responses

## Monitoring and Analytics

### Sync Dashboard

View sync statistics:

- **Last Sync**: Timestamp of last run
- **Total Synced**: Customers in Mailchimp
- **Success Rate**: Percentage successful
- **Avg Sync Time**: Per customer
- **API Usage**: Calls today/limit

### Campaign Analytics

Track email performance:

1. **Navigate to Campaign Stats**
   - Marketing > Campaigns
   - Click campaign name
   - View analytics

2. **Key Metrics**
   - **Sent**: Total emails sent
   - **Delivered**: Successfully delivered
   - **Opens**: Unique opens (%)
   - **Clicks**: Unique clicks (%)
   - **Unsubscribes**: Opt-out count
   - **Bounces**: Invalid emails

3. **Product Click Tracking**
   - Which products clicked most
   - Click-through by segment
   - Conversion to orders

4. **Revenue Attribution**
   - Orders from campaign
   - Total revenue generated
   - ROI calculation

### Segment Performance

Compare segment engagement:

| Segment | Size | Open Rate | Click Rate | Conv Rate |
|---------|------|-----------|------------|-----------|
| Active Customers | 523 | 45% | 12% | 8% |
| Prospects | 187 | 28% | 6% | 2% |
| VIP Accounts | 42 | 67% | 25% | 18% |

Insights:
- VIP segment performs best
- Focus premium products on VIPs
- Nurture prospects differently

## Advanced Features

### Automation Workflows

Set up automated campaigns:

1. **Welcome Series**
   - New customer added
   - Send welcome email day 1
   - Product catalog day 3
   - Special offer day 7

2. **Re-Engagement**
   - No order in 90 days
   - Send "We miss you" email
   - Include 10% discount code

3. **Birthday Campaign**
   - Customer birthday approaching
   - Send 7 days before
   - Include special gift/discount

### A/B Testing

Test campaign variations:

1. **Subject Line Test**
   - Variant A: "New Wines This Week"
   - Variant B: "Limited: Premium Wines Just Arrived"
   - Send to 10% sample each
   - Winner to remaining 80%

2. **Content Test**
   - Variant A: 3 products
   - Variant B: 5 products
   - Measure click rates

3. **Send Time Test**
   - Variant A: 10 AM Tuesday
   - Variant B: 1 PM Thursday
   - Compare open rates

### API Integration

Programmatic access:

```javascript
// Sync customer
POST /api/mailchimp/sync
Body: { customerIds: ['cust_123', 'cust_456'] }

// Create campaign
POST /api/mailchimp/campaigns
Body: {
  subject: 'New Arrivals',
  segmentId: 'seg_789',
  productIds: ['prod_1', 'prod_2', 'prod_3']
}

// Send campaign
POST /api/mailchimp/campaigns/{campaignId}/send

// Get stats
GET /api/mailchimp/campaigns/{campaignId}/stats
```

## Support Resources

### Mailchimp Documentation

- [API Reference](https://mailchimp.com/developer/marketing/api/)
- [Merge Tags Guide](https://mailchimp.com/help/merge-tags/)
- [Segment Documentation](https://mailchimp.com/help/save-and-manage-segments/)

### Leora Support

- **Email**: support@leora.app
- **Chat**: Click chat icon in app
- **Phone**: 1-800-LEORA-AI

### Community

- [Leora Community Forum](https://community.leora.app)
- [Best Practices Blog](https://blog.leora.app)
- [Video Tutorials](https://youtube.com/leora-app)

---

**Version**: 6.0.0
**Last Updated**: January 2025
**Feedback**: product@leora.app
