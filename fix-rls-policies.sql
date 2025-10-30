-- Fix RLS policies to allow service role access
-- Run this in your Supabase SQL editor

-- Tenant table
DROP POLICY IF EXISTS "tenant_isolation" ON "Tenant";
CREATE POLICY "tenant_isolation" ON "Tenant"
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    id = NULLIF(current_setting('app.current_tenant_id'::text, true), '')::uuid
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    id = NULLIF(current_setting('app.current_tenant_id'::text, true), '')::uuid
  );

-- Customer table
DROP POLICY IF EXISTS "customer_tenant_isolation" ON "Customer";
CREATE POLICY "customer_tenant_isolation" ON "Customer"
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    "tenantId" = NULLIF(current_setting('app.current_tenant_id'::text, true), '')::uuid
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    "tenantId" = NULLIF(current_setting('app.current_tenant_id'::text, true), '')::uuid
  );

-- Order table
DROP POLICY IF EXISTS "order_tenant_isolation" ON "Order";
CREATE POLICY "order_tenant_isolation" ON "Order"
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    "tenantId" = NULLIF(current_setting('app.current_tenant_id'::text, true), '')::uuid
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    "tenantId" = NULLIF(current_setting('app.current_tenant_id'::text, true), '')::uuid
  );

-- Invoice table
DROP POLICY IF EXISTS "invoice_tenant_isolation" ON "Invoice";
CREATE POLICY "invoice_tenant_isolation" ON "Invoice"
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    "tenantId" = NULLIF(current_setting('app.current_tenant_id'::text, true), '')::uuid
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    "tenantId" = NULLIF(current_setting('app.current_tenant_id'::text, true), '')::uuid
  );

-- OrderLine table
DROP POLICY IF EXISTS "orderline_tenant_isolation" ON "OrderLine";
CREATE POLICY "orderline_tenant_isolation" ON "OrderLine"
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    "tenantId" = NULLIF(current_setting('app.current_tenant_id'::text, true), '')::uuid
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    "tenantId" = NULLIF(current_setting('app.current_tenant_id'::text, true), '')::uuid
  );

-- Payment table (if it has RLS)
DROP POLICY IF EXISTS "payment_tenant_isolation" ON "Payment";
CREATE POLICY "payment_tenant_isolation" ON "Payment"
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    "tenantId" = NULLIF(current_setting('app.current_tenant_id'::text, true), '')::uuid
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    "tenantId" = NULLIF(current_setting('app.current_tenant_id'::text, true), '')::uuid
  );

-- Verify policies are updated
SELECT
  schemaname,
  tablename,
  policyname,
  qual
FROM pg_policies
WHERE tablename IN ('Tenant', 'Customer', 'Order', 'Invoice', 'OrderLine', 'Payment')
ORDER BY tablename, policyname;
