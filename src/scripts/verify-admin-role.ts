import { prisma } from "../src/lib/prisma";

async function verifyAdminRole() {
  const email = "travis@wellcraftedbeverage.com";

  console.log(`\n🔍 Checking roles for: ${email}\n`);

  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      roles: {
        include: {
          role: true
        }
      }
    }
  });

  if (!user) {
    console.log("❌ User not found!");
    return;
  }

  console.log("✅ User found:");
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.fullName}`);
  console.log(`\n📋 Roles:`);

  if (user.roles.length === 0) {
    console.log("   ❌ NO ROLES ASSIGNED!");
  } else {
    user.roles.forEach(ur => {
      console.log(`   ✅ ${ur.role.code} - ${ur.role.name}`);
    });
  }

  const hasAdminRole = user.roles.some(ur =>
    ur.role.code === "sales.admin" ||
    ur.role.code === "admin" ||
    ur.role.code === "portal.admin"
  );

  console.log(`\n🎯 Has admin access: ${hasAdminRole ? "✅ YES" : "❌ NO"}`);

  if (!hasAdminRole) {
    console.log("\n💡 To grant admin access, run this SQL in Supabase:");
    console.log(`
INSERT INTO "Role" (id, "tenantId", code, name, "isDefault", "createdAt", "updatedAt")
SELECT gen_random_uuid(), '${user.tenantId}', 'sales.admin', 'Sales Admin', false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE code = 'sales.admin' AND "tenantId" = '${user.tenantId}');

INSERT INTO "UserRole" ("userId", "roleId")
SELECT '${user.id}', r.id
FROM "Role" r
WHERE r.code = 'sales.admin' AND r."tenantId" = '${user.tenantId}'
AND NOT EXISTS (SELECT 1 FROM "UserRole" WHERE "userId" = '${user.id}' AND "roleId" = r.id);
    `);
  }
}

verifyAdminRole()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
