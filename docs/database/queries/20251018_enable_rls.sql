-- Enable and force RLS on pricing, inventory, notifications, and analytics tables.
ALTER TABLE "PriceList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceList" FORCE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS pricelist_tenant_isolation ON "PriceList"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid);

ALTER TABLE "PriceListItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceListItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS pricelist_item_tenant_isolation ON "PriceListItem"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid);

ALTER TABLE "Inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inventory" FORCE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS inventory_tenant_isolation ON "Inventory"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid);

ALTER TABLE "PortalNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PortalNotification" FORCE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS notification_tenant_isolation ON "PortalNotification"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid);

ALTER TABLE "ActivityType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityType" FORCE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS activity_type_tenant_isolation ON "ActivityType"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid);

ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" FORCE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS activity_tenant_isolation ON "Activity"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid);

ALTER TABLE "AccountHealthSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountHealthSnapshot" FORCE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS account_health_tenant_isolation ON "AccountHealthSnapshot"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid);

ALTER TABLE "SalesMetric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesMetric" FORCE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS sales_metric_tenant_isolation ON "SalesMetric"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid);
