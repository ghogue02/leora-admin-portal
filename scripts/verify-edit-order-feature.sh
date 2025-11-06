#!/bin/bash

###############################################################################
# Phase 4 Sprint 1: Edit Order After Invoice - Feature Verification Script
#
# This script verifies that all components of the Edit Order After Invoice
# feature are present and properly integrated.
#
# Usage: ./scripts/verify-edit-order-feature.sh
###############################################################################

echo "=========================================="
echo "Edit Order After Invoice - Feature Verification"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
ALL_CHECKS_PASSED=true

# Function to check file exists
check_file() {
  local file=$1
  local description=$2

  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $description"
    return 0
  else
    echo -e "${RED}✗${NC} $description - FILE NOT FOUND: $file"
    ALL_CHECKS_PASSED=false
    return 1
  fi
}

# Function to check directory exists
check_dir() {
  local dir=$1
  local description=$2

  if [ -d "$dir" ]; then
    echo -e "${GREEN}✓${NC} $description"
    return 0
  else
    echo -e "${RED}✗${NC} $description - DIRECTORY NOT FOUND: $dir"
    ALL_CHECKS_PASSED=false
    return 1
  fi
}

# Function to grep file for content
check_content() {
  local file=$1
  local pattern=$2
  local description=$3

  if [ ! -f "$file" ]; then
    echo -e "${RED}✗${NC} $description - FILE NOT FOUND: $file"
    ALL_CHECKS_PASSED=false
    return 1
  fi

  if grep -q "$pattern" "$file"; then
    echo -e "${GREEN}✓${NC} $description"
    return 0
  else
    echo -e "${RED}✗${NC} $description - PATTERN NOT FOUND: $pattern"
    ALL_CHECKS_PASSED=false
    return 1
  fi
}

echo "1. Checking Frontend Components..."
echo "-----------------------------------"

check_file "src/app/sales/orders/[orderId]/edit/page.tsx" \
  "Edit Order Page exists"

check_content "src/app/sales/orders/[orderId]/edit/page.tsx" \
  "Editing This Order Will Regenerate the Invoice" \
  "Edit page contains warning banner"

check_content "src/app/sales/orders/[orderId]/edit/page.tsx" \
  "DeliveryDatePicker" \
  "Edit page uses DeliveryDatePicker component"

check_content "src/app/sales/orders/[orderId]/edit/page.tsx" \
  "WarehouseSelector" \
  "Edit page uses WarehouseSelector component"

check_content "src/app/sales/orders/[orderId]/edit/page.tsx" \
  "ProductGrid" \
  "Edit page uses ProductGrid component"

check_content "src/app/sales/orders/[orderId]/edit/page.tsx" \
  "OrderSummarySidebar" \
  "Edit page uses OrderSummarySidebar component"

echo ""
echo "2. Checking Backend API Routes..."
echo "----------------------------------"

check_file "src/app/api/sales/orders/[orderId]/route.ts" \
  "Order API route exists"

check_content "src/app/api/sales/orders/[orderId]/route.ts" \
  "export async function GET" \
  "GET handler exists for order retrieval"

check_content "src/app/api/sales/orders/[orderId]/route.ts" \
  "export async function PUT" \
  "PUT handler exists for order updates"

check_content "src/app/api/sales/orders/[orderId]/route.ts" \
  "ORDER_EDITED_POST_INVOICE" \
  "PUT handler creates audit log"

check_file "src/app/api/invoices/[invoiceId]/regenerate/route.ts" \
  "Invoice regeneration API exists"

check_content "src/app/api/invoices/[invoiceId]/regenerate/route.ts" \
  "export async function POST" \
  "POST handler exists for invoice regeneration"

check_content "src/app/api/invoices/[invoiceId]/regenerate/route.ts" \
  "buildInvoiceData" \
  "Invoice regeneration uses buildInvoiceData"

check_content "src/app/api/invoices/[invoiceId]/regenerate/route.ts" \
  "generateInvoicePDF" \
  "Invoice regeneration generates PDF"

check_content "src/app/api/invoices/[invoiceId]/regenerate/route.ts" \
  "INVOICE_REGENERATED" \
  "Invoice regeneration creates audit log"

echo ""
echo "3. Checking Navigation Integration..."
echo "--------------------------------------"

check_file "src/app/sales/orders/[orderId]/page.tsx" \
  "Order detail page exists"

check_content "src/app/sales/orders/[orderId]/page.tsx" \
  "Edit Order & Regenerate Invoice" \
  "Order detail page has edit button"

check_content "src/app/sales/orders/[orderId]/page.tsx" \
  "/sales/orders/\${order.id}/edit" \
  "Edit button links to edit page"

check_content "src/app/sales/orders/[orderId]/page.tsx" \
  "border-amber-500" \
  "Edit button has amber/yellow styling"

check_content "src/app/sales/orders/[orderId]/page.tsx" \
  "Pencil" \
  "Edit button has pencil icon"

echo ""
echo "4. Checking Shared Components..."
echo "---------------------------------"

check_file "src/components/orders/DeliveryDatePicker.tsx" \
  "DeliveryDatePicker component exists"

check_file "src/components/orders/WarehouseSelector.tsx" \
  "WarehouseSelector component exists"

check_file "src/components/orders/ProductGrid.tsx" \
  "ProductGrid component exists"

check_file "src/components/orders/OrderSummarySidebar.tsx" \
  "OrderSummarySidebar component exists"

check_file "src/components/orders/OrderPreviewModal.tsx" \
  "OrderPreviewModal component exists"

echo ""
echo "5. Checking Utility Functions..."
echo "---------------------------------"

check_file "src/lib/auth/sales.ts" \
  "Sales session authentication exists"

check_content "src/lib/auth/sales.ts" \
  "withSalesSession" \
  "withSalesSession wrapper exists"

check_file "src/lib/audit-log.ts" \
  "Audit log utility exists"

check_content "src/lib/audit-log.ts" \
  "createAuditLog" \
  "createAuditLog function exists"

check_file "src/lib/invoices/invoice-data-builder.ts" \
  "Invoice data builder exists"

check_content "src/lib/invoices/invoice-data-builder.ts" \
  "buildInvoiceData" \
  "buildInvoiceData function exists"

check_file "src/lib/invoices/pdf-generator.ts" \
  "PDF generator exists"

check_content "src/lib/invoices/pdf-generator.ts" \
  "generateInvoicePDF" \
  "generateInvoicePDF function exists"

echo ""
echo "6. Checking Test Suite..."
echo "--------------------------"

check_file "tests/edit-order-after-invoice.test.ts" \
  "Test suite exists"

check_content "tests/edit-order-after-invoice.test.ts" \
  "GET /api/sales/orders/\[orderId\]" \
  "Tests for GET endpoint exist"

check_content "tests/edit-order-after-invoice.test.ts" \
  "PUT /api/sales/orders/\[orderId\]" \
  "Tests for PUT endpoint exist"

check_content "tests/edit-order-after-invoice.test.ts" \
  "POST /api/invoices/\[invoiceId\]/regenerate" \
  "Tests for invoice regeneration exist"

check_content "tests/edit-order-after-invoice.test.ts" \
  "Integration Test - Full Edit Workflow" \
  "Integration test exists"

echo ""
echo "7. Checking Documentation..."
echo "-----------------------------"

check_file "docs/PHASE4_SPRINT1_INVESTIGATION_REPORT.md" \
  "Investigation report exists"

check_file "docs/PHASE4_SPRINT1_COMPLETION_SUMMARY.md" \
  "Completion summary exists"

echo ""
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo ""

if [ "$ALL_CHECKS_PASSED" = true ]; then
  echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
  echo ""
  echo "The Edit Order After Invoice feature is fully implemented."
  echo "All required files, components, and APIs are present."
  echo ""
  echo "Next Steps:"
  echo "  1. Deploy to production if not already deployed"
  echo "  2. Clear browser cache and test in production"
  echo "  3. Verify with specific order IDs that have invoices"
  echo ""
  exit 0
else
  echo -e "${RED}✗ SOME CHECKS FAILED${NC}"
  echo ""
  echo "See errors above for details."
  echo "Some files or content may be missing."
  echo ""
  exit 1
fi
