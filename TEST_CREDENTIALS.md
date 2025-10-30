# 🔐 Test Credentials for Leora CRM
## Login Information for Testing

**Date:** October 25, 2025
**Environment:** Development (localhost:3000)

---

## 🚀 **Quick Start**

**URL:** http://localhost:3000

**Default Login Path:** http://localhost:3000/sales/login

---

## 👤 **DEFAULT TEST CREDENTIALS**

Based on your environment configuration in `.env`:

### **Sales Portal Login:**

**Email:** Based on `DEFAULT_PORTAL_USER_KEY` = "dev-portal-user"
**Default Domain:** `PORTAL_USER_EMAIL_DOMAIN` = "example.dev"

**Likely Credentials:**
- **Email:** `dev-portal-user@example.dev`
- **Password:** Check in database or use default from seed scripts

---

## 🔑 **ALTERNATIVE: Check Database for Users**

Run this to see actual users:

```bash
cd /Users/greghogue/Leora2/web

# Query users in database
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const connectionUrl = 'postgresql://postgres:9gpGHuAIr2vKf4hO@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres';
const prisma = new PrismaClient({
  datasources: { db: { url: connectionUrl } }
});

async function getUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true }
  });
  console.log('Users in database:');
  console.table(users);

  const portalUsers = await prisma.portalUser.findMany({
    select: { id: true, email: true, name: true, customerId: true }
  });
  console.log('Portal Users:');
  console.table(portalUsers);

  await prisma.\$disconnect();
}

getUsers();
"
```

---

## 🏢 **TENANT INFORMATION**

**Tenant ID:** `58b8126a-2d2f-4f55-bc98-5b6784800bed`
**Tenant Name:** Well Crafted Wine & Beverage Co.
**Tenant Domain:** well-crafted

---

## 🔧 **CREATE TEST USER (If Needed)**

If no users exist, create one:

```bash
cd /Users/greghogue/Leora2/web

# Create test user script
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const connectionUrl = 'postgresql://postgres:9gpGHuAIr2vKf4hO@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres';
const prisma = new PrismaClient({
  datasources: { db: { url: connectionUrl } }
});

async function createTestUser() {
  const tenantId = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
  const hashedPassword = await bcrypt.hash('test123', 10);

  const user = await prisma.user.create({
    data: {
      tenantId: tenantId,
      email: 'test@wellcrafted.com',
      name: 'Test User',
      role: 'admin',
      passwordHash: hashedPassword
    }
  });

  console.log('✅ Test user created:');
  console.log('Email: test@wellcrafted.com');
  console.log('Password: test123');
  console.log('Role: admin');

  await prisma.\$disconnect();
}

createTestUser();
"
```

---

## 📋 **TEST USER CREDENTIALS**

After running the script above:

**Email:** `test@wellcrafted.com`
**Password:** `test123`
**Role:** admin

---

## 🧪 **FOR TESTING**

**Once logged in, you can access:**

- **Dashboard:** http://localhost:3000/sales/dashboard
- **Customers:** http://localhost:3000/sales/customers (4,838 customers)
- **CARLA:** http://localhost:3000/sales/call-plan/carla
- **Job Queue:** http://localhost:3000/sales/admin/jobs
- **Samples:** http://localhost:3000/sales/analytics/samples (after Phase 3 deployment)
- **Warehouse:** http://localhost:3000/sales/warehouse (after Phase 5 deployment)
- **Map:** http://localhost:3000/sales/map (after Phase 6 deployment)

---

## 🔒 **DATABASE CONNECTION**

**Direct Connection (Working):**
```
postgresql://postgres:9gpGHuAIr2vKf4hO@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres
```

**Tenant ID:**
```
58b8126a-2d2f-4f55-bc98-5b6784800bed
```

---

## 🐛 **TROUBLESHOOTING**

### **Issue: Cannot Login**
**Solution:** Create test user with script above

### **Issue: 401 Unauthorized**
**Solution:** Check session configuration, verify user exists

### **Issue: 500 Server Error**
**Fixed!** Prisma middleware issue resolved

### **Issue: Database Connection Failed**
**Solution:** Use connection string above (password: `9gpGHuAIr2vKf4hO`)

---

## 📞 **NEED HELP?**

Check these files:
- `/web/.env` - Environment configuration
- `/web/src/lib/auth/` - Authentication code
- `/docs/DEVELOPER_ONBOARDING.md` - Complete setup guide

---

**Save these credentials for testing!**
