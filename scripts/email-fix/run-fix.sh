#!/bin/bash

# Customer Email Fix - Complete Execution Script
# This script runs the full email fix process

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "╔════════════════════════════════════════════════════════╗"
echo "║         Customer Email Fix - Full Process             ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📂 Working directory: $SCRIPT_DIR"
echo "🏠 Project root: $PROJECT_ROOT"
echo ""

# Step 1: Parse CSV
echo "═══════════════════════════════════════════════════════"
echo "Step 1/3: Parsing Customer Emails from CSV"
echo "═══════════════════════════════════════════════════════"
echo ""

cd "$SCRIPT_DIR"
npx tsx parse-customer-emails.ts

if [ ! -f "email-mappings.json" ]; then
    echo "❌ Error: email-mappings.json not created!"
    exit 1
fi

echo ""
echo "✅ Email mappings created successfully!"
echo ""

# Step 2: Review mappings (optional pause)
echo "═══════════════════════════════════════════════════════"
echo "Step 2/3: Review Email Mappings (Optional)"
echo "═══════════════════════════════════════════════════════"
echo ""

TOTAL_MAPPINGS=$(cat email-mappings.json | jq -r '.totalMappings')
echo "📊 Found $TOTAL_MAPPINGS companies with email addresses"
echo ""
echo "Sample mappings:"
cat email-mappings.json | jq -r '.mappings | to_entries[:5] | .[] | "  - \(.key): \(.value)"'
echo ""

read -p "⏸️  Press Enter to continue with database update (Ctrl+C to cancel)..."
echo ""

# Step 3: Update database
echo "═══════════════════════════════════════════════════════"
echo "Step 3/3: Updating Database with Emails"
echo "═══════════════════════════════════════════════════════"
echo ""

npx tsx update-customer-emails.ts

if [ ! -f "update-results.json" ]; then
    echo "❌ Error: update-results.json not created!"
    exit 1
fi

echo ""
echo "✅ Database update completed!"
echo ""

# Show results
echo "═══════════════════════════════════════════════════════"
echo "Final Results"
echo "═══════════════════════════════════════════════════════"
echo ""

cat update-results.json | jq -r '.stats | "
📊 Database State:
   Total Customers: \(.totalCustomers)
   With Emails: \(.customersWithEmails) (\((.customersWithEmails / .totalCustomers * 100) | floor)%)
   Missing Emails: \(.customersMissingEmails) (\((.customersMissingEmails / .totalCustomers * 100) | floor)%)

🔄 Update Operations:
   ✅ Updated from CSV: \(.emailsUpdatedFromCSV)
   ⏭️  Already had email: \(.emailsAlreadyPresent)
   ⚠️  Not found in DB: \(.customersNotFound)
"'

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║              Email Fix Process Complete!              ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📁 Generated files:"
echo "   - email-mappings.json    (Company → Email mapping)"
echo "   - update-results.json    (Update statistics)"
echo ""
echo "🔍 Next steps:"
echo "   1. Review update-results.json for detailed stats"
echo "   2. Run verification queries in verify-email-fix.sql"
echo "   3. Test Mailchimp sync with real emails"
echo ""
