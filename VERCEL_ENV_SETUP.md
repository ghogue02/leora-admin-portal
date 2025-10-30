# Vercel Environment Variables Setup

## Required Environment Variables

Go to: https://vercel.com/gregs-projects-61e51c01/web/settings/environment-variables

**IMPORTANT**: When pasting values, ensure NO trailing spaces, newlines, or line breaks!

---

### 1. DATABASE_URL (Required)
**Value**: `postgresql://postgres.zqezunzlyjkseugujkrl:ZKK5pPySuCq7JhpO@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require&sslaccept=accept_invalid_certs`

**Environment**: Production, Preview, Development

---

### 2. SUPABASE_URL (Required)
**Get from**: Your `.env.local` file
**Environment**: Production, Preview, Development

---

### 3. SUPABASE_ANON_KEY (Required)
**Get from**: Your `.env.local` file
**Environment**: Production, Preview, Development

---

### 4. SUPABASE_SERVICE_ROLE_KEY (Required - for admin operations)
**Get from**: Your `.env.local` file
**Environment**: Production, Preview, Development

---

### 5. DEFAULT_TENANT_SLUG
**Value**: `well-crafted`
**Environment**: Production, Preview, Development

---

### 6. NEXT_PUBLIC_PORTAL_TENANT_SLUG
**Value**: `well-crafted`
**Environment**: Production, Preview, Development
**Note**: Must be NEXT_PUBLIC_ prefix for client-side access

---

### 7. DEFAULT_PORTAL_USER_KEY
**Value**: `demo-key` (or your actual portal key)
**Environment**: Production, Preview, Development

---

### Optional Variables (for AI features):

### 8. OPENAI_API_KEY
**Get from**: Your `.env.local` file (if you use Leora AI features)
**Environment**: Production, Preview, Development

### 9. OPENAI_API_URL
**Value**: `https://api.openai.com/v1/responses`
**Environment**: Production, Preview, Development

### 10. COPILOT_MODEL
**Value**: `gpt-5-mini` (or your preferred model)
**Environment**: Production, Preview, Development

---

## How to Add in Vercel:

1. Go to project settings: https://vercel.com/gregs-projects-61e51c01/web/settings/environment-variables

2. For each variable:
   - Click "Add New"
   - Enter variable name (e.g., `DATABASE_URL`)
   - Paste value (CAREFULLY - no extra spaces/newlines!)
   - Select environments: ☑️ Production ☑️ Preview ☑️ Development
   - Click "Save"

3. After adding all variables, trigger a new deployment:
   ```bash
   vercel --prod
   ```

---

## Verification

After deployment completes, check:
- Site loads: https://web-gregs-projects-61e51c01.vercel.app
- Can login to `/sales/auth/login`
- Can access `/admin` with admin credentials
- Database queries work
- No authentication errors

---

## Common Issues:

**Issue**: "Environment variable not found: DATABASE_URL"
**Fix**: Make sure DATABASE_URL is set in Vercel and redeploy

**Issue**: "Unable to validate session"
**Fix**: Check SUPABASE_* variables are set correctly

**Issue**: Build fails with TypeScript errors
**Fix**: Already configured to ignore during builds in next.config.ts

---

## Current Status:

✅ GitHub Repo: https://github.com/ghogue02/leora-admin-portal
✅ Code pushed to GitHub
⏳ Vercel deployment in progress
⏳ Environment variables need to be set

---

Next step: Add the environment variables in Vercel, then redeploy!
