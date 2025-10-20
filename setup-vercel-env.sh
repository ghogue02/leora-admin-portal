#!/bin/bash

# Vercel Environment Variables Setup Script
# This script reads from .env.local and sets them in Vercel (trimming whitespace)

set -e

echo "🚀 Setting up Vercel environment variables..."
echo ""

# Read env file and set each variable
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ $key =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue

  # Trim whitespace and quotes
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs | sed 's/^"//' | sed 's/"$//')

  # Skip if empty
  [[ -z "$value" ]] && continue

  echo "📝 Setting: $key"

  # Set for all environments (production, preview, development)
  vercel env add "$key" production <<< "$value" 2>/dev/null || echo "   Already exists in production"
  vercel env add "$key" preview <<< "$value" 2>/dev/null || echo "   Already exists in preview"
  vercel env add "$key" development <<< "$value" 2>/dev/null || echo "   Already exists in development"

done < .env.local

echo ""
echo "✅ Environment variables setup complete!"
echo ""
echo "Next steps:"
echo "1. Verify at: https://vercel.com/gregs-projects-61e51c01/web/settings/environment-variables"
echo "2. Trigger new deployment: vercel --prod"
