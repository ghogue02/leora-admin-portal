# Image Scanning Guide

## Overview

Leora's image scanning feature uses Claude Vision AI to automatically extract contact information from business cards and liquor license details from license documents. This eliminates manual data entry and accelerates customer onboarding.

## Features

- **Business Card Scanning**: Extract name, email, phone, company, and address
- **License Scanning**: Extract license number, business name, type, and expiration
- **Mobile Camera Support**: Capture photos directly from iPhone/Android
- **Desktop Upload**: Upload existing images from computer
- **Data Review & Edit**: Review and correct extracted data before saving
- **Auto Customer Creation**: Convert scans directly into customer records

## How to Scan Business Cards

### On Mobile (Recommended)

1. **Navigate to Scan Page**
   - Open Leora app on mobile device
   - Tap "Scan Business Card" from main menu
   - Or use quick action from customer list

2. **Grant Camera Permission**
   - First time: Browser will ask for camera access
   - Tap "Allow" to enable camera
   - On iOS: May need to enable in Settings > Safari > Camera
   - On Android: May need to enable in Site Settings

3. **Position the Card**
   - Hold phone directly above business card
   - Ensure good lighting (avoid shadows)
   - Keep card flat and in frame
   - All text should be clearly visible

4. **Capture Photo**
   - Tap the capture button (large circle)
   - Hold phone steady for sharp image
   - Review photo preview
   - Tap "Retake" if blurry or "Confirm" to proceed

5. **Wait for Extraction**
   - Photo uploads to cloud storage (~2 seconds)
   - Claude AI analyzes image (~5-10 seconds)
   - Progress indicator shows status
   - "Extraction Complete" appears when ready

6. **Review Extracted Data**
   - Name, email, phone auto-filled
   - Company name and address extracted
   - Review all fields for accuracy
   - Edit any incorrect information

7. **Create Customer**
   - Tap "Create Customer" button
   - Customer record saved to database
   - Card image attached to customer
   - Navigate to customer profile

### On Desktop

1. **Navigate to Scan Page**
   - Click "Scan Business Card" from sidebar
   - Or click "Scan Card" from customer list

2. **Upload Image**
   - Click "Upload Image" button
   - Select business card photo from computer
   - Supported formats: JPG, PNG, WEBP
   - Max file size: 10MB

3. **Wait for Processing**
   - Image uploads automatically
   - Claude AI extracts data
   - Progress shown on screen

4. **Review and Create**
   - Same as mobile steps 6-7 above

## How to Scan Liquor Licenses

### Mobile Scanning

1. **Navigate to License Scan**
   - From customer profile, tap "Scan License"
   - Or use "Scan License" from main menu

2. **Capture License Photo**
   - Position phone above license document
   - Ensure all text is visible and clear
   - Capture multiple pages if needed
   - Confirm photo quality

3. **AI Extraction**
   - Claude extracts license details:
     - License number (ABC-123-456)
     - Business name
     - License type (Type 21, etc.)
     - Expiration date
     - Address
     - Restrictions (if any)

4. **Review License Data**
   - Verify license number accuracy
   - Check expiration date
   - Confirm business name matches
   - Note any restrictions

5. **Attach to Customer**
   - License saved to customer record
   - Expiration tracking enabled
   - Alerts set for renewal dates

## Tips for Best Results

### Lighting

- **Natural Light**: Best results with natural daylight
- **Avoid Shadows**: Position camera to eliminate shadows
- **No Glare**: Avoid reflective surfaces and flash glare
- **Indoor Lighting**: Use bright overhead lights if indoors

### Card Position

- **Flat Surface**: Place card on flat, contrasting background
- **Fill Frame**: Card should fill 80% of camera view
- **Straight Angle**: Hold camera directly above (90 degrees)
- **No Tilt**: Keep card and camera parallel

### Image Quality

- **Focus**: Tap screen to focus on text
- **Steady Hand**: Hold phone steady or rest on surface
- **High Resolution**: Use rear camera (better quality)
- **Clean Lens**: Wipe camera lens before scanning

### Common Issues

**Blurry Image**
- Hold phone steady for 1-2 seconds
- Use burst mode and select sharpest
- Rest phone on stable surface

**Poor Lighting**
- Move to brighter area
- Use desk lamp for supplemental light
- Avoid mixing light sources

**Incomplete Extraction**
- Ensure all text is in frame
- Increase image resolution
- Manually enter missing fields

**Wrong Data Extracted**
- Review and edit before saving
- Provide feedback to improve AI
- Use manual entry for complex layouts

## Privacy & Data Retention

### What We Store

- **Original Image**: Stored in Supabase secure cloud storage
- **Extracted Data**: Saved to database (encrypted)
- **Access Logs**: Who scanned and when
- **Retention**: Images kept for 90 days, then deleted

### Who Can See

- **Your Account**: Only users in your organization
- **Claude AI**: Processes image (not stored by Anthropic)
- **No Third Parties**: Images never shared externally

### Data Protection

- **Encryption**: Images encrypted at rest and in transit
- **Access Control**: Role-based permissions
- **Audit Trail**: All access logged and monitored
- **GDPR Compliant**: Right to deletion honored

### Delete Scanned Data

1. Navigate to customer profile
2. Click "Delete Scan" next to image
3. Confirm deletion (permanent)
4. Extracted data remains unless customer deleted

## Troubleshooting

### Camera Not Working

**iOS**
1. Settings > Safari > Camera
2. Enable "Camera Access"
3. Refresh browser page
4. Retry camera access

**Android**
1. Chrome Settings > Site Settings > Camera
2. Find Leora app
3. Set to "Allow"
4. Refresh and retry

### Extraction Failed

**Possible Causes**
- Image too blurry or dark
- Text too small or complex
- Unusual card layout
- API rate limit reached

**Solutions**
1. Retake photo with better lighting
2. Use higher resolution image
3. Try desktop upload instead
4. Manually enter data

### Slow Processing

**Expected Times**
- Upload: 1-3 seconds
- Extraction: 5-10 seconds
- Total: 6-13 seconds

**If Slower**
- Check internet connection
- Try different network (wifi vs cellular)
- Wait for busy period to pass
- Contact support if >30 seconds

### Incorrect Data

**Why It Happens**
- Unusual fonts or layouts
- Handwritten information
- Faded or damaged cards
- Multiple languages

**What to Do**
1. Review all extracted fields
2. Correct inaccurate data
3. Report issues to support
4. AI improves over time

## Best Practices

### For Sales Reps

1. **Scan Immediately**: Scan cards right after receiving
2. **Batch Process**: Scan multiple cards in one session
3. **Review Daily**: Check extractions each evening
4. **Organize**: Tag scans with event/date metadata
5. **Follow Up**: Use scanned data for quick follow-ups

### For Administrators

1. **Train Staff**: Show proper scanning techniques
2. **Monitor Quality**: Review extraction accuracy
3. **Set Standards**: Define required fields
4. **Audit Regularly**: Check for duplicate scans
5. **Backup Data**: Export customer data monthly

### For Data Quality

1. **Verify Critical Fields**: Always check email/phone
2. **Standardize Formats**: Use consistent phone number formats
3. **Complete Profiles**: Fill in missing fields manually
4. **Remove Duplicates**: Check before creating customer
5. **Update Changes**: Re-scan if card information changes

## Advanced Features

### Batch Scanning

Process multiple business cards at once:

1. Collect 10-20 business cards
2. Scan each card consecutively
3. Let AI process in background
4. Review all extractions when complete
5. Create customers in batch

### API Integration

Integrate scanning into custom workflows:

```javascript
// Upload and scan
POST /api/scan/business-card
Content-Type: multipart/form-data
Body: { image: File }

// Check status
GET /api/scan/{scanId}

// Create customer
POST /api/scan/{scanId}
Body: { action: 'create_customer', extractedData: {...} }
```

### Webhook Notifications

Get notified when scans complete:

```javascript
// Configure webhook
POST /api/webhooks
Body: {
  event: 'scan.completed',
  url: 'https://your-app.com/webhook'
}

// Receive notification
POST https://your-app.com/webhook
Body: {
  scanId: 'scan_123',
  status: 'completed',
  extractedData: {...}
}
```

## Cost Management

### Claude AI Pricing

- **Business Card**: ~$0.01 per scan
- **License**: ~$0.02 per scan
- **Failed Scans**: No charge
- **Retries**: Included (max 3 attempts)

### Optimization Tips

1. **Good Lighting**: Reduces extraction errors
2. **High Quality**: Better images = better results
3. **Avoid Retries**: Review before uploading
4. **Batch Process**: More efficient than one-by-one

### Usage Monitoring

View scanning costs in admin dashboard:
- Daily/monthly scan counts
- Success rates by scan type
- Cost per successful scan
- Failed scan analysis

## Support

### Common Questions

**Q: How accurate is the extraction?**
A: 90-95% accuracy for standard business cards. Review all data before saving.

**Q: What if it doesn't work?**
A: Manual entry is always available. Click "Enter Manually" to skip scanning.

**Q: Can I scan foreign language cards?**
A: Yes, Claude supports 100+ languages. Accuracy may vary.

**Q: Is my data secure?**
A: Yes, images encrypted and stored securely. Deleted after 90 days.

**Q: Can I export scanned data?**
A: Yes, export customers to CSV from customer list.

### Get Help

- **Email**: support@leora.app
- **Chat**: Click chat icon in app
- **Phone**: 1-800-LEORA-AI
- **Docs**: docs.leora.app

### Report Issues

If scanning isn't working:
1. Take screenshot of error
2. Note device and browser
3. Email to support@leora.app
4. Include scan ID if available

---

**Version**: 6.0.0
**Last Updated**: January 2025
**Feedback**: Send suggestions to product@leora.app
