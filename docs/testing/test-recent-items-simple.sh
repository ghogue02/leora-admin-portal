#!/bin/bash
# Simple shell script to test the recent-items API endpoint
# Usage: bash docs/testing/test-recent-items-simple.sh [customer-id]

CUSTOMER_ID=${1:-"test-customer-id"}
PORT=3000

echo "🧪 Testing Recent Items API"
echo "================================"
echo ""
echo "Configuration:"
echo "  Port: $PORT"
echo "  Customer ID: $CUSTOMER_ID"
echo "  Endpoint: /api/sales/customers/$CUSTOMER_ID/recent-items"
echo ""

# Check if server is running
echo "1. Checking if server is running..."
if curl -s -f http://localhost:$PORT > /dev/null; then
    echo "   ✅ Server is running on port $PORT"
else
    echo "   ❌ Server is not responding on port $PORT"
    echo "   💡 Try: npm run dev"
    exit 1
fi
echo ""

# Test the API endpoint
echo "2. Testing recent-items endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:$PORT/api/sales/customers/$CUSTOMER_ID/recent-items)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "   Status Code: $HTTP_CODE"
echo ""

# Parse response based on status code
case $HTTP_CODE in
    200)
        echo "   ✅ SUCCESS - API is working"
        echo ""
        echo "   Response:"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
        ;;
    401)
        echo "   🔒 UNAUTHORIZED - Authentication required"
        echo "   💡 This endpoint requires a valid sales session"
        echo ""
        echo "   Response:"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
        ;;
    403)
        echo "   🚫 FORBIDDEN - Not authorized"
        echo "   💡 User may not have sales rep profile or access to this customer"
        echo ""
        echo "   Response:"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
        ;;
    404)
        echo "   ❌ NOT FOUND - Customer not found"
        echo "   💡 Customer may not exist or not assigned to this sales rep"
        echo ""
        echo "   Response:"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
        ;;
    500)
        echo "   💥 SERVER ERROR - Check dev server logs"
        echo ""
        echo "   Response:"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
        echo ""
        echo "   Check logs:"
        echo "   tail -f /tmp/dev-server.log"
        ;;
    *)
        echo "   ⚠️  Unexpected status: $HTTP_CODE"
        echo ""
        echo "   Response:"
        echo "$BODY"
        ;;
esac

echo ""
echo "================================"
echo "Test complete"
