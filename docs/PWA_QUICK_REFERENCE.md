# PWA Quick Reference Card

## Installation

**iOS:** Safari → Share → Add to Home Screen
**Android:** Chrome → Menu → Install app
**Desktop:** Chrome → Install icon in address bar

## Testing Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## File Locations

| File | Purpose |
|------|---------|
| `/public/manifest.json` | PWA configuration |
| `/public/sw.js` | Service worker (offline caching) |
| `/src/app/offline/page.tsx` | Offline fallback page |
| `/src/app/register-sw.tsx` | Service worker registration |
| `/src/app/layout.tsx` | PWA metadata |

## Cache Strategy

**Network First → Cache Fallback → Offline Page**

1. Try network (fresh data)
2. On fail, use cache
3. If no cache, show offline page

## Cached Routes

- `/sales` - Dashboard
- `/sales/customers` - Customer list
- `/sales/call-plan` - Call planning
- `/offline` - Offline page

## Chrome DevTools

**Check Service Worker:**
1. F12 → Application → Service Workers
2. Should show "activated and running"

**Check Manifest:**
1. F12 → Application → Manifest
2. Verify icons and config

**Test Offline:**
1. F12 → Network → Offline checkbox
2. Reload page

## Lighthouse Audit

**Run PWA Audit:**
1. F12 → Lighthouse tab
2. Select "Progressive Web App"
3. Click "Generate report"
4. Target score: 90+

## Auto-Updates

- Checks every 60 seconds
- User prompt on new version
- Click OK to update

## Browser Support

✅ iOS Safari - Full support
✅ Android Chrome - Full support
✅ Desktop Chrome/Edge/Brave - Full support
⚠️ Firefox - Limited support

## Troubleshooting

**Install icon missing:**
- Check HTTPS enabled
- Verify manifest valid (DevTools → Application → Manifest)
- Ensure service worker registered

**Offline mode not working:**
- Visit pages online first to cache
- Check service worker status
- Verify cache populated (Application → Cache Storage)

**Icons not showing:**
- Create `/public/icons/icon-192x192.png`
- Create `/public/icons/icon-512x512.png`
- Clear cache and reinstall

## Memory Key

Configuration stored: `phase2/pwa-config`

## Documentation

- Full guide: `/docs/pwa-setup-guide.md`
- Testing: `/docs/PWA_TESTING_CHECKLIST.md`
- Summary: `/docs/PWA_IMPLEMENTATION_SUMMARY.md`

## Icon Requirements

- 192x192px PNG (Android, app drawer)
- 512x512px PNG (high-res displays)
- Simple, recognizable design
- Works at small sizes
- Safe zone for maskable icons

## Next Steps

1. Create icons (see `/public/icons/README.md`)
2. Test installation on devices
3. Run Lighthouse audit (target 90+)
4. Deploy to production (HTTPS)
5. Share installation guide with users

---

**Phase:** 3.2 PWA Implementation
**Status:** Complete (pending icons)
