-- ============================================================================
-- Add "Major Change" ActivityType
-- ============================================================================
-- Purpose: Add a new ActivityType for significant account changes or permanent
--          notes that should be highlighted at the top of the customer page.
--
-- Date: 2025-11-13
-- Idempotent: Yes - script can be run multiple times safely
-- ============================================================================

-- Get the default tenant ID (first tenant by creation date)
DO $$
DECLARE
  v_tenant_id UUID;
  v_existing_count INTEGER;
BEGIN
  -- Fetch the first tenant
  SELECT id INTO v_tenant_id
  FROM "Tenant"
  ORDER BY "createdAt" ASC
  LIMIT 1;

  -- Check if tenant exists
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found in the database. Please create a tenant first.';
  END IF;

  RAISE NOTICE 'Using tenant ID: %', v_tenant_id;

  -- Check if the ActivityType already exists
  SELECT COUNT(*) INTO v_existing_count
  FROM "ActivityType"
  WHERE "tenantId" = v_tenant_id
    AND code = 'MAJOR_CHANGE';

  -- Only insert if it doesn't exist
  IF v_existing_count = 0 THEN
    INSERT INTO "ActivityType" (
      id,
      "tenantId",
      name,
      code,
      description,
      "createdAt",
      "updatedAt"
    ) VALUES (
      gen_random_uuid(),
      v_tenant_id,
      'Major Change',
      'MAJOR_CHANGE',
      'Significant account changes or permanent notes that should be highlighted at the top of the customer page',
      NOW(),
      NOW()
    );

    RAISE NOTICE '✓ Created ActivityType: Major Change (MAJOR_CHANGE)';
  ELSE
    RAISE NOTICE '↻ ActivityType already exists: Major Change (MAJOR_CHANGE) - Skipping';
  END IF;

END $$;

-- Verify the ActivityType was created/exists
SELECT
  id,
  "tenantId",
  name,
  code,
  description,
  "createdAt",
  "updatedAt"
FROM "ActivityType"
WHERE code = 'MAJOR_CHANGE';
