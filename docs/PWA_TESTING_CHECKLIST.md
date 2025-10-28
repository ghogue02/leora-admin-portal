# PWA Testing Checklist

Use this checklist to verify PWA implementation before deployment.

## Pre-Testing Setup

- [ ] Icons created (192x192 and 512x512 PNG files in `/public/icons/`)
- [ ] Application running on HTTPS (required for PWA)
- [ ] Chrome DevTools installed (for debugging)

## Service Worker Registration

### Chrome DevTools Check
1. [ ] Open Chrome DevTools (F12)
2. [ ] Navigate to "Application" tab
3. [ ] Click "Service Workers" in left sidebar
4. [ ] Verify service worker is "activated and running"
5. [ ] Check scope is "/"
6. [ ] No errors in console

**Screenshot Location:** `docs/screenshots/service-worker-registered.png`

### Network Tab Check
1. [ ] Open DevTools → Network tab
2. [ ] Reload page
3. [ ] Look for "sw.js" request
4. [ ] Status should be 200 OK
5. [ ] Type should be "script"

## Manifest Validation

### Chrome DevTools Check
1. [ ] Open DevTools → Application → Manifest
2. [ ] Verify manifest loaded without errors
3. [ ] Check "Identity" section:
   - [ ] Name: "Leora Sales Portal"
   - [ ] Short name: "Leora"
4. [ ] Check "Presentation" section:
   - [ ] Start URL: "/sales"
   - [ ] Display: "standalone"
   - [ ] Theme color: "#0f172a"
5. [ ] Check "Icons" section:
   - [ ] 192x192 icon present
   - [ ] 512x512 icon present
   - [ ] Icons load without 404 errors

**Screenshot Location:** `docs/screenshots/manifest-validation.png`

## Installability

### Desktop (Chrome)
1. [ ] Navigate to application URL
2. [ ] Look for install icon (⊕) in address bar
3. [ ] Click install icon
4. [ ] Verify install prompt appears
5. [ ] Click "Install"
6. [ ] Verify app opens in standalone window
7. [ ] Check app appears in application menu
8. [ ] Test launching from application menu

**Notes:**
- If install icon doesn't appear, check DevTools → Application → Manifest for errors
- Ensure all PWA criteria met (HTTPS, valid manifest, service worker)

### iOS Safari
1. [ ] Open Safari on iOS device
2. [ ] Navigate to application URL
3. [ ] Tap Share button (⬆)
4. [ ] Scroll down and tap "Add to Home Screen"
5. [ ] Verify preview shows correct:
   - [ ] Icon (192x192)
   - [ ] Name ("Leora")
6. [ ] Tap "Add"
7. [ ] Verify icon appears on home screen
8. [ ] Tap icon to launch
9. [ ] Verify standalone mode (no Safari UI)
10. [ ] Check status bar color matches theme

**Common Issues:**
- "Add to Home Screen" not visible → Must use Safari (not Chrome)
- Icon not showing → Check icon files exist in `/public/icons/`
- Not standalone → Verify manifest has `"display": "standalone"`

### Android Chrome
1. [ ] Open Chrome on Android device
2. [ ] Navigate to application URL
3. [ ] Wait for install banner (may appear automatically)
4. [ ] OR tap menu (⋮) → "Install app"
5. [ ] Verify install prompt shows:
   - [ ] Correct app name
   - [ ] Correct icon
6. [ ] Tap "Install"
7. [ ] Verify app appears in app drawer
8. [ ] Launch app from app drawer
9. [ ] Verify standalone mode

**Alternative:**
- Look for install prompt at bottom of screen
- May need to reload page for prompt to appear

## Offline Functionality

### Initial Cache Population
1. [ ] Open application while online
2. [ ] Navigate to:
   - [ ] /sales (dashboard)
   - [ ] /sales/customers
   - [ ] /sales/call-plan
3. [ ] Open DevTools → Application → Cache Storage
4. [ ] Expand "leora-sales-v1" cache
5. [ ] Verify cached entries for visited pages

### Offline Mode Testing
1. [ ] With app still open, enable offline mode:
   - **DevTools:** Network tab → "Offline" checkbox
   - **iOS:** Enable Airplane Mode
   - **Android:** Enable Airplane Mode
2. [ ] Reload the page
3. [ ] Verify page loads from cache (no errors)
4. [ ] Navigate to cached routes:
   - [ ] /sales → Should load
   - [ ] /sales/customers → Should load
   - [ ] /sales/call-plan → Should load
5. [ ] Try navigating to uncached route (e.g., /sales/new-route)
6. [ ] Verify offline page appears at /offline
7. [ ] Verify offline page shows:
   - [ ] Offline message
   - [ ] Links to cached sections
   - [ ] Helpful guidance

### Return Online
1. [ ] Disable offline mode (uncheck Offline or disable Airplane Mode)
2. [ ] Reload page
3. [ ] Verify fresh data loads
4. [ ] Check DevTools → Network tab for live requests

## Auto-Update Testing

### Trigger Update
1. [ ] With app running, modify `/public/sw.js`
2. [ ] Change `CACHE_NAME` to `'leora-sales-v2'`
3. [ ] Save file and reload application
4. [ ] Open DevTools → Application → Service Workers
5. [ ] Look for "waiting to activate" service worker
6. [ ] Verify update prompt appears:
   - [ ] "New version available! Reload to update?"
7. [ ] Click "OK" to accept update
8. [ ] Verify page reloads
9. [ ] Check new service worker is "activated and running"
10. [ ] Verify old cache deleted in Cache Storage

**Manual Update:**
- Alternatively, click "skipWaiting" in DevTools

### Update Interval
1. [ ] Leave app open for 60+ seconds
2. [ ] Verify service worker checks for updates
3. [ ] Check console for update check messages

## Lighthouse PWA Audit

### Run Audit
1. [ ] Open Chrome DevTools (F12)
2. [ ] Click "Lighthouse" tab
3. [ ] Configuration:
   - [ ] Select "Progressive Web App" category only
   - [ ] Mode: "Navigation (Default)"
   - [ ] Device: "Mobile"
4. [ ] Click "Analyze page load"
5. [ ] Wait for audit to complete

### Required Scores
- [ ] PWA Score: **90+** (ideally 100)

### Required Checks (All must pass)
- [ ] ✅ Installable
  - [ ] Web app manifest meets requirements
  - [ ] Service worker registered
- [ ] ✅ PWA Optimized
  - [ ] Configured for a custom splash screen
  - [ ] Sets theme color
  - [ ] Content sized correctly for viewport
- [ ] ✅ Additional Checks
  - [ ] Uses HTTPS
  - [ ] Redirects HTTP to HTTPS
  - [ ] Viewport meta tag present
  - [ ] Apple touch icon provided

**Screenshot Location:** `docs/screenshots/lighthouse-pwa-audit.png`

### Common Issues & Fixes
- "No matching service worker" → Check service worker is registered
- "Manifest doesn't have maskable icon" → Warning only, can ignore or add maskable icon
- "Does not provide fallback content" → Warning only, offline page provides this

## Cross-Browser Testing

### iOS Safari (iPhone/iPad)
- [ ] Installation works
- [ ] Standalone mode (no browser UI)
- [ ] Status bar color correct
- [ ] Safe areas handled properly
- [ ] Offline mode works
- [ ] Icons display correctly

### Android Chrome
- [ ] Installation works
- [ ] Install banner appears
- [ ] App drawer integration
- [ ] Offline mode works
- [ ] Icons display correctly

### Desktop Chrome
- [ ] Installation works
- [ ] Install icon in address bar
- [ ] Standalone window opens
- [ ] App menu integration
- [ ] Offline mode works

### Desktop Edge
- [ ] Installation works
- [ ] Same as Chrome (Chromium-based)

### Desktop Brave
- [ ] Installation works
- [ ] Same as Chrome (Chromium-based)

## Performance Testing

### First Load (Online)
- [ ] Service worker registers quickly
- [ ] No console errors
- [ ] Manifest loads without delay
- [ ] Icons load without 404s

### Subsequent Loads (Online)
- [ ] Pages load from network (fresh data)
- [ ] Cache updated in background
- [ ] No flash of cached content

### Offline Loads
- [ ] Cached pages load instantly
- [ ] No network errors in console
- [ ] Offline indicator appears when appropriate

## Security Testing

### HTTPS
- [ ] Application only accessible via HTTPS
- [ ] HTTP redirects to HTTPS
- [ ] Service worker only registers on HTTPS

### Scope
- [ ] Service worker scope limited to origin
- [ ] No cross-origin service worker issues

## User Experience Testing

### Installation Flow
- [ ] Installation prompt is clear
- [ ] Icon preview accurate
- [ ] Installation completes quickly
- [ ] Installed app launches properly

### Offline Experience
- [ ] Offline indicator clear and helpful
- [ ] Cached navigation works smoothly
- [ ] Offline page provides value
- [ ] Return online seamless

### Update Flow
- [ ] Update prompt not intrusive
- [ ] User can defer update
- [ ] Update applies smoothly
- [ ] No data loss on update

## Documentation Verification

- [ ] Installation guide complete (`/docs/pwa-setup-guide.md`)
- [ ] Icon requirements documented (`/public/icons/README.md`)
- [ ] Implementation summary created (`/docs/PWA_IMPLEMENTATION_SUMMARY.md`)
- [ ] All screenshots captured and saved

## Production Readiness

- [ ] All icons created and optimized
- [ ] Service worker tested extensively
- [ ] Offline mode verified
- [ ] Auto-update tested
- [ ] Cross-browser tested
- [ ] Lighthouse PWA score 90+
- [ ] User documentation complete
- [ ] Installation guide verified
- [ ] Security checks passed
- [ ] Performance acceptable

## Post-Deployment Verification

After deploying to production:

1. [ ] Visit production URL
2. [ ] Verify HTTPS certificate valid
3. [ ] Run Lighthouse audit on production
4. [ ] Test installation on real devices:
   - [ ] iOS device
   - [ ] Android device
   - [ ] Desktop browser
5. [ ] Test offline mode on production
6. [ ] Monitor service worker errors in production logs
7. [ ] Verify auto-update works in production

## Known Limitations

- **Firefox:** Limited PWA support, installation not available
- **iOS Chrome:** Cannot install PWAs, must use Safari
- **Private/Incognito Mode:** Service workers may not persist
- **Old Browsers:** PWA features require modern browser versions

## Support Resources

- PWA Builder: https://www.pwabuilder.com/
- Lighthouse: https://developer.chrome.com/docs/lighthouse/
- MDN PWA: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- Web.dev PWA: https://web.dev/progressive-web-apps/

---

**Last Updated:** Phase 3.2 Implementation
**Status:** Ready for testing once icons created
