# Developer Onboarding Guide - Leora CRM

**Last Updated:** October 25, 2025
**Version:** 2.0.0

---

## Welcome!

This guide will help you set up your development environment and get started contributing to Leora CRM.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Repository Setup](#repository-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Development Workflow](#development-workflow)
7. [Testing](#testing)
8. [Common Gotchas](#common-gotchas)

---

## Prerequisites

### Required Software

**Install the following before proceeding:**

| Software | Version | Download Link |
|----------|---------|---------------|
| **Node.js** | 18.x or higher | [nodejs.org](https://nodejs.org) |
| **npm** | 9.x or higher | (comes with Node.js) |
| **Git** | Latest | [git-scm.com](https://git-scm.com) |
| **PostgreSQL** | 15.x or higher | [postgresql.org](https://postgresql.org) (or use Supabase) |
| **VS Code** | Latest (recommended) | [code.visualstudio.com](https://code.visualstudio.com) |

**Verify installations:**

```bash
node --version  # Should show v18.x or higher
npm --version   # Should show v9.x or higher
git --version   # Any recent version
psql --version  # v15.x or higher (if using local PostgreSQL)
```

### Recommended VS Code Extensions

```bash
# Install via command palette (Cmd+Shift+P → "Extensions: Install Extensions")
- ESLint
- Prettier - Code formatter
- Prisma
- Tailwind CSS IntelliSense
- GitLens
- Error Lens
- Auto Rename Tag
- Path Intellisense
```

---

## Repository Setup

### 1. Clone the Repository

```bash
# HTTPS
git clone https://github.com/yourcompany/leora-crm.git

# SSH (recommended if you have SSH keys set up)
git clone git@github.com:yourcompany/leora-crm.git

# Navigate to project directory
cd leora-crm
```

### 2. Install Dependencies

```bash
# Install all npm packages
npm install

# This will install:
# - Next.js 14.x
# - React 18.x
# - Prisma (database ORM)
# - Tailwind CSS
# - And 200+ other packages

# Installation takes ~2-5 minutes
```

**Expected output:**

```
added 1243 packages in 3m

52 packages are looking for funding
  run `npm fund` for details
```

### 3. Verify Installation

```bash
# Check that dependencies installed correctly
npm list --depth=0

# Should show packages like:
# ├── next@14.2.x
# ├── react@18.3.x
# ├── @prisma/client@5.x
# └── ...
```

---

## Environment Configuration

### 1. Create Environment File

```bash
# Copy the example environment file
cp .env.example .env.local

# Open in editor
code .env.local  # VS Code
# or
nano .env.local  # Terminal editor
```

### 2. Configure Environment Variables

**Minimum required configuration:**

```bash
# ===============================
# DATABASE
# ===============================
# Option 1: Supabase (Recommended for dev)
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Option 2: Local PostgreSQL
# DATABASE_URL="postgresql://postgres:password@localhost:5432/leora_dev"
# DIRECT_URL="postgresql://postgres:password@localhost:5432/leora_dev"

# ===============================
# NEXTAUTH
# ===============================
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"  # Generate: openssl rand -base64 32

# ===============================
# ENCRYPTION (for sensitive data)
# ===============================
ENCRYPTION_KEY="your-encryption-key"  # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ===============================
# CALENDAR SYNC (Optional - can skip initially)
# ===============================
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret
# GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/connect/google/callback

# OUTLOOK_CLIENT_ID=your_outlook_client_id
# OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
# OUTLOOK_TENANT_ID=common
# OUTLOOK_REDIRECT_URI=http://localhost:3000/api/calendar/connect/outlook/callback
```

### 3. Generate Required Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32
# Copy output to .env.local as NEXTAUTH_SECRET

# Generate ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to .env.local as ENCRYPTION_KEY
```

**⚠️ IMPORTANT:** Never commit `.env.local` to version control!

---

## Database Setup

### Option 1: Supabase (Recommended)

**Step 1: Create Supabase Project**

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - **Name:** `leora-dev` (or your name)
   - **Database Password:** (save this!)
   - **Region:** Choose closest to you
5. Click "Create new project" (takes ~2 minutes)

**Step 2: Get Database URL**

1. In Supabase dashboard → Settings → Database
2. Copy "Connection string" (URI format)
3. Replace `[YOUR-PASSWORD]` with your database password
4. Paste into `.env.local` as `DATABASE_URL` and `DIRECT_URL`

**Step 3: Run Migrations**

```bash
# Push Prisma schema to database
npx prisma db push

# Expected output:
# Your database is now in sync with your Prisma schema.
# ✔ Generated Prisma Client

# Generate Prisma Client
npx prisma generate
```

**Step 4: Seed Database (Optional)**

```bash
# Add sample data for development
npm run db:seed

# This creates:
# - 2 test users (admin@leora.com, sales@leora.com)
# - 10 sample customers
# - 20 sample products
# - 5 sample orders
```

### Option 2: Local PostgreSQL

**Step 1: Install PostgreSQL**

```bash
# macOS (via Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt-get install postgresql-15
sudo systemctl start postgresql

# Windows
# Download installer from postgresql.org
```

**Step 2: Create Database**

```bash
# Connect to PostgreSQL
psql postgres

# In psql prompt:
CREATE DATABASE leora_dev;
CREATE USER leora_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE leora_dev TO leora_user;

# Exit psql
\q
```

**Step 3: Update .env.local**

```bash
DATABASE_URL="postgresql://leora_user:your_password@localhost:5432/leora_dev"
DIRECT_URL="postgresql://leora_user:your_password@localhost:5432/leora_dev"
```

**Step 4: Run Migrations**

```bash
npx prisma db push
npx prisma generate
npm run db:seed  # Optional: sample data
```

---

## Running the Application

### 1. Start Development Server

```bash
npm run dev
```

**Expected output:**

```
> leora@1.0.0 dev
> next dev

  ▲ Next.js 14.2.0
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 2.3s
```

### 2. Open in Browser

Navigate to: **http://localhost:3000**

**You should see:**
- Leora CRM login page

### 3. Login with Test Account

**If you ran the seed script:**

```
Email: admin@leora.com
Password: password123
```

**Or create a new account:**
1. Click "Sign Up"
2. Fill in form
3. Submit

### 4. Verify Everything Works

**Checklist:**
- ✅ Can log in
- ✅ Dashboard loads
- ✅ Can navigate to Customers page
- ✅ Can navigate to Orders page
- ✅ Can view admin panel (if admin user)

---

## Development Workflow

### Project Structure

```
leora-crm/
├── .next/                # Next.js build output (auto-generated)
├── docs/                 # Documentation
├── node_modules/         # Dependencies (auto-generated)
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database schema definition
│   └── seed.ts           # Database seeding script
├── public/               # Static assets
│   ├── icons/            # PWA icons
│   └── manifest.json     # PWA manifest
├── src/
│   ├── app/              # Next.js app directory (routes)
│   │   ├── api/          # API routes
│   │   ├── admin/        # Admin pages
│   │   ├── sales/        # Sales pages
│   │   └── portal/       # Customer portal
│   ├── components/       # Reusable React components
│   ├── lib/              # Utility functions and services
│   │   ├── prisma.ts     # Prisma client instance
│   │   ├── calendar-sync.ts  # Calendar sync service
│   │   └── auth.ts       # Authentication config
│   └── types/            # TypeScript type definitions
├── tests/                # Test files
├── .env.local            # Environment variables (DO NOT COMMIT)
├── .env.example          # Example environment file
├── .gitignore            # Git ignore rules
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
└── tailwind.config.ts    # Tailwind CSS configuration
```

### Making Changes

**1. Create a feature branch:**

```bash
git checkout -b feature/your-feature-name
```

**2. Make changes:**

- Edit files in `src/` directory
- Dev server auto-reloads on file save
- Check browser for changes

**3. Test changes:**

```bash
# Run type checking
npm run typecheck

# Run linter
npm run lint

# Run tests
npm run test

# Run all checks
npm run validate
```

**4. Commit changes:**

```bash
git add .
git commit -m "feat: add your feature description"
```

**5. Push to GitHub:**

```bash
git push origin feature/your-feature-name
```

**6. Create Pull Request:**

1. Go to GitHub repository
2. Click "New Pull Request"
3. Select your branch
4. Fill in PR description
5. Request review

### Adding a New API Route

**Example: Create `/api/hello` endpoint**

```bash
# Create file
mkdir -p src/app/api/hello
touch src/app/api/hello/route.ts
```

```typescript
// src/app/api/hello/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Hello from Leora CRM API!',
    timestamp: new Date().toISOString(),
  });
}
```

**Test:**

```bash
curl http://localhost:3000/api/hello
```

### Adding a New Page

**Example: Create `/sales/reports` page**

```bash
# Create page file
mkdir -p src/app/sales/reports
touch src/app/sales/reports/page.tsx
```

```typescript
// src/app/sales/reports/page.tsx
export default function ReportsPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Sales Reports</h1>
      <p>This is the reports page.</p>
    </div>
  );
}
```

**Access:** http://localhost:3000/sales/reports

### Database Schema Changes

**1. Edit Prisma schema:**

```prisma
// prisma/schema.prisma

model NewModel {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
}
```

**2. Push changes to database:**

```bash
npx prisma db push
```

**3. Generate updated Prisma Client:**

```bash
npx prisma generate
```

**4. Use in code:**

```typescript
import { prisma } from '@/lib/prisma';

const newRecord = await prisma.newModel.create({
  data: { name: 'Test' }
});
```

---

## Testing

### Run Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode (re-runs on file change)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/app/api/hello/route.test.ts
```

### Writing Tests

**Example: API route test**

```typescript
// src/app/api/hello/route.test.ts
import { GET } from './route';

describe('/api/hello', () => {
  it('returns hello message', async () => {
    const request = new Request('http://localhost:3000/api/hello');
    const response = await GET(request);
    const data = await response.json();

    expect(data.message).toBe('Hello from Leora CRM API!');
    expect(data.timestamp).toBeDefined();
  });
});
```

### Linting and Formatting

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without changing files
npm run format:check
```

---

## Common Gotchas

### 1. Database Connection Errors

**Error:** `Can't reach database server at db.xxx.supabase.co:5432`

**Solutions:**
- Check internet connection
- Verify `DATABASE_URL` in `.env.local`
- Ensure Supabase project is active
- Check Supabase dashboard for project status

### 2. Prisma Client Not Generated

**Error:** `Cannot find module '@prisma/client'`

**Solution:**

```bash
npx prisma generate
```

### 3. Port Already in Use

**Error:** `Port 3000 is already in use`

**Solutions:**

```bash
# Option 1: Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Option 2: Use different port
PORT=3001 npm run dev
```

### 4. Environment Variables Not Loading

**Error:** Variables are `undefined` in code

**Solutions:**
- Ensure file is named `.env.local` (not `.env`)
- Restart dev server after changing `.env.local`
- Prefix public variables with `NEXT_PUBLIC_`

### 5. Styling Not Applying

**Error:** Tailwind classes not working

**Solutions:**

```bash
# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev
```

### 6. Type Errors After Schema Change

**Error:** TypeScript errors after Prisma schema update

**Solution:**

```bash
# Regenerate Prisma types
npx prisma generate

# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## Helpful Commands

### Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint checking
npm run format       # Prettier formatting
```

### Database

```bash
npx prisma studio    # Open Prisma Studio (database GUI)
npx prisma db push   # Push schema to database
npx prisma generate  # Generate Prisma Client
npm run db:seed      # Seed database with sample data
npx prisma migrate dev --name migration_name  # Create migration
```

### Testing

```bash
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

---

## Next Steps

**Now that you're set up:**

1. **Read the docs:**
   - `/docs/LEORA_IMPLEMENTATION_PLAN.md` - Project overview
   - `/docs/ARCHITECTURE.md` - System architecture
   - `/docs/API_REFERENCE.md` - API documentation

2. **Explore the codebase:**
   - Browse `src/app/` for page routing
   - Check `src/app/api/` for API routes
   - Review `src/components/` for reusable components

3. **Pick up a task:**
   - Check GitHub Issues for "good first issue" labels
   - Ask your team lead for onboarding tasks

4. **Join the team:**
   - Slack: #engineering
   - Daily standup: 9:00 AM PST
   - Weekly sprint planning: Mondays 2:00 PM PST

---

## Getting Help

**Resources:**
- **Documentation:** `/docs` directory
- **Slack:** #engineering-support
- **Email:** dev-support@leoracrm.com
- **Office Hours:** Fridays 3-4 PM PST

**Common Questions:**
- "How do I...?" → Ask in #engineering Slack
- "Why is this failing?" → Check `/docs/TROUBLESHOOTING.md`
- "Can I change this?" → Ask your team lead

---

## Welcome to the Team! 🎉

You're all set to start contributing to Leora CRM. Happy coding!
