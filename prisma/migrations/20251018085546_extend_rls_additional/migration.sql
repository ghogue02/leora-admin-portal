DO $$
BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'PriceList';
  IF NOT FOUND THEN
    EXECUTE 'ALTER TABLE "PriceList" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "PriceList" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "pricelist_tenant_isolation" ON "PriceList"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;

  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'PriceListItem';
  IF NOT FOUND THEN
    EXECUTE 'ALTER TABLE "PriceListItem" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "PriceListItem" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "pricelist_item_tenant_isolation" ON "PriceListItem"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;

  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Inventory';
  IF NOT FOUND THEN
    EXECUTE 'ALTER TABLE "Inventory" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "Inventory" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "inventory_tenant_isolation" ON "Inventory"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;

  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'PortalNotification';
  IF NOT FOUND THEN
    EXECUTE 'ALTER TABLE "PortalNotification" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "PortalNotification" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "notification_tenant_isolation" ON "PortalNotification"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;

  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ActivityType';
  IF NOT FOUND THEN
    EXECUTE 'ALTER TABLE "ActivityType" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "ActivityType" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "activity_type_tenant_isolation" ON "ActivityType"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;

  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Activity';
  IF NOT FOUND THEN
    EXECUTE 'ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "Activity" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "activity_tenant_isolation" ON "Activity"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;

  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'AccountHealthSnapshot';
  IF NOT FOUND THEN
    EXECUTE 'ALTER TABLE "AccountHealthSnapshot" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "AccountHealthSnapshot" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "account_health_tenant_isolation" ON "AccountHealthSnapshot"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;

  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'SalesMetric';
  IF NOT FOUND THEN
    EXECUTE 'ALTER TABLE "SalesMetric" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "SalesMetric" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "sales_metric_tenant_isolation" ON "SalesMetric"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;
END;
$$;
