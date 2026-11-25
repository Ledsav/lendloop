#!/usr/bin/env bash
# In GitHub Codespaces the browser reaches Convex through the forwarded port's URL, not 127.0.0.1.
# Next.js reads .env.development.local before .env.local, and `npx convex dev` doesn't touch it,
# so the override survives Convex rewriting .env.local. Both files are git-ignored.
set -euo pipefail

if [ -z "${CODESPACE_NAME:-}" ]; then
  echo "Not in a GitHub codespace: nothing to do."
  exit 0
fi

url="https://${CODESPACE_NAME}-3210.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
printf 'NEXT_PUBLIC_CONVEX_URL=%s\n' "$url" > .env.development.local
echo "Wrote .env.development.local (NEXT_PUBLIC_CONVEX_URL=$url)"

# The browser must reach the app (3000) and Convex (3210) without a GitHub login, so those two
# ports are public. Sign-in is still required inside the app; n8n and Mailpit stay private.
if gh codespace ports visibility 3000:public 3210:public -c "$CODESPACE_NAME" >/dev/null 2>&1; then
  echo "Ports 3000 and 3210 are public."
else
  echo "Make ports 3000 and 3210 public yourself: Ports tab, right-click each, Port Visibility, Public."
fi
