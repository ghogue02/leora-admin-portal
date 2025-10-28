#!/bin/bash

# Database State Checker
# Uses psql to query Supabase database state directly

DB_HOST="db.zqezunzlyjkseugujkrl.supabase.co"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="postgres"
DB_PASS="9gpGHuAIr2vKf4hO"

export PGPASSWORD="$DB_PASS"

echo "🔍 Checking database state..."
echo ""

echo "📋 Enums:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
  t.typname as enum_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname IN ('AccountType', 'AccountPriority', 'CallPlanStatus', 'ContactOutcome', 'CustomerRiskStatus')
GROUP BY t.typname
ORDER BY t.typname;
"

echo ""
echo "📊 Tables & Row Counts:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 'Customer' as table_name, COUNT(*) as row_count FROM \"Customer\"
UNION ALL
SELECT 'CallPlan', COUNT(*) FROM \"CallPlan\"
UNION ALL
SELECT 'CallPlanAccount', COUNT(*) FROM \"CallPlanAccount\"
UNION ALL
SELECT 'CallPlanActivity', COUNT(*) FROM \"CallPlanActivity\"
UNION ALL
SELECT 'CalendarSync', COUNT(*) FROM \"CalendarSync\"
ORDER BY table_name;
"

echo ""
echo "👥 Customer Schema:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Customer'
  AND column_name IN ('accountType', 'accountPriority', 'riskStatus', 'territory', 'salesRepId')
ORDER BY column_name;
"

echo ""
echo "✅ Analysis complete!"
