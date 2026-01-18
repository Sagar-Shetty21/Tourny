# PWA Setup - Manual Steps Required

This document outlines the manual steps needed to complete the PWA (Progressive Web App) setup for Tourny.

## ✅ What's Already Done

- [x] PWA manifest file created (`/public/manifest.json`)
- [x] Service worker implemented (`/public/sw.js`)
- [x] Offline page created (`/public/offline.html`)
- [x] Metadata and theme colors configured
- [x] Service worker registration in layout
- [x] App shortcuts configured

## 📋 Manual Steps Needed

### 1. Create App Icons

You need to create the following icon files and place them in the `/public` directory:

#### Required Icons:
- **icon-192x192.png** (192x192 pixels)
  - Purpose: Standard app icon for Android/Chrome
  - Use the app's primary color (#da6c6c) as background
  - Center the trophy icon or "T" letter logo

- **icon-512x512.png** (512x512 pixels)
  - Purpose: High-res icon for splash screens
  - Same design as 192x192, just larger

#### Recommended Additional Icons:
- **favicon.ico** (32x32 pixels)
  - Classic browser favicon
  
- **apple-touch-icon.png** (180x180 pixels)
  - iOS home screen icon
  - Should have rounded corners (iOS adds them automatically)

#### Icon Design Guidelines:
- **Background Color**: `#da6c6c` (app theme color) or `#fee9ca` (active card color)
- **Icon Color**: White or dark gray
- **Safe Zone**: Keep important elements 10% away from edges
- **Style**: Simple, recognizable at small sizes
- **Suggested Content**: 
  - Trophy icon (🏆) 
  - Letter "T" in a bold font
  - Stylized tournament bracket symbol

### 2. Create Screenshots (Optional but Recommended)

Screenshots help users preview the app before installing:

#### Mobile Screenshot:
- **File**: `/public/screenshot-mobile.png`
- **Size**: 390x844 pixels (iPhone size)
- **Content**: Screenshot of the dashboard or create tournament page
- **Format**: PNG

#### Desktop Screenshot:
- **File**: `/public/screenshot-desktop.png`
- **Size**: 1920x1080 pixels
- **Content**: Dashboard with tournament list
- **Format**: PNG

### 3. Update Next.js Configuration

Add the following to `next.config.ts` to ensure service worker works:

```typescript
const nextConfig = {
  // ... existing config
  
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};
```

### 4. Test PWA Installation

#### On Desktop (Chrome/Edge):
1. Open the app in Chrome/Edge
2. Look for the install icon in the address bar
3. Click to install
4. App should open in standalone window

#### On Mobile (Android):
1. Open app in Chrome
2. Tap the three-dot menu
3. Select "Add to Home Screen"
4. Confirm installation

#### On iOS:
1. Open app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Confirm

### 5. Lighthouse PWA Audit

Run Lighthouse audit to verify PWA setup:

1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Progressive Web App" category
4. Click "Generate report"
5. Address any failing criteria

## 🎨 Icon Creation Tools

### Online Tools:
- **Figma** (https://figma.com) - Professional design tool
- **Canva** (https://canva.com) - Easy template-based design
- **RealFaviconGenerator** (https://realfavicongenerator.net/) - Generate all icon sizes

### Command Line Tools:
```bash
# Using ImageMagick to resize icons
convert logo.png -resize 192x192 icon-192x192.png
convert logo.png -resize 512x512 icon-512x512.png
```

## 📱 Current PWA Features

### Installed Features:
- ✅ **Offline Support**: Basic offline page when no connection
- ✅ **Installable**: Can be installed on home screen
- ✅ **Standalone Mode**: Runs without browser UI
- ✅ **Theme Color**: Custom brand color (#da6c6c)
- ✅ **App Shortcuts**: Quick access to Dashboard and Create Tournament
- ✅ **Cache Strategy**: Network-first for APIs, cache-first for static assets

### Future Enhancements (Optional):
- [ ] Push notifications for tournament updates
- [ ] Background sync for offline data
- [ ] Advanced caching strategies
- [ ] Update notifications
- [ ] Share target API for sharing tournaments

## 🔧 Troubleshooting

### Service Worker Not Registering:
- Check browser console for errors
- Ensure HTTPS is enabled (required for PWA)
- Clear browser cache and try again
- Check `/sw.js` is accessible

### Install Prompt Not Showing:
- Ensure all icons exist
- Run Lighthouse audit
- Check manifest.json is valid
- Verify HTTPS connection

### Icons Not Loading:
- Verify file names match manifest.json
- Check file paths are correct
- Ensure proper image format (PNG)
- Clear cache and reload

## 📚 Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Manifest Validator](https://manifest-validator.appspot.com/)
- [PWA Builder](https://www.pwabuilder.com/)
- [Service Worker Cookbook](https://serviceworke.rs/)

## ✅ Testing Checklist

Before deploying:
- [ ] All icon files created and placed in `/public`
- [ ] Icons display correctly in app
- [ ] Manifest.json validates successfully
- [ ] Service worker registers without errors
- [ ] App installs on desktop
- [ ] App installs on mobile (Android/iOS)
- [ ] Offline page displays when offline
- [ ] App shortcuts work correctly
- [ ] Theme color shows in browser/OS
- [ ] Lighthouse PWA score > 90

---

**Note**: PWA features require HTTPS in production. They work on localhost for development but won't work on HTTP in production.
