#!/bin/bash
# Quick script to regenerate snapshots

set -e

echo "========================================="
echo "AccountHealthSnapshot Generation Script"
echo "========================================="
echo ""

# Database connection details
export PGHOST="aws-1-us-east-1.pooler.supabase.com"
export PGPORT="5432"
export PGDATABASE="postgres"
export PGUSER="postgres.zqezunzlyjkseugujkrl"
export PGPASSWORD="ZKK5pPySuCq7JhpO"

echo "Connecting to database..."
echo "Host: $PGHOST"
echo "Database: $PGDATABASE"
echo ""

echo "Running snapshot generation..."
psql -f /Users/greghogue/Leora2/generate-account-snapshots.sql

echo ""
echo "========================================="
echo "Generation complete!"
echo "========================================="
echo ""
echo "To verify results, run:"
echo "  psql -f /Users/greghogue/Leora2/verify-snapshots.sql"
echo ""
echo "For detailed analysis:"
echo "  psql -f /Users/greghogue/Leora2/final-verification.sql"
