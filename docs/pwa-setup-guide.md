# Progressive Web App (PWA) Setup Guide

This guide explains how to install and use the Leora Sales Portal as a Progressive Web App on iOS, Android, and desktop devices.

## What is a PWA?

A Progressive Web App allows you to install the Leora Sales Portal on your device like a native app, with:

- **Offline Support** - Access cached pages without internet
- **Home Screen Icon** - Launch directly from your device
- **Full Screen Experience** - No browser UI clutter
- **Fast Loading** - Pre-cached assets for instant access
- **Background Updates** - Automatic updates when online

## Installation Instructions

### iOS (iPhone/iPad)

1. **Open Safari** and navigate to the Leora Sales Portal
2. **Tap the Share button** (square with arrow pointing up) at the bottom of the screen
3. **Scroll down** and tap "Add to Home Screen"
4. **Edit the name** if desired (default: "Leora")
5. **Tap "Add"** in the top-right corner
6. The app icon will appear on your home screen

**iOS-Specific Features:**
- Standalone mode (no Safari UI)
- Status bar matches app theme
- Proper safe area handling for notched devices

**Troubleshooting:**
- If "Add to Home Screen" doesn't appear, make sure you're using Safari (not Chrome)
- iOS requires HTTPS for PWA features (works in development)

### Android

1. **Open Chrome** and navigate to the Leora Sales Portal
2. **Tap the menu** (three dots) in the top-right corner
3. **Tap "Install app"** or "Add to Home screen"
4. **Confirm** the installation when prompted
5. The app will be added to your app drawer and home screen

**Alternative Method:**
- Look for the "Install" banner at the bottom of the screen
- Tap the banner and follow the prompts

**Android-Specific Features:**
- Full installable app experience
- Appears in app drawer
- Can be uninstalled like any app

**Troubleshooting:**
- If install option doesn't appear, ensure you're on HTTPS
- Try refreshing the page
- Check that you haven't already installed it

### Desktop (Chrome, Edge, Brave)

1. **Open Chrome/Edge/Brave** and navigate to the Leora Sales Portal
2. **Look for the install icon** in the address bar (computer with down arrow)
3. **Click the install icon** or use the menu: **Settings → Install Leora**
4. **Confirm** the installation
5. The app will open in its own window

**Desktop Features:**
- Dedicated app window (no browser tabs)
- Appears in your application menu
- Can be pinned to taskbar/dock

**Uninstalling:**
- Click the three dots in the app window
- Select "Uninstall Leora"

## Features Available Offline

When offline, you can still access:

- ✅ **Sales Dashboard** - View cached dashboard
- ✅ **Customer List** - Browse previously loaded customers
- ✅ **Call Plan** - Review your call plan
- ✅ **Static Pages** - Any pages you've visited while online

**Limited Functionality:**
- ❌ New data fetching
- ❌ Form submissions
- ❌ Real-time updates

**Offline Indicator:**
- You'll be redirected to an offline page if you try to access uncached content
- The page provides helpful links to cached sections

## Updating the App

The PWA automatically checks for updates every minute when online.

**Update Process:**
1. A new version is detected in the background
2. You'll see a prompt: "New version available! Reload to update?"
3. Click "OK" to reload and get the latest version
4. Click "Cancel" to continue with the current version (update on next visit)

**Manual Update:**
- Simply reload the page/app
- The service worker will fetch the latest version

## Developer Information

### Service Worker

The service worker (`/public/sw.js`) provides:

- **Caching Strategy:** Network-first, fallback to cache
- **Auto-caching:** Visited pages are cached automatically
- **Offline Fallback:** Dedicated offline page
- **Update Management:** Automatic version checking

### Manifest Configuration

Location: `/public/manifest.json`

Key settings:
- **Display Mode:** Standalone (full-screen app)
- **Theme Color:** #0f172a (slate-900)
- **Start URL:** /sales
- **Shortcuts:** Quick access to Customers and Call Plan

### Testing PWA Features

**Chrome DevTools:**
1. Open DevTools (F12)
2. Go to "Application" tab
3. Check "Service Workers" section
4. Use "Offline" checkbox to test offline mode
5. Check "Manifest" section for PWA configuration

**Lighthouse Audit:**
1. Open DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Progressive Web App" category
4. Click "Generate report"

**Expected Scores:**
- Installability: ✅ Pass
- PWA Optimized: ✅ Pass
- Service Worker: ✅ Registered

## Required Files

### Core PWA Files:
- ✅ `/public/manifest.json` - App configuration
- ✅ `/public/sw.js` - Service worker for offline support
- ✅ `/src/app/offline/page.tsx` - Offline fallback page
- ✅ `/src/app/register-sw.tsx` - Service worker registration
- ⚠️ `/public/icons/icon-192x192.png` - App icon (192x192)
- ⚠️ `/public/icons/icon-512x512.png` - App icon (512x512)

### Icons TODO:
- Create or generate 192x192px and 512x512px PNG icons
- Use `pwa-asset-generator` or online tools
- See `/public/icons/README.md` for details

## Browser Support

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome | ✅ Full | ✅ Full | Best support |
| Edge | ✅ Full | ✅ Full | Chromium-based |
| Safari | ⚠️ Partial | ✅ Full | iOS requires Safari |
| Firefox | ⚠️ Partial | ⚠️ Partial | Limited PWA features |
| Brave | ✅ Full | ✅ Full | Chromium-based |

## Best Practices

1. **First Visit:** Use the app online first to cache essential pages
2. **Regular Use:** Open the app regularly to receive updates
3. **Offline Work:** The app works best for viewing cached data offline
4. **Updates:** Accept update prompts to get the latest features
5. **Clear Cache:** If experiencing issues, uninstall and reinstall

## Troubleshooting

### App won't install
- Ensure you're on HTTPS (required for PWA)
- Try a different browser (Chrome recommended)
- Clear browser cache and try again

### Offline mode not working
- Visit key pages while online first (they need to be cached)
- Check service worker is registered (DevTools → Application → Service Workers)
- Refresh the page to re-register service worker

### Updates not appearing
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Clear site data (DevTools → Application → Clear storage)
- Uninstall and reinstall the app

### Icons not showing
- Ensure icon files exist in `/public/icons/`
- Icons must be 192x192 and 512x512 PNG files
- Clear cache and reinstall

## Security & Privacy

- **HTTPS Required:** PWA features only work over HTTPS
- **Local Storage:** Cached data is stored locally on your device
- **No Data Collection:** Service worker doesn't track usage
- **Cache Limits:** Browser manages cache size automatically

## Next Steps

After installation:

1. **Visit key pages** while online to cache them
2. **Test offline mode** by enabling airplane mode
3. **Add shortcuts** to your home screen for quick access
4. **Check for updates** regularly

## Support

For issues or questions:
- Check browser console for errors
- Review service worker status in DevTools
- Contact your system administrator

---

**Last Updated:** Phase 3.2 Implementation
**Version:** 1.0.0
