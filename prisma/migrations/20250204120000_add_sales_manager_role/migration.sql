DO $$
DECLARE
  tenant_record RECORD;
  manager_role_id uuid;
  admin_role_id uuid;
BEGIN
  FOR tenant_record IN SELECT id FROM "Tenant" LOOP
    manager_role_id := NULL;
    admin_role_id := NULL;

    SELECT id INTO manager_role_id
    FROM "Role"
    WHERE code = 'sales.manager' AND "tenantId" = tenant_record.id
    LIMIT 1;

    IF manager_role_id IS NULL THEN
      manager_role_id := gen_random_uuid();
      INSERT INTO "Role" (id, "tenantId", code, name, "isDefault", "createdAt", "updatedAt")
      VALUES (manager_role_id, tenant_record.id, 'sales.manager', 'Sales Manager', false, NOW(), NOW());
    END IF;

    SELECT id INTO admin_role_id
    FROM "Role"
    WHERE code = 'sales.admin' AND "tenantId" = tenant_record.id
    LIMIT 1;

    IF admin_role_id IS NOT NULL THEN
      INSERT INTO "RolePermission" ("roleId", "permissionId")
      SELECT manager_role_id, rp."permissionId"
      FROM "RolePermission" rp
      WHERE rp."roleId" = admin_role_id
        AND NOT EXISTS (
          SELECT 1
          FROM "RolePermission" existing
          WHERE existing."roleId" = manager_role_id
            AND existing."permissionId" = rp."permissionId"
        );
    END IF;
  END LOOP;
END $$;
