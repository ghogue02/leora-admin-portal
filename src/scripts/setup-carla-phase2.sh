#!/bin/bash

echo "🚀 CARLA Phase 2 - Advanced Features Setup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from web directory"
    exit 1
fi

echo "📦 Step 1: Installing dependencies..."
npm install pdf-lib @react-google-maps/api

echo ""
echo "🗄️  Step 2: Running database migration..."
npx prisma migrate dev --name add_carla_enhancements

echo ""
echo "🔧 Step 3: Generating Prisma client..."
npx prisma generate

echo ""
echo "📝 Step 4: Activating enhanced CARLA page..."
if [ -f "src/app/sales/call-plan/carla/page.tsx" ]; then
    mv src/app/sales/call-plan/carla/page.tsx src/app/sales/call-plan/carla/page-basic.tsx.bak
    echo "   ✓ Backed up original page to page-basic.tsx.bak"
fi

if [ -f "src/app/sales/call-plan/carla/page-enhanced.tsx" ]; then
    mv src/app/sales/call-plan/carla/page-enhanced.tsx src/app/sales/call-plan/carla/page.tsx
    echo "   ✓ Activated enhanced page"
fi

echo ""
echo "⚙️  Step 5: Checking environment variables..."
if [ ! -f ".env.local" ]; then
    echo "   ⚠️  Creating .env.local template..."
    cat > .env.local << 'ENVEOF'
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Microsoft Outlook OAuth
MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret_here

# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
ENVEOF
    echo "   ✓ Created .env.local - PLEASE UPDATE WITH YOUR API KEYS"
else
    echo "   ✓ .env.local exists"
    
    # Check for required variables
    if ! grep -q "GOOGLE_CLIENT_ID" .env.local; then
        echo "   ⚠️  Add GOOGLE_CLIENT_ID to .env.local"
    fi
    if ! grep -q "GOOGLE_MAPS_API_KEY" .env.local; then
        echo "   ⚠️  Add GOOGLE_MAPS_API_KEY to .env.local"
    fi
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Update .env.local with your API credentials"
echo "   2. Run: npm run dev"
echo "   3. Navigate to: http://localhost:3000/sales/call-plan/carla"
echo "   4. Test advanced features"
echo ""
echo "📚 Documentation:"
echo "   - Installation Guide: docs/CARLA_PHASE2_INSTALLATION.md"
echo "   - Features Overview: docs/CARLA_ADVANCED_FEATURES.md"
echo ""
echo "🔐 Get API Credentials:"
echo "   - Google: https://console.cloud.google.com/"
echo "   - Microsoft: https://portal.azure.com/"
echo ""
