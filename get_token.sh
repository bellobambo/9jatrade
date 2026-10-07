#!/usr/bin/env bash
# get_token.sh — Fetch a HackCanton access token and copy it to the clipboard

set -euo pipefail

# ── Prompt for credentials ──────────────────────────────────────────────────
read -rp "HackCanton account email: " EMAIL
read -rsp "HackCanton password: " PASSWORD
echo   # newline after the silent prompt

# ── Request the token ───────────────────────────────────────────────────────
RESPONSE=$(curl -sf \
  -X POST \
  "https://keycloak.naas.noders.services/realms/noders-appsfactory/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=password" \
  --data-urlencode "client_id=web-app-ui-hackcanton-01-devnet" \
  --data-urlencode "username=${EMAIL}" \
  --data-urlencode "password=${PASSWORD}" \
  --data-urlencode "scope=openid daml_ledger_api offline_access"
)

# ── Clear credentials from memory ───────────────────────────────────────────
PASSWORD=""
EMAIL=""

# ── Validate the response ───────────────────────────────────────────────────
ACCESS_TOKEN=$(echo "${RESPONSE}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))")
SCOPE=$(echo "${RESPONSE}"       | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('scope',''))")
EXPIRES_IN=$(echo "${RESPONSE}"  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('expires_in',''))")

if [[ -z "${ACCESS_TOKEN}" ]]; then
  echo "ERROR: The response did not contain an access token." >&2
  exit 1
fi

if ! echo "${SCOPE}" | grep -qw "daml_ledger_api"; then
  echo "ERROR: The token is missing the required daml_ledger_api scope." >&2
  exit 1
fi

# ── Copy to clipboard ───────────────────────────────────────────────────────
if command -v xclip &>/dev/null; then
  echo -n "${ACCESS_TOKEN}" | xclip -selection clipboard
elif command -v xsel &>/dev/null; then
  echo -n "${ACCESS_TOKEN}" | xsel --clipboard --input
elif command -v wl-copy &>/dev/null; then       # Wayland
  echo -n "${ACCESS_TOKEN}" | wl-copy
else
  echo "WARNING: No clipboard tool found (xclip / xsel / wl-copy)."
  echo "Token:"
  echo "${ACCESS_TOKEN}"
  exit 0
fi

echo "Access token copied to clipboard. Paste it into the app's Ledger API access token field."
echo "It expires in ${EXPIRES_IN} seconds."
