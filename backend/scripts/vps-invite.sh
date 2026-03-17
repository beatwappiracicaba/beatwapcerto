#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"
npm install
npm run smtp:verify || true
npm run clear-invites || true
EMAIL="$1"
PM2_NAME="$2"
if [ -z "$EMAIL" ]; then
  echo "usage: scripts/vps-invite.sh <email> [pm2_process]"
  exit 1
fi
npm run test-invite -- "$EMAIL"
if [ -n "$PM2_NAME" ] && command -v pm2 >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" || true
  pm2 logs "$PM2_NAME" --lines 50 || true
fi
