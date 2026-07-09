#!/usr/bin/env bash
# =============================================================================
# Wellness User API — Metabolic Health
# Base path: /api/user/metabolic-metrics
#
# Requirements:
#   - Heal-tier user (userTier = heal)
#   - Bearer accessToken from /api/user/auth/login or /api/user/auth/login/password
#
# Usage (bash / Git Bash / WSL):
#   export BASE_URL="http://localhost:5000/api"
#   export ACCESS_TOKEN="your_jwt_access_token"
#   bash Backend/postman/Wellness-User-Metabolic-Health.curl.sh
#
# PowerShell:
#   $env:BASE_URL = "http://localhost:5000/api"
#   $env:ACCESS_TOKEN = "your_jwt_access_token"
#   bash Backend/postman/Wellness-User-Metabolic-Health.curl.sh
# =============================================================================

BASE_URL="${BASE_URL:-http://localhost:5000/api}"
ACCESS_TOKEN="${ACCESS_TOKEN:-REPLACE_WITH_USER_ACCESS_TOKEN}"
AUTH_HEADER="Authorization: Bearer ${ACCESS_TOKEN}"
JSON_HEADER="Content-Type: application/json"
TODAY="$(date +%F)"

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
echo '# OTP login example (step 1 — send OTP):'
cat <<'EOF'
curl --request POST \
  --url "${BASE_URL}/user/auth/otp/send" \
  --header "Content-Type: application/json" \
  --data '{
    "phone": "+919876543210"
  }'
EOF
echo ""
echo '# OTP login example (step 2 — verify and receive tokens):'
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

echo "=== 1) Get metabolic profile (gender, dob from user account) ==="
curl --request GET \
  --url "${BASE_URL}/user/metabolic-metrics/profile" \
  --header "${AUTH_HEADER}"
echo -e "\n"

echo "=== 2) Get metabolic health dashboard (latest + history) ==="
curl --request GET \
  --url "${BASE_URL}/user/metabolic-metrics/dashboard?historyLimit=20" \
  --header "${AUTH_HEADER}"
echo -e "\n"

echo "=== 3) Get all metric history (paginated) ==="
curl --request GET \
  --url "${BASE_URL}/user/metabolic-metrics/history?page=1&limit=50" \
  --header "${AUTH_HEADER}"
echo -e "\n"

echo "=== 4) Get BMI history only ==="
curl --request GET \
  --url "${BASE_URL}/user/metabolic-metrics/history/bmi?page=1&limit=20" \
  --header "${AUTH_HEADER}"
echo -e "\n"

echo "=== 5) Save BMI calculation ==="
curl --request POST \
  --url "${BASE_URL}/user/metabolic-metrics/bmi" \
  --header "${AUTH_HEADER}" \
  --header "${JSON_HEADER}" \
  --data "{
    \"gender\": \"male\",
    \"age\": 28,
    \"heightCm\": 175,
    \"weightKg\": 86,
    \"date\": \"${TODAY}\"
  }"
echo -e "\n"

echo "=== 6) Save BMR calculation ==="
echo "# activityLevel: sedentary | lightly_active | moderately_active | highly_active | very_active | extra_active"
curl --request POST \
  --url "${BASE_URL}/user/metabolic-metrics/bmr" \
  --header "${AUTH_HEADER}" \
  --header "${JSON_HEADER}" \
  --data "{
    \"gender\": \"male\",
    \"age\": 28,
    \"heightCm\": 175,
    \"weightKg\": 70,
    \"activityLevel\": \"moderately_active\",
    \"date\": \"${TODAY}\"
  }"
echo -e "\n"

echo "=== 7) Save Body Fat % calculation (US Navy method) ==="
echo "# Female users must also send hipCm"
curl --request POST \
  --url "${BASE_URL}/user/metabolic-metrics/body_fat" \
  --header "${AUTH_HEADER}" \
  --header "${JSON_HEADER}" \
  --data "{
    \"gender\": \"male\",
    \"age\": 28,
    \"heightCm\": 175,
    \"weightKg\": 70,
    \"neckCm\": 38,
    \"waistCm\": 85,
    \"bodyFatGoal\": 25,
    \"date\": \"${TODAY}\"
  }"
echo -e "\n"

echo "=== 8) Save Body Fat % — female example ==="
curl --request POST \
  --url "${BASE_URL}/user/metabolic-metrics/body_fat" \
  --header "${AUTH_HEADER}" \
  --header "${JSON_HEADER}" \
  --data "{
    \"gender\": \"female\",
    \"age\": 28,
    \"heightCm\": 165,
    \"weightKg\": 62,
    \"neckCm\": 32,
    \"waistCm\": 72,
    \"hipCm\": 98,
    \"bodyFatGoal\": 28,
    \"date\": \"${TODAY}\"
  }"
echo -e "\n"

echo "=== 9) Save Visceral Fat calculation ==="
curl --request POST \
  --url "${BASE_URL}/user/metabolic-metrics/visceral_fat" \
  --header "${AUTH_HEADER}" \
  --header "${JSON_HEADER}" \
  --data "{
    \"gender\": \"male\",
    \"age\": 28,
    \"heightCm\": 175,
    \"waistCm\": 93,
    \"date\": \"${TODAY}\"
  }"
echo -e "\n"

echo "=== 10) Save metric using generic POST (metricType in body) ==="
curl --request POST \
  --url "${BASE_URL}/user/metabolic-metrics" \
  --header "${AUTH_HEADER}" \
  --header "${JSON_HEADER}" \
  --data "{
    \"metricType\": \"bmi\",
    \"gender\": \"male\",
    \"age\": 28,
    \"heightCm\": 175,
    \"weightKg\": 70,
    \"date\": \"${TODAY}\"
  }"
echo -e "\n"

echo "=== 11) Snake_case field aliases (also supported) ==="
curl --request POST \
  --url "${BASE_URL}/user/metabolic-metrics/bmr" \
  --header "${AUTH_HEADER}" \
  --header "${JSON_HEADER}" \
  --data "{
    \"gender\": \"male\",
    \"age\": 28,
    \"height_cm\": 175,
    \"weight_kg\": 70,
    \"activity_level\": \"lightly_active\",
    \"date\": \"${TODAY}\"
  }"
echo -e "\n"

echo "Done."
