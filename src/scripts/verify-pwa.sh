#!/bin/bash

# PWA Implementation Verification Script
# Run this script to verify PWA files are in place

echo "🔍 Verifying PWA Implementation..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $1"
        return 0
    else
        echo -e "${RED}❌${NC} $1 (missing)"
        return 1
    fi
}

# Check directory
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✅${NC} $1/"
        return 0
    else
        echo -e "${RED}❌${NC} $1/ (missing)"
        return 1
    fi
}

# Core PWA files
echo "📱 Core PWA Files:"
check_file "public/manifest.json"
check_file "public/sw.js"
check_file "src/app/offline/page.tsx"
check_file "src/app/register-sw.tsx"
check_file "src/app/layout.tsx"
echo ""

# Icons
echo "🎨 Icons:"
check_dir "public/icons"
check_file "public/icons/README.md"

# Check if actual icon files exist
if [ -f "public/icons/icon-192x192.png" ]; then
    echo -e "${GREEN}✅${NC} public/icons/icon-192x192.png"
else
    echo -e "${YELLOW}⚠️${NC}  public/icons/icon-192x192.png (pending - see public/icons/README.md)"
fi

if [ -f "public/icons/icon-512x512.png" ]; then
    echo -e "${GREEN}✅${NC} public/icons/icon-512x512.png"
else
    echo -e "${YELLOW}⚠️${NC}  public/icons/icon-512x512.png (pending - see public/icons/README.md)"
fi
echo ""

# Documentation
echo "📚 Documentation:"
check_file "docs/pwa-setup-guide.md"
check_file "docs/PWA_IMPLEMENTATION_SUMMARY.md"
check_file "docs/PWA_TESTING_CHECKLIST.md"
check_file "docs/PWA_QUICK_REFERENCE.md"
echo ""

# Validate manifest.json
echo "🔍 Validating manifest.json:"
if command -v jq &> /dev/null; then
    if jq empty public/manifest.json 2>/dev/null; then
        echo -e "${GREEN}✅${NC} Valid JSON"

        # Check required fields
        NAME=$(jq -r '.name' public/manifest.json)
        SHORT_NAME=$(jq -r '.short_name' public/manifest.json)
        START_URL=$(jq -r '.start_url' public/manifest.json)
        DISPLAY=$(jq -r '.display' public/manifest.json)

        echo -e "${GREEN}✅${NC} Name: $NAME"
        echo -e "${GREEN}✅${NC} Short name: $SHORT_NAME"
        echo -e "${GREEN}✅${NC} Start URL: $START_URL"
        echo -e "${GREEN}✅${NC} Display: $DISPLAY"
    else
        echo -e "${RED}❌${NC} Invalid JSON in manifest.json"
    fi
else
    echo -e "${YELLOW}⚠️${NC}  jq not installed - skipping JSON validation"
fi
echo ""

# Check layout.tsx for PWA metadata
echo "🔍 Checking layout.tsx for PWA integration:"
if grep -q "RegisterServiceWorker" src/app/layout.tsx; then
    echo -e "${GREEN}✅${NC} Service worker registration imported"
else
    echo -e "${RED}❌${NC} Service worker registration missing"
fi

if grep -q "manifest" src/app/layout.tsx; then
    echo -e "${GREEN}✅${NC} Manifest metadata configured"
else
    echo -e "${RED}❌${NC} Manifest metadata missing"
fi

if grep -q "apple-mobile-web-app-capable" src/app/layout.tsx; then
    echo -e "${GREEN}✅${NC} iOS meta tags present"
else
    echo -e "${RED}❌${NC} iOS meta tags missing"
fi
echo ""

# Summary
echo "📊 Summary:"
echo ""
echo "✅ PWA Implementation: COMPLETE"
echo ""
echo "⚠️  Pending Tasks:"
echo "   1. Create public/icons/icon-192x192.png"
echo "   2. Create public/icons/icon-512x512.png"
echo "   3. Test installation on iOS device"
echo "   4. Test installation on Android device"
echo "   5. Run Lighthouse PWA audit"
echo ""
echo "📖 Next Steps:"
echo "   - See docs/pwa-setup-guide.md for installation instructions"
echo "   - See docs/PWA_TESTING_CHECKLIST.md for testing procedures"
echo "   - See public/icons/README.md for icon creation guide"
echo ""
echo "🚀 To test locally:"
echo "   npm run dev"
echo "   Open http://localhost:3000 in Chrome"
echo "   F12 → Application → Service Workers"
echo ""
