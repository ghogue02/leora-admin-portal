#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB_DIR="$REPO_ROOT/web"
ENV_FILE="${1:-.env.local}"
ENV_PATH="$WEB_DIR/${ENV_FILE}"
CONFIG_PROJECT_REF=""
if [[ -f "$REPO_ROOT/supabase/config.toml" ]]; then
  CONFIG_PROJECT_REF="$(grep -E '^project_id' "$REPO_ROOT/supabase/config.toml" | sed -E 's/.*"([^"]+)".*/\1/')"
fi
PROJECT_REF="${SUPABASE_PROJECT_REF:-$CONFIG_PROJECT_REF}"

if [[ ! -f "$ENV_PATH" ]]; then
  echo "⚠️  No ${ENV_FILE} found at $ENV_PATH."
  echo "    Create one from .env.local.example before pushing secrets."
  exit 1
fi

echo "🔐 Pushing Supabase secrets from ${ENV_FILE}..."
cd "$REPO_ROOT"
if [[ -n "$PROJECT_REF" ]]; then
  supabase secrets set --project-ref "$PROJECT_REF" --env-file "$ENV_PATH"
else
  supabase secrets set --env-file "$ENV_PATH"
fi
echo "✅ Supabase secrets updated."
