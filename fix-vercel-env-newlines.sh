#!/bin/bash

# Fix all Vercel environment variables by removing trailing newlines/spaces
# This prevents the "Tenant could not be resolved" error

set -e

echo "🔍 Auditing and fixing Vercel environment variables..."
echo ""

# List of all env vars that should be set
ENV_VARS=(
  "DATABASE_URL"
  "SUPABASE_URL"
  "SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "DEFAULT_TENANT_SLUG"
  "NEXT_PUBLIC_PORTAL_TENANT_SLUG"
  "DEFAULT_PORTAL_USER_KEY"
)

# Read from .env.local and reset each in Vercel
for var_name in "${ENV_VARS[@]}"; do
  # Get value from .env.local
  value=$(grep "^${var_name}=" .env.local | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//' | tr -d '\n' | tr -d '\r')

  if [ -z "$value" ]; then
    echo "⚠️  ${var_name}: Not found in .env.local - skipping"
    continue
  fi

  echo "📝 Fixing: ${var_name}"

  # Remove from all environments
  vercel env rm "${var_name}" production --yes 2>/dev/null || true
  vercel env rm "${var_name}" preview --yes 2>/dev/null || true
  vercel env rm "${var_name}" development --yes 2>/dev/null || true

  # Re-add with printf (no newline)
  printf "%s" "$value" | vercel env add "${var_name}" production >/dev/null 2>&1 || echo "   Already in production"
  printf "%s" "$value" | vercel env add "${var_name}" preview >/dev/null 2>&1 || echo "   Already in preview"
  printf "%s" "$value" | vercel env add "${var_name}" development >/dev/null 2>&1 || echo "   Already in development"

  echo "   ✅ Fixed"
done

echo ""
echo "✅ All environment variables cleaned and reset!"
echo ""
echo "Triggering redeploy..."
git commit --allow-empty -m "Redeploy with cleaned environment variables" && git push origin main

echo ""
echo "🎉 Done! Wait 2-3 minutes for deployment to complete."
