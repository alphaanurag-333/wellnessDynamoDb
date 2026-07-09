#!/usr/bin/env bash
# =============================================================================
# Wellness User API — Heal Consultancy Tracks
# Base path: /api/user/heal-consultancy-tracks
#
# Requirements:
#   - Heal-tier user (userTier = heal)
#   - User must have parentCoachId assigned
#   - Bearer accessToken from /api/user/auth/login or /api/user/auth/login/password
#
# Usage (bash / Git Bash / WSL):
#   export BASE_URL="http://localhost:5000/api"
#   export ACCESS_TOKEN="your_jwt_access_token"
#   bash Backend/postman/Wellness-User-Heal-Consultancy.curl.sh
#
# PowerShell:
#   $env:BASE_URL = "http://localhost:5000/api"
#   $env:ACCESS_TOKEN = "your_jwt_access_token"
#   bash Backend/postman/Wellness-User-Heal-Consultancy.curl.sh
# =============================================================================

BASE_URL="${BASE_URL:-http://localhost:5000/api}"
ACCESS_TOKEN="${ACCESS_TOKEN:-REPLACE_WITH_USER_ACCESS_TOKEN}"
AUTH_HEADER="Authorization: Bearer ${ACCESS_TOKEN}"
JSON_HEADER="Content-Type: application/json"

echo "=== 0) Login (get access token) — run once, copy accessToken ==="
echo '# Password login example:'
cat <<'EOF'
curl --request POST \
  --url "${BASE_URL}/user/auth/login/password" \
  --header "Content-Type: application/json" \
  --data '{
    "email": "user@example.com",
    "password": "your_password"
  }'
EOF
echo ""
echo '# OTP login (step 1 — send OTP):'
cat <<'EOF'
curl --request POST \
  --url "${BASE_URL}/user/auth/otp/send" \
  --header "Content-Type: application/json" \
  --data '{
    "phone": "+919876543210"
  }'
EOF
echo ""
echo '# OTP login (step 2 — verify and receive tokens):'
cat <<'EOF'
curl --request POST \
  --url "${BASE_URL}/user/auth/otp/verify" \
  --header "Content-Type: application/json" \
  --data '{
    "phone": "+919876543210",
    "otp": "123456"
  }'
EOF
echo ""

echo "=== 1) List my consultancy tracks ==="
curl --request GET \
  --url "${BASE_URL}/user/heal-consultancy-tracks?page=1&limit=20" \
  --header "${AUTH_HEADER}"
echo -e "\n"

echo "=== 2) List consultancy tracks filtered by status ==="
curl --request GET \
  --url "${BASE_URL}/user/heal-consultancy-tracks?page=1&limit=20&status=requested" \
  --header "${AUTH_HEADER}"
echo -e "\n"

echo "=== 3) Book a consultancy (create track) ==="
curl --request POST \
  --url "${BASE_URL}/user/heal-consultancy-tracks" \
  --header "${AUTH_HEADER}" \
  --header "${JSON_HEADER}" \
  --data '{
    "concern": "Need follow-up on liver health and diet plan",
    "scheduledAt": "2026-07-15T10:00:00.000Z"
  }'
echo -e "\n"

echo "=== 4) Book consultancy — concern only (scheduledAt optional) ==="
curl --request POST \
  --url "${BASE_URL}/user/heal-consultancy-tracks" \
  --header "${AUTH_HEADER}" \
  --header "${JSON_HEADER}" \
  --data '{
    "concern": "Follow-up session for metabolic health review"
  }'
echo -e "\n"
