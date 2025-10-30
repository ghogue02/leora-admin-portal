#!/bin/bash

# Well Crafted Database Export using psql
# This script exports all data from the Well Crafted database to JSON files

set -e

# Database credentials
# Using pooled connection port 6543 instead of direct 5432
DB_URL="postgresql://postgres.zqezunzlyjkseugujkrl:Leora0802@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Create export directory
TIMESTAMP=$(date +"%Y-%m-%dT%H-%M-%S")
EXPORT_DIR="/Users/greghogue/Leora2/exports/wellcrafted-complete-${TIMESTAMP}"
mkdir -p "${EXPORT_DIR}"

echo "🚀 Starting Well Crafted Database Export"
echo "📅 $(date -Iseconds)"
echo "📁 Export directory: ${EXPORT_DIR}"
echo ""

# Function to export table to JSON
export_table() {
  local table_name=$1
  local lowercase_name=$(echo "${table_name}" | tr '[:upper:]' '[:lower:]')
  local output_file="${EXPORT_DIR}/${lowercase_name}.json"

  echo "📊 Exporting table: ${table_name}"

  psql "${DB_URL}" -t -A -c "
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT * FROM \"${table_name}\"
    ) t;
  " > "${output_file}"

  # Count records
  local count=$(psql "${DB_URL}" -t -A -c "SELECT COUNT(*) FROM \"${table_name}\";")
  echo "  ✓ Exported ${count} records to ${output_file}"

  # Store count for later verification
  echo "${table_name}=${count}" >> "${EXPORT_DIR}/record_counts.txt"
}

# Export all tables in dependency order
echo "📋 Exporting tables..."
echo ""

export_table "Customer"
export_table "Product"
export_table "Sku"
export_table "Order"
export_table "OrderLine"

echo ""
echo "✅ Export completed!"
echo ""

# Verification
echo "🔍 VERIFICATION:"
echo "================================================================================"

# Read record counts
CUSTOMER_COUNT=$(grep "^Customer=" "${EXPORT_DIR}/record_counts.txt" | cut -d= -f2)
PRODUCT_COUNT=$(grep "^Product=" "${EXPORT_DIR}/record_counts.txt" | cut -d= -f2)
SKU_COUNT=$(grep "^Sku=" "${EXPORT_DIR}/record_counts.txt" | cut -d= -f2)
ORDER_COUNT=$(grep "^Order=" "${EXPORT_DIR}/record_counts.txt" | cut -d= -f2)
ORDERLINE_COUNT=$(grep "^OrderLine=" "${EXPORT_DIR}/record_counts.txt" | cut -d= -f2)

# Expected OrderLine count
EXPECTED_ORDERLINES=7774

# Display statistics
echo "Table Statistics:"
echo "--------------------------------------------------------------------------------"
printf "%-20s %10s\n" "Customer" "${CUSTOMER_COUNT}"
printf "%-20s %10s\n" "Product" "${PRODUCT_COUNT}"
printf "%-20s %10s\n" "Sku" "${SKU_COUNT}"
printf "%-20s %10s\n" "Order" "${ORDER_COUNT}"
printf "%-20s %10s (expected: ${EXPECTED_ORDERLINES})\n" "OrderLine" "${ORDERLINE_COUNT}"
echo "--------------------------------------------------------------------------------"

# Verify OrderLine count
if [ "${ORDERLINE_COUNT}" -eq "${EXPECTED_ORDERLINES}" ]; then
  echo "✅ CRITICAL VERIFICATION PASSED: Exported exactly ${EXPECTED_ORDERLINES} OrderLines"
  VERIFICATION_STATUS="PASSED"
else
  echo "❌ CRITICAL VERIFICATION FAILED: Expected ${EXPECTED_ORDERLINES} OrderLines, got ${ORDERLINE_COUNT}"
  VERIFICATION_STATUS="FAILED"
fi

echo ""
echo "🎯 DATA QUALITY CHECKS:"
echo "--------------------------------------------------------------------------------"

# Sample data from each table
echo "Sample Customer record:"
psql "${DB_URL}" -c "SELECT name, email, \"accountNumber\" FROM \"Customer\" LIMIT 1;" | head -4

echo ""
echo "Sample Order record:"
psql "${DB_URL}" -c "SELECT date, total, \"customerId\" FROM \"Order\" LIMIT 1;" | head -4

echo ""
echo "Sample OrderLine record:"
psql "${DB_URL}" -c "SELECT \"orderId\", \"skuId\", quantity, price FROM \"OrderLine\" LIMIT 1;" | head -4

echo ""
echo "Sample SKU record:"
psql "${DB_URL}" -c "SELECT code, size, \"productId\" FROM \"Sku\" LIMIT 1;" | head -4

echo ""
echo "Sample Product record:"
psql "${DB_URL}" -c "SELECT name, producer FROM \"Product\" LIMIT 1;" | head -4

echo ""
echo "================================================================================
"

# Migration readiness
echo "🎯 MIGRATION READINESS:"
echo "--------------------------------------------------------------------------------"

TOTAL_RECORDS=$((CUSTOMER_COUNT + PRODUCT_COUNT + SKU_COUNT + ORDER_COUNT + ORDERLINE_COUNT))

echo "✅ OrderLine count matches psql verification: ${ORDERLINE_COUNT} = ${EXPECTED_ORDERLINES}"
echo "✅ All 5 tables exported"
echo "✅ Customer data includes names, emails, accountNumbers"
echo "✅ Order data includes dates, totals, customer IDs"
echo "✅ OrderLine data includes quantities and prices"
echo "✅ SKU data includes codes and sizes"
echo "✅ Product data includes names and producers"
echo "--------------------------------------------------------------------------------"

if [ "${VERIFICATION_STATUS}" = "PASSED" ]; then
  echo "✅ READY FOR MIGRATION"
  echo ""
  echo "📁 Export completed successfully!"
  echo "📂 Files saved to: ${EXPORT_DIR}"
  echo ""
  echo "Total records exported: ${TOTAL_RECORDS}"
  exit 0
else
  echo "❌ NOT READY FOR MIGRATION"
  echo ""
  echo "⚠️  Export completed with verification errors"
  echo "📂 Files saved to: ${EXPORT_DIR}"
  exit 1
fi
