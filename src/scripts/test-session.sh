#!/bin/bash

# Test session validation with a known session ID

SESSION_ID="20ed5247-d961-41a9-9dae-5eede8ffec7a"
COOKIE_HEADER="sales_session_id=$SESSION_ID"

echo "🧪 Testing session validation..."
echo "Session ID: ${SESSION_ID:0:12}..."
echo ""

echo "1️⃣ Test /api/sales/auth/me WITH cookie:"
curl -s -H "Cookie: $COOKIE_HEADER" \
  -H "X-Tenant-Slug: well-crafted" \
  http://localhost:3000/api/sales/auth/me | jq '.user.email // .error'

echo ""
echo "2️⃣ Test /api/sales/auth/me WITHOUT cookie (should fail):"
curl -s -H "X-Tenant-Slug: well-crafted" \
  http://localhost:3000/api/sales/auth/me | jq '.error // "No error"'

echo ""
echo "3️⃣ Test /api/sales/auth/debug WITH cookie:"
curl -s -H "Cookie: $COOKIE_HEADER" \
  http://localhost:3000/api/sales/auth/debug | jq '{sessionId, cookieCount}'

echo ""
echo "✅ Tests complete!"
