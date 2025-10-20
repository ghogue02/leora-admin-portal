-- Enable Row-Level Security for core portal tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Order'
  ) THEN
    EXECUTE 'ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "Order" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "order_tenant_isolation" ON "Order"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Invoice'
  ) THEN
    EXECUTE 'ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "Invoice" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "invoice_tenant_isolation" ON "Invoice"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart'
  ) THEN
    EXECUTE 'ALTER TABLE "Cart" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "Cart" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "cart_tenant_isolation" ON "Cart"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'CartItem'
  ) THEN
    EXECUTE 'ALTER TABLE "CartItem" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "CartItem" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "cart_item_tenant_isolation" ON "CartItem"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'PortalFavorite'
  ) THEN
    EXECUTE 'ALTER TABLE "PortalFavorite" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "PortalFavorite" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "favorites_tenant_isolation" ON "PortalFavorite"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'PortalReplayStatus'
  ) THEN
    EXECUTE 'ALTER TABLE "PortalReplayStatus" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "PortalReplayStatus" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "replay_status_tenant_isolation" ON "PortalReplayStatus"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'SupportTicket'
  ) THEN
    EXECUTE 'ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "SupportTicket" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "support_ticket_tenant_isolation" ON "SupportTicket"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'SupportTicketAttachment'
  ) THEN
    EXECUTE 'ALTER TABLE "SupportTicketAttachment" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "SupportTicketAttachment" FORCE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY "support_ticket_attachment_tenant_isolation" ON "SupportTicketAttachment"
      USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
      WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', TRUE), '''')::uuid)
    ';
  END IF;
END;
$$;
