# CARLA Phase 2 - Installation & Setup Guide

## Quick Start

All Phase 2 advanced features are now implemented. Follow these steps to activate them:

## 1. Install Dependencies

```bash
cd /Users/greghogue/Leora2/web
npm install pdf-lib @react-google-maps/api
```

## 2. Run Database Migration

```bash
npx prisma migrate dev --name add_carla_enhancements
npx prisma generate
```

## 3. Configure Environment Variables

Add to `.env.local`:

```bash
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Microsoft Outlook OAuth
MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret_here

# Google Maps API (for geocoding & territory blocking)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Getting API Credentials

#### Google Calendar & Maps
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable APIs:
   - Google Calendar API
   - Google Maps Geocoding API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/sales/call-plan/carla/calendar/callback`
   - Copy Client ID and Client Secret

#### Microsoft Outlook
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory > App registrations
3. Create new registration:
   - Name: "Leora CARLA Calendar"
   - Supported account types: Multitenant
   - Redirect URI: `http://localhost:3000/api/sales/call-plan/carla/calendar/callback`
4. API Permissions:
   - Add Microsoft Graph > Calendars.ReadWrite
   - Add Microsoft Graph > offline_access
5. Copy Application (client) ID and create new Client Secret

## 4. Activate Enhanced Page

Replace the current CARLA page with the enhanced version:

```bash
# Backup current page
mv src/app/sales/call-plan/carla/page.tsx src/app/sales/call-plan/carla/page-basic.tsx.bak

# Activate enhanced page
mv src/app/sales/call-plan/carla/page-enhanced.tsx src/app/sales/call-plan/carla/page.tsx
```

## 5. Build and Start

```bash
npm run build
npm run dev
```

## 6. Verify Installation

### Test Checklist:

1. **Advanced Filtering:**
   - [ ] Navigate to CARLA call plan
   - [ ] Click "Select Accounts"
   - [ ] Click "Filters" button
   - [ ] Try quick filters (Due Soon, High Value, etc.)
   - [ ] Save a custom filter
   - [ ] Load saved filter

2. **PDF Export:**
   - [ ] Add accounts to call plan
   - [ ] Click "Export PDF" button
   - [ ] Select export options
   - [ ] Download PDF
   - [ ] Verify content in PDF

3. **Calendar Sync:**
   - [ ] Click "Calendar Sync" button
   - [ ] Connect Google Calendar or Outlook
   - [ ] Complete OAuth flow
   - [ ] Sync events to calendar
   - [ ] Check calendar for events

4. **Territory Blocking:**
   - [ ] Click "Territory Blocking" button
   - [ ] Enter a location (or use GPS)
   - [ ] Select radius
   - [ ] See nearby account count
   - [ ] Apply filter

5. **Mobile/PWA:**
   - [ ] Open on mobile device
   - [ ] Install PWA (Add to Home Screen)
   - [ ] Test swipe gestures
   - [ ] Test offline mode
   - [ ] Verify touch targets are large enough

6. **Activity Entry:**
   - [ ] Mark account as contacted
   - [ ] Activity modal should open
   - [ ] Try quick templates
   - [ ] Save custom activity
   - [ ] Verify activity in database

7. **Weekly Planning:**
   - [ ] View call plan in "Planning" tab
   - [ ] Add objectives to account
   - [ ] Add notes
   - [ ] Save changes
   - [ ] Verify priority tier colors

## File Structure

```
/web/src/app/sales/call-plan/carla/
├── page.tsx                              # Enhanced main page
├── components/
│   ├── AdvancedFilters.tsx              # Advanced filtering system
│   ├── PDFExportButton.tsx              # PDF export
│   ├── CalendarSync.tsx                 # Calendar integration
│   ├── TerritoryBlockingModal.tsx       # Territory blocking
│   ├── MobileOptimizedView.tsx          # Mobile optimization
│   ├── ActivityEntryModal.tsx           # Activity pop-up
│   ├── WeeklyPlanningEnhancements.tsx   # Planning enhancements
│   ├── AccountSelectionModal.tsx        # (existing - enhanced)
│   ├── WeeklyAccountsView.tsx           # (existing)
│   └── CallPlanHeader.tsx               # (existing)

/web/src/app/api/sales/call-plan/carla/
├── export/
│   └── pdf/route.ts                     # PDF generation
├── calendar/
│   ├── status/route.ts                  # Connection status
│   ├── auth/route.ts                    # OAuth initiation
│   ├── sync/route.ts                    # Event sync
│   └── disconnect/route.ts              # Disconnect calendar
├── territory/
│   ├── nearby/route.ts                  # Find nearby accounts
│   └── geocode/route.ts                 # Reverse geocoding
└── filters/
    └── route.ts                         # Saved filters

/web/prisma/migrations/
└── add_carla_enhancements/
    └── migration.sql                    # Database schema updates

/web/src/hooks/
└── use-media-query.ts                   # Mobile detection hook

/web/public/
├── manifest.json                        # PWA manifest (updated)
└── sw.js                               # Service worker (updated)
```

## Features Overview

### 1. Advanced Filtering
- Last contact date (7 days, 14 days, 30 days, 30+)
- Revenue tier (High/Medium/Low)
- Product category (Wine/Spirits/Both)
- Priority tier (A/B/C)
- Quick filters (Due Soon, High Value, etc.)
- Save custom filter combinations

### 2. PDF Export
- Customizable export options
- Professional formatting
- Print-friendly for field use
- Includes objectives, notes, addresses

### 3. Calendar Integration
- Google Calendar support
- Microsoft Outlook support
- OAuth 2.0 authentication
- Two-way sync capability
- Auto-create events for accounts

### 4. Territory Blocking
- Location-based filtering
- GPS current location detection
- Radius selection (5-50 miles)
- Time blocking (morning/afternoon/evening)
- "Add all nearby" quick action

### 5. Mobile/iPad Optimization
- Touch-friendly interface
- Swipe gestures (left = contacted, right = not contacted)
- Large touch targets (50x50px)
- PWA support with offline capability
- Direct call and directions integration

### 6. Activity Entry Pop-up
- Auto-opens when marking contacted
- Quick templates (Left Voicemail, Discussed Products, etc.)
- Custom activity entry
- Activity type selection
- One-click save

### 7. Weekly Planning Enhancements
- Objectives field per account
- Color-coded priority tiers
- Last order date and revenue display
- "Mark All as Contacted" bulk action
- Inline editing with save/cancel

## Troubleshooting

### PDF Export Not Working
- Ensure `pdf-lib` is installed: `npm install pdf-lib`
- Check API route responds: Test `/api/sales/call-plan/carla/export/pdf`
- Verify call plan ID exists

### Calendar Sync Failing
- Check OAuth credentials in `.env.local`
- Verify redirect URI matches in Google/Microsoft console
- Check browser console for errors
- Ensure user has granted permissions

### Territory Blocking Not Finding Accounts
- Verify Google Maps API key is valid
- Check API key has Geocoding API enabled
- Ensure customer addresses have latitude/longitude
- Run migration to add lat/lng columns

### Mobile Gestures Not Working
- Check if `touch-none` class is applied
- Verify swipe distance threshold (50px)
- Test on actual mobile device (simulators may differ)
- Check touchstart/touchmove/touchend handlers

### Offline Mode Not Working
- Verify service worker registered: Check DevTools > Application > Service Workers
- Check manifest.json is accessible
- Clear service worker cache and re-register
- Check IndexedDB for pending changes

### Activity Modal Not Opening
- Verify contact outcome is "YES"
- Check activity customer state is set
- Verify modal open state
- Check API route `/api/sales/activities` exists

## Performance Tips

1. **Enable Production Mode:**
   ```bash
   npm run build
   npm start
   ```

2. **Optimize Images:**
   - Add icons to `/public/icons/` directory
   - Use optimized PNG files (72x72 to 512x512)

3. **Cache Strategies:**
   - Service worker caches essential files
   - IndexedDB stores offline changes
   - Background sync queues updates

4. **Mobile Performance:**
   - Lazy load territory map
   - Use virtual scrolling for large lists
   - Optimize touch event handlers

## Security Best Practices

1. **OAuth Tokens:**
   - Stored encrypted in database
   - Refresh tokens rotated regularly
   - Access tokens expire after 1 hour

2. **API Keys:**
   - Never commit to git
   - Use environment variables
   - Restrict by domain in Google/Microsoft console

3. **Location Data:**
   - GPS coordinates not stored permanently
   - Only used for temporary filtering
   - User consent required

4. **PDF Generation:**
   - Server-side only (never client-side)
   - Authenticated routes
   - User data scoped properly

## Support

- Documentation: `/docs/CARLA_ADVANCED_FEATURES.md`
- User Guide: `/docs/CARLA_USER_GUIDE.md`
- API Docs: Check route files for JSDoc comments

## Next Steps

1. Complete testing checklist
2. Get OAuth credentials
3. Add PWA icons
4. Configure production environment variables
5. Deploy to staging
6. User acceptance testing
7. Production deployment

---

**Status:** Ready for Testing
**Estimated Setup Time:** 30-45 minutes
**Required:** Google/Microsoft OAuth credentials, Google Maps API key
