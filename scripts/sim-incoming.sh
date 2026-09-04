#!/usr/bin/env bash
# ──────────────────────────────────────────────
#  Simulate an incoming SMS from Android device
# ──────────────────────────────────────────────
set -e

API_URL="${API_URL:-http://localhost:4000}"
FROM="${1:-+19876543210}"
TEXT="${2:-STOP, unsubscribe me please}"
DEVICE_ID="${3:-dev_mock_pixel8_pro}"

echo ""
echo "📥 Simulating Incoming SMS via Gateway Webhook"
echo "──────────────────────────────────────────────"
echo "  From:    $FROM"
echo "  Text:    $TEXT"
echo "  Device:  $DEVICE_ID"
echo ""

curl -s -X POST "$API_URL/v1/webhooks/gateway/incoming" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"$FROM\",
    \"text\": \"$TEXT\",
    \"deviceId\": \"$DEVICE_ID\",
    \"simSlot\": 0,
    \"receivedAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }" | python3 -m json.tool 2>/dev/null || true

echo ""
echo "✅ Webhook callback delivered to SaaS API!"
