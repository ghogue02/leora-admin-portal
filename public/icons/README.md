# PWA Icons

This directory should contain the following icon files for the Progressive Web App:

- `icon-192x192.png` - 192x192px icon for Android devices
- `icon-512x512.png` - 512x512px icon for high-resolution displays

## Creating Icons

You can create these icons using:

1. **Online Tools:**
   - [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)

2. **Design Tools:**
   - Adobe Illustrator/Photoshop
   - Figma
   - Canva

3. **CLI Tools:**
   ```bash
   npm install -g pwa-asset-generator
   pwa-asset-generator logo.svg ./public/icons
   ```

## Icon Requirements

- **Format:** PNG (supports transparency)
- **Sizes:** 192x192px and 512x512px
- **Purpose:** Both icons should work as maskable icons (safe zone in center)
- **Design:** Simple, recognizable logo that works at small sizes

## Temporary Placeholder

Until proper icons are created, you can use a simple colored square or the company logo scaled appropriately.
