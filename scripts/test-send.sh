#!/usr/bin/env bash
# ──────────────────────────────────────────────
#  Quick test: Send an SMS via the SaaS API
# ──────────────────────────────────────────────
set -e

API_URL="${API_URL:-http://localhost:4000}"
API_KEY="${API_KEY:-ak_live_demo123}"
PHONE="${1:-+1234567890}"
TEXT="${2:-Hello from SMS Gateway SaaS! 🚀}"

echo ""
echo "📱 SMS Gateway SaaS — Test Send"
echo "────────────────────────────────"
echo "  API:   $API_URL"
echo "  To:    $PHONE"
echo "  Text:  $TEXT"
echo ""

# 1. Health check
echo "🏥 Checking API health..."
curl -s "$API_URL/health" | python3 -m json.tool 2>/dev/null || curl -s "$API_URL/health"
echo ""

# 2. Send message
echo "📤 Sending message..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/v1/messages" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"to\": \"$PHONE\", \"text\": \"$TEXT\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "  HTTP Status: $HTTP_CODE"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

# 3. Extract message ID and poll status
MSG_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || echo "")

if [ -n "$MSG_ID" ]; then
  echo "📊 Checking message status (ID: $MSG_ID)..."
  sleep 1
  curl -s "$API_URL/v1/messages/$MSG_ID" \
    -H "Authorization: Bearer $API_KEY" | python3 -m json.tool 2>/dev/null
fi

echo ""
echo "✅ Done!"
