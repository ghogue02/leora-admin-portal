# Phase 7 Manual Test Checklist

## Pre-Testing Setup

- [ ] **Environment Variables Set**
  - [ ] ANTHROPIC_API_KEY configured
  - [ ] MAILCHIMP_API_KEY configured
  - [ ] MAILCHIMP_SERVER_PREFIX set
  - [ ] MAILCHIMP_LIST_ID set
  - [ ] Supabase credentials configured

- [ ] **Database Migration**
  - [ ] Prisma migrations applied
  - [ ] ImageScan table exists
  - [ ] MailchimpSync table exists
  - [ ] Enums created (ScanType, ScanStatus, SyncStatus)

- [ ] **Supabase Storage**
  - [ ] `scanned-images` bucket created
  - [ ] Public read access enabled
  - [ ] File upload permissions verified

- [ ] **Test Data**
  - [ ] At least 10 test customers in database
  - [ ] Mix of ACTIVE, PROSPECT, TARGET statuses
  - [ ] Valid email addresses for Mailchimp sync
  - [ ] Sample business cards prepared (physical or images)

## Image Scanning Tests

### Business Card Scanning (Mobile - iPhone)

- [ ] **1. Navigate to Scan Page**
  - [ ] Open Leora app in Safari
  - [ ] Click "Scan Business Card" in menu
  - [ ] Page loads without errors

- [ ] **2. Grant Camera Permission**
  - [ ] Click "Open Camera" button
  - [ ] Safari prompts for camera access
  - [ ] Tap "Allow"
  - [ ] Camera preview appears

- [ ] **3. Position and Capture Card**
  - [ ] Place business card on flat surface
  - [ ] Position phone 8-12 inches above
  - [ ] Card fills 70-80% of frame
  - [ ] Tap to focus on text
  - [ ] Tap capture button
  - [ ] Photo preview appears

- [ ] **4. Review Captured Photo**
  - [ ] Photo is sharp and readable
  - [ ] All text visible
  - [ ] No glare or shadows
  - [ ] Tap "Confirm" to proceed
  - [ ] OR tap "Retake" if needed

- [ ] **5. Wait for AI Extraction**
  - [ ] Upload progress shows (1-3 seconds)
  - [ ] "Analyzing with AI..." message appears
  - [ ] Extraction completes within 10 seconds
  - [ ] "Extraction Complete" notification

- [ ] **6. Review Extracted Data**
  - [ ] Name field populated correctly
  - [ ] Email field populated correctly
  - [ ] Phone field populated correctly
  - [ ] Company field populated correctly
  - [ ] Title field populated (if on card)
  - [ ] Address field populated (if on card)

- [ ] **7. Edit If Needed**
  - [ ] Click on any field to edit
  - [ ] Correct any mistakes
  - [ ] All edits save properly

- [ ] **8. Create Customer**
  - [ ] Click "Create Customer" button
  - [ ] Customer created successfully
  - [ ] Redirected to customer profile
  - [ ] Scanned image attached to customer
  - [ ] All data appears on profile

### Business Card Scanning (Mobile - Android)

- [ ] **Repeat all iPhone steps above on Android device**
- [ ] **Test Chrome browser**
- [ ] **Test Samsung Internet browser (if available)**

### Business Card Scanning (Desktop)

- [ ] **1. Navigate to Scan Page**
  - [ ] Open Leora in Chrome/Safari/Firefox
  - [ ] Click "Scan Business Card"

- [ ] **2. Upload Image**
  - [ ] Click "Upload Image" button
  - [ ] Select business card image from computer
  - [ ] Supported formats: JPG, PNG, WEBP
  - [ ] Upload progress shows

- [ ] **3. Wait for Extraction**
  - [ ] Processing indicator appears
  - [ ] Extraction completes within 10 seconds

- [ ] **4. Review and Create**
  - [ ] Same as steps 6-8 above

### Liquor License Scanning

- [ ] **1. Scan California License**
  - [ ] Navigate to "Scan License"
  - [ ] Capture license photo
  - [ ] License number extracted correctly
  - [ ] Business name extracted
  - [ ] License type identified
  - [ ] Expiration date parsed correctly

- [ ] **2. Scan New York License**
  - [ ] Repeat above for NY license
  - [ ] Verify state-specific format handling

- [ ] **3. Attach to Customer**
  - [ ] Open customer profile
  - [ ] Click "Scan License"
  - [ ] Capture license
  - [ ] License attached to customer record
  - [ ] Expiration date triggers alert (if near)

### Error Handling

- [ ] **Poor Quality Image**
  - [ ] Upload blurry image
  - [ ] System shows quality warning
  - [ ] Extraction may fail or have low confidence
  - [ ] Retake option available

- [ ] **Invalid File Type**
  - [ ] Try uploading .txt file
  - [ ] Error message: "Invalid file type"
  - [ ] Upload blocked

- [ ] **File Too Large**
  - [ ] Upload 15MB image
  - [ ] Error message: "File too large (max 10MB)"
  - [ ] Upload blocked

- [ ] **API Error**
  - [ ] (Temporarily disable API key)
  - [ ] Attempt scan
  - [ ] Error message: "Unable to process scan"
  - [ ] Retry option available
  - [ ] Manual entry option available

- [ ] **Network Error**
  - [ ] Disable WiFi during upload
  - [ ] Error message appears
  - [ ] Retry option works when network restored

## Mailchimp Integration Tests

### Mailchimp Connection

- [ ] **1. Verify Configuration**
  - [ ] Navigate to Settings > Integrations
  - [ ] Find Mailchimp section
  - [ ] Click "Test Connection"
  - [ ] Shows "✓ Connected"
  - [ ] Displays list name and subscriber count

- [ ] **2. Test Invalid API Key**
  - [ ] Enter invalid API key
  - [ ] Click "Test Connection"
  - [ ] Error message: "Invalid API key"
  - [ ] Connection status: Disconnected

### Customer Sync

- [ ] **1. Sync Single Customer**
  - [ ] Open customer profile
  - [ ] Click "Sync to Mailchimp"
  - [ ] Sync completes within 3 seconds
  - [ ] Success message appears
  - [ ] Customer exists in Mailchimp (verify in Mailchimp dashboard)

- [ ] **2. Batch Sync (100 Customers)**
  - [ ] Navigate to Marketing > Mailchimp Sync
  - [ ] Click "Sync All Customers"
  - [ ] Progress bar appears
  - [ ] Shows: Syncing 100 customers
  - [ ] Completes within 30 seconds
  - [ ] Shows: 100 synced, 0 failed

- [ ] **3. Sync with Errors**
  - [ ] Create customer with invalid email (test@)
  - [ ] Attempt sync
  - [ ] Error log shows: "Invalid email format"
  - [ ] Other customers sync successfully
  - [ ] Failed count incremented

- [ ] **4. Tag Application**
  - [ ] Sync ACTIVE customer
  - [ ] Verify in Mailchimp: Has "ACTIVE" tag
  - [ ] Sync PROSPECT customer
  - [ ] Verify in Mailchimp: Has "PROSPECT" tag

### Segment Creation

- [ ] **1. Create Status Segment**
  - [ ] Navigate to Marketing > Segments
  - [ ] Click "Create Segment"
  - [ ] Name: "Active Customers"
  - [ ] Condition: Status = ACTIVE
  - [ ] Preview shows correct count
  - [ ] Click "Create in Mailchimp"
  - [ ] Segment created successfully
  - [ ] Verify in Mailchimp dashboard

- [ ] **2. Create Geographic Segment**
  - [ ] Create segment: "San Francisco Customers"
  - [ ] Condition: City = "San Francisco"
  - [ ] Segment created
  - [ ] Member count matches

- [ ] **3. Create Complex Segment**
  - [ ] Name: "High-Value SF Restaurants"
  - [ ] Conditions:
    - [ ] Status = ACTIVE
    - [ ] Type = RESTAURANT
    - [ ] City = San Francisco
    - [ ] Lifetime value > $10,000
  - [ ] Preview count accurate
  - [ ] Segment created

### Campaign Creation

- [ ] **1. Create Product Showcase Campaign**
  - [ ] Navigate to Marketing > Campaigns
  - [ ] Click "Create Campaign"
  - [ ] Select "Product Showcase" template
  - [ ] Choose segment: "Active Customers"
  - [ ] Recipient count displays correctly

- [ ] **2. Configure Campaign Settings**
  - [ ] Subject: "New Wine Arrivals This Week"
  - [ ] Preview text: "Check out our latest selections"
  - [ ] From name: "Wine Sales Team"
  - [ ] Reply-to: sales@company.com
  - [ ] All fields save properly

- [ ] **3. Select Products**
  - [ ] Click "Select Products"
  - [ ] Browse product catalog
  - [ ] Select 3 products:
    - [ ] Chardonnay 2022
    - [ ] Pinot Noir 2021
    - [ ] Cabernet Sauvignon 2020
  - [ ] Click "Add to Campaign"
  - [ ] Products appear in email preview

- [ ] **4. Preview Email**
  - [ ] Click "Preview" button
  - [ ] Desktop preview displays
  - [ ] Mobile preview displays
  - [ ] All products visible
  - [ ] Images load correctly
  - [ ] "Order Now" buttons present
  - [ ] Unsubscribe link present

- [ ] **5. Send Test Email**
  - [ ] Enter your email address
  - [ ] Click "Send Test"
  - [ ] Email received within 1 minute
  - [ ] Email displays correctly in inbox
  - [ ] All links work
  - [ ] Images load

- [ ] **6. Create Campaign in Mailchimp**
  - [ ] Click "Create in Mailchimp"
  - [ ] Campaign created within 3 seconds
  - [ ] Campaign ID displayed
  - [ ] Status: "Saved" (draft)

- [ ] **7. Send Campaign**
  - [ ] Click "Send Now" button
  - [ ] Confirmation modal appears
  - [ ] Shows recipient count
  - [ ] Click "Confirm Send"
  - [ ] Campaign sends within 5 seconds
  - [ ] Success message: "Campaign sent to 500 recipients"

- [ ] **8. Schedule Campaign**
  - [ ] Create new campaign
  - [ ] Click "Schedule Send"
  - [ ] Select date: Tomorrow
  - [ ] Select time: 10:00 AM
  - [ ] Select timezone: Pacific
  - [ ] Click "Schedule"
  - [ ] Campaign scheduled successfully
  - [ ] Shows scheduled time on campaign list

### Campaign Analytics

- [ ] **1. View Campaign Stats**
  - [ ] Navigate to sent campaign
  - [ ] Click "View Stats"
  - [ ] Shows:
    - [ ] Total sent
    - [ ] Opens (count and %)
    - [ ] Clicks (count and %)
    - [ ] Unsubscribes
    - [ ] Bounces

- [ ] **2. Product Click Tracking**
  - [ ] View which products got most clicks
  - [ ] Click-through by product
  - [ ] Orders attributed to campaign (if any)

- [ ] **3. Segment Performance**
  - [ ] Compare active vs prospect open rates
  - [ ] Geographic performance
  - [ ] Best-performing segments identified

### Opt-Out Handling

- [ ] **1. Customer Unsubscribes**
  - [ ] Send test campaign to yourself
  - [ ] Click unsubscribe link in email
  - [ ] Mailchimp unsubscribe page appears
  - [ ] Confirm unsubscribe
  - [ ] Sync status back to Leora (may take up to 1 hour)
  - [ ] Customer profile shows "Opted out of emails"
  - [ ] Customer excluded from future campaigns

- [ ] **2. Opt Out in Leora**
  - [ ] Open customer profile
  - [ ] Click "Email Preferences"
  - [ ] Check "Opt out of marketing emails"
  - [ ] Save changes
  - [ ] Syncs to Mailchimp
  - [ ] Customer unsubscribed in Mailchimp

- [ ] **3. Re-Subscribe**
  - [ ] Customer requests re-subscribe
  - [ ] Uncheck "Opt out"
  - [ ] Save changes
  - [ ] Syncs to Mailchimp
  - [ ] Customer status: Subscribed in Mailchimp
  - [ ] Can receive campaigns again

## Performance Tests

- [ ] **Image Upload Speed**
  - [ ] Upload 5MB image
  - [ ] Completes in <2 seconds

- [ ] **Extraction Speed**
  - [ ] Time from upload to extraction complete
  - [ ] <10 seconds for business card
  - [ ] <15 seconds for license

- [ ] **Mailchimp Sync Speed**
  - [ ] Sync 100 customers
  - [ ] Completes in <30 seconds

- [ ] **Campaign Creation Speed**
  - [ ] Create and send campaign
  - [ ] <3 seconds to create
  - [ ] <5 seconds to send

## Cross-Browser Testing

- [ ] **Desktop Browsers**
  - [ ] Chrome (latest)
  - [ ] Safari (latest)
  - [ ] Firefox (latest)
  - [ ] Edge (latest)

- [ ] **Mobile Browsers**
  - [ ] iOS Safari
  - [ ] iOS Chrome
  - [ ] Android Chrome
  - [ ] Android Samsung Internet

## Accessibility Testing

- [ ] **Keyboard Navigation**
  - [ ] Tab through all form fields
  - [ ] Enter key submits forms
  - [ ] Esc key closes modals

- [ ] **Screen Reader**
  - [ ] VoiceOver (iOS) announces all elements
  - [ ] TalkBack (Android) announces all elements
  - [ ] ARIA labels present and correct

- [ ] **Color Contrast**
  - [ ] All text meets WCAG AA standards
  - [ ] Buttons have sufficient contrast

## Security Testing

- [ ] **API Key Protection**
  - [ ] Anthropic API key not exposed in client
  - [ ] Mailchimp API key not exposed in client
  - [ ] API calls from server only

- [ ] **File Upload Security**
  - [ ] Only allowed file types accepted
  - [ ] File size limits enforced
  - [ ] Files scanned for malware (if applicable)

- [ ] **Data Privacy**
  - [ ] Customer data encrypted at rest
  - [ ] Images encrypted in storage
  - [ ] HTTPS enforced

## Sign-Off

Once all tests pass:

- [ ] **Testing Complete**: All tests passing
- [ ] **Issues Logged**: Any bugs reported to dev team
- [ ] **Documentation Verified**: All guides accurate
- [ ] **Performance Validated**: Meets all benchmarks
- [ ] **Security Audited**: No vulnerabilities found

**Tester Name**: ___________________________
**Date**: ___________________________
**Sign-off**: **APPROVED FOR PRODUCTION** ✅

---

**Manual Test Checklist Version**: 6.0.0
**Phase**: 7 (Advanced Features)
**Date Created**: January 25, 2025
