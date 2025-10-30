# Activities System - Quick Start Guide

## What's New? 🎉

The Leora2 Activities system now includes:

✅ **Voice-to-Text Input** - Speak your notes instead of typing
✅ **Auto-Logging** - Automatically create activities from emails, calls, and texts
✅ **Universal Integration** - Log activities from anywhere (customers, orders, samples)
✅ **Smart Pre-population** - Context-aware subject generation and field pre-filling
✅ **Mobile-Friendly** - Works great on phones and tablets

## Quick Start (5 minutes)

### 1. Log Your First Activity

Visit any customer detail page at `/sales/customers/[customerId]` and:
1. Click "Log Activity" button in Quick Actions
2. Select activity type (Phone Call, Email, Visit, etc.)
3. The customer and subject are pre-filled
4. Add notes (or use voice input by clicking the microphone)
5. Click "Log Activity"

**Done!** Your activity is recorded and linked to the customer.

### 2. Try Voice-to-Text

1. Click "Log Activity" button
2. Click the microphone icon in the Notes field
3. Allow microphone access (browser will ask)
4. Speak your notes
5. Watch them appear in real-time
6. Click microphone again to stop
7. Edit if needed, then save

**Works on:** Chrome, Edge, Safari (iOS 14.5+)

### 3. View Activity Timeline

On any customer detail page, scroll to the "Activity Timeline" section to see:
- All activities for this customer
- Activity type icons (📞 calls, 📧 emails, 👤 visits)
- Outcome badges (Success, Pending, Failed)
- Linked orders (if activity led to a sale)
- Follow-up dates

## Where Can I Log Activities?

### Customer Pages ✅ INTEGRATED
- **Customer Detail**: QuickActions section + ActivityTimeline header
- **Customer List**: Coming soon (use detail page for now)

### Order Pages 📋 TEMPLATE PROVIDED
- **Order Detail**: Add button to header (see template)
- **Order List**: Coming soon

### Sample Pages 📋 TEMPLATE PROVIDED
- **Sample Detail**: Add button to header (see template)
- **Sample List**: Add button to each row (see template)

### CARLA Weekly View 📋 TEMPLATE PROVIDED
- **Weekly Schedule**: Add quick-log button (see template)
- **Daily View**: Log activities after customer visits

See `/docs/INTEGRATION_TEMPLATES.md` for copy-paste code examples.

## Activity Types

Choose the right type for your activity:

- 📞 **Phone Call** - Customer phone conversations
- 📧 **Email Follow-up** - Email communications
- 💬 **Text Message** - SMS/text messages
- 👤 **In-Person Visit** - Face-to-face meetings
- 🍷 **Tasting Appointment** - Wine tasting sessions
- 🎉 **Public Tasting Event** - Public events
- 📋 **Customer Meeting** - Scheduled meetings

## Activity Outcomes

Set the outcome to track results:

- ⏳ **Pending** - No outcome yet (default)
- ✅ **Success** - Positive result (order placed, follow-up scheduled)
- ❌ **Failed** - Negative result (not interested, wrong timing)
- 🤷 **No Response** - Customer didn't respond or wasn't available

## Auto-Logging Setup (Optional)

Want activities to be created automatically? Set up these integrations:

### Email Auto-Logging

**What it does:** Automatically creates an activity when you send an email to a customer.

**Setup:**
1. Configure your email provider webhook (SendGrid, Mailgun, etc.)
2. Point webhook to `/api/sales/activities/auto-log/email`
3. Activities are created automatically when emails are sent

See `/docs/ACTIVITIES_INTEGRATION.md` section "Email Auto-Logging" for details.

### Phone Call Auto-Logging

**What it does:** Automatically creates an activity after customer calls.

**Setup:**
1. Configure Twilio webhook (or your VoIP system)
2. Point webhook to `/api/sales/activities/auto-log/call`
3. Activities are created with call duration and recording URL

See `/docs/ACTIVITIES_INTEGRATION.md` section "Phone Call Auto-Logging" for details.

### SMS Auto-Logging

**What it does:** Automatically creates an activity from text messages.

**Setup:**
1. Configure Twilio SMS webhook
2. Point webhook to `/api/sales/activities/auto-log/sms`
3. Activities are created for each text conversation

See `/docs/ACTIVITIES_INTEGRATION.md` section "SMS Auto-Logging" for details.

## Best Practices

### 📝 Writing Good Subject Lines
✅ **Good:** "Phone Call - Acme Wine Shop - Order Follow-up"
✅ **Good:** "In-Person Visit - Joe's Bistro - New Product Demo"
❌ **Bad:** "Call" (too vague)
❌ **Bad:** "Talked about wines..." (too long, should be in notes)

**Format:** [Activity Type] - [Customer Name] - [Brief Context]

### 📝 Writing Good Notes
- Capture key discussion points
- Note any commitments or action items
- Include relevant product/pricing info
- Use voice-to-text for quick entry
- Keep it concise but informative

**Example:**
```
Customer interested in new Cabernet line. Requested pricing for 5-case order.
Follow-up: Send pricing sheet by Friday.
Next visit: Schedule tasting for next Tuesday.
```

### 📅 Setting Follow-up Dates
- Always set a follow-up date if customer requests callback
- Use follow-up dates to create tasks/reminders
- Review your follow-ups weekly

### ✅ Using Outcomes Effectively
- Set outcome immediately after activity
- Use **Success** for positive interactions (order placed, follow-up scheduled)
- Use **Pending** for ongoing situations (waiting for customer decision)
- Use **No Response** instead of Failed (less negative)

## Troubleshooting

### Voice Input Not Working?

**Problem:** Microphone button doesn't appear
- Check browser (needs Chrome, Edge, or Safari iOS)
- Ensure you're on HTTPS (required for microphone access)
- Try in incognito mode

**Problem:** Recording but no text appears
- Speak clearly and loudly
- Wait 1-2 seconds after speaking
- Check microphone isn't muted
- Check browser console for errors

### Activity Not Saving?

**Problem:** Error when submitting
- Ensure all required fields are filled (type, customer, subject, date)
- Check customer is assigned to you
- Try refreshing the page

**Problem:** Activity saved but not linked to order
- Verify order ID was passed to the modal
- Check order belongs to the customer
- Review API response in browser console

### Auto-Logging Not Working?

**Problem:** No activities created from emails
- Verify webhook is configured
- Check webhook endpoint is accessible
- Ensure customer exists with matching email
- Review server logs for errors

See `/docs/ACTIVITIES_INTEGRATION.md` for detailed troubleshooting.

## Advanced Features

### Multiple Activity Links

Activities can link to multiple records:
- Customer (required)
- Order (optional)
- Sample (optional)

This creates a complete history across all customer touchpoints.

### Voice-to-Text Languages

Currently supports English. More languages coming soon:
- Spanish
- French
- Italian
- German

### Mobile App Integration

The activities system is mobile-ready:
- Responsive design
- Touch-optimized buttons
- Voice input on mobile Safari
- Offline support coming soon

## Documentation

### For Users
- **This file** - Quick start and basics
- `/docs/INTEGRATION_TEMPLATES.md` - Code templates for developers

### For Developers
- `/docs/ACTIVITIES_INTEGRATION.md` - Complete technical guide
- `/docs/PHASE2_ACTIVITIES_SUMMARY.md` - Implementation summary
- Component source: `/web/src/components/shared/LogActivityModal.tsx`
- Button source: `/web/src/components/shared/LogActivityButton.tsx`
- API source: `/web/src/app/api/sales/activities/`

## Need Help?

### Common Questions

**Q: Can I edit an activity after saving?**
A: Not yet, but coming soon. For now, add a new activity with corrections.

**Q: Can I delete an activity?**
A: Not yet, but coming soon. Contact support if you need an activity removed.

**Q: Can I see activities for all my customers?**
A: Yes, visit `/sales/activities` to see all your activities across all customers.

**Q: Can I export activities to Excel?**
A: Coming soon. For now, you can view and filter in the activities list.

**Q: Does auto-logging work with my email provider?**
A: We support any email provider with webhook capabilities (SendGrid, Mailgun, etc.). Contact support for integration help.

### Getting Support

1. Check this documentation
2. Review the technical docs (`/docs/ACTIVITIES_INTEGRATION.md`)
3. Check the integration templates (`/docs/INTEGRATION_TEMPLATES.md`)
4. Contact the development team

## What's Next?

### Coming Soon
- Activity editing and deletion
- Activity templates (save common activities)
- Bulk activity import from CSV
- Activity analytics dashboard
- Calendar integration (Google, Outlook)
- Email open/click tracking
- Mobile app with offline support

### Future Ideas
- AI-powered activity summaries
- Automatic action item extraction
- Customer engagement scoring
- Predictive follow-up suggestions
- Social media mention tracking

## Changelog

### v1.0.0 (2025-10-26)
- ✅ LogActivityModal with voice-to-text
- ✅ LogActivityButton component
- ✅ Quick-log API endpoint
- ✅ Auto-logging system (email, call, SMS)
- ✅ Customer page integration
- ✅ Order/Sample/CARLA templates
- ✅ Comprehensive documentation

---

**Ready to get started?** Visit a customer page and click "Log Activity"!

**Questions?** See `/docs/ACTIVITIES_INTEGRATION.md` for the complete guide.
