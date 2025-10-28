# Customer Import Scripts

## Overview

This directory contains scripts for importing customer data from CSV and classifying customers based on their order history.

## Files Created

1. **check-tenant.ts** - Verifies tenant exists and creates if needed
2. **import-customers.ts** - Main import script with classification
3. **verify-import.ts** - Verification and reporting script

## CSV Structure

The import script expects a CSV file with 23 columns:
- Company name, contact details (first/last name, salutation)
- Contact info (phone, email, billing email, website)
- Financial data (balance, 12-month sales)
- Order history (last order date, salesperson)
- Delivery and shipping details
- Business identifiers (license number, tax number)

## Classification Logic

Customers are automatically classified based on their last order date:

- **ACTIVE** (Priority: HIGH) - Ordered in last 6 months
- **TARGET** (Priority: MEDIUM) - Ordered 6-12 months ago
- **PROSPECT** (Priority: LOW) - Never ordered or >12 months ago

## Database Configuration

The scripts use the `DIRECT_URL` environment variable to bypass the connection pooler for better reliability during bulk imports.

Required environment variables:
- `DIRECT_URL` - Direct PostgreSQL connection URL
- `DEFAULT_TENANT_SLUG` - Tenant identifier (default: 'well-crafted')

## Current Status

**BLOCKED**: Database credentials in .env file are not valid.

### Issue

The Supabase credentials appear to be invalid or expired:
- Connection attempts to both pooled and direct URLs fail with authentication errors
- Both Prisma and MCP tools cannot connect to the database

### Next Steps Required

1. **Update Database Credentials**:
   - Verify Supabase project is active
   - Regenerate database password if needed
   - Update .env file with new credentials:
     - `DATABASE_URL`
     - `DIRECT_URL`
     - `SHADOW_DATABASE_URL`

2. **Run Database Migrations**:
   ```bash
   cd /Users/greghogue/Leora2/web
   npx prisma migrate deploy
   ```

3. **Execute Import**:
   ```bash
   # Check/create tenant
   npx tsx scripts/check-tenant.ts

   # Import customers
   npx tsx scripts/import-customers.ts

   # Verify import
   npx tsx scripts/verify-import.ts
   ```

## Features

- **Deduplication**: Multiple CSV rows per company are handled correctly
- **Data Mapping**: All relevant fields mapped to Customer schema
- **Error Handling**: Failed imports are logged but don't stop the process
- **Progress Reporting**: Shows progress every 100 customers
- **Automatic Classification**: Customers classified based on order history
- **Verification**: Detailed report with breakdowns by type and territory

## CSV File Location

Expected at: `/Users/greghogue/Leora2/Export customers 2025-10-25.csv`

## Dependencies

- `@prisma/client` - Database ORM
- `csv-parse` - CSV parsing library
- `tsx` - TypeScript execution

All dependencies are already installed.
