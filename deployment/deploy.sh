#!/usr/bin/env bash
# deployment/deploy.sh — Zero-downtime deployment script
# Run from the app directory (/var/www/quackcoin) after each push to main.
# PM2 `reload` provides zero-downtime restarts (graceful handoff).
# Usage: bash deployment/deploy.sh
set -euo pipefail

APP_DIR="/var/www/quackcoin"
BACKUP_DIR="/var/www/quackcoin-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " QuackCoin Deploy — $TIMESTAMP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$APP_DIR"

# ── 1. Backup current build (for rollback) ──────────────────────
echo "[1/6] Creating rollback backup..."
if [ -d ".next" ]; then
    rm -rf "$BACKUP_DIR"
    cp -r ".next" "$BACKUP_DIR/.next"
    echo "  Backup saved to $BACKUP_DIR"
fi

# ── 2. Pull latest code ──────────────────────────────────────────
echo "[2/6] Pulling latest code from main..."
git pull origin main

# ── 3. Install dependencies ──────────────────────────────────────
echo "[3/6] Installing production dependencies..."
npm ci --only=production

# ── 4. Run database migrations ───────────────────────────────────
echo "[4/6] Running Prisma migrations..."
npx prisma migrate deploy

# ── 5. Build Next.js app ─────────────────────────────────────────
echo "[5/6] Building Next.js..."
npm run build

# ── 6. Reload PM2 (zero-downtime) ───────────────────────────────
echo "[6/6] Reloading PM2 processes..."
pm2 reload ecosystem.config.js --update-env
pm2 save

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Deploy complete!"
echo ""
echo " Verify:"
echo "   pm2 list"
echo "   curl -s http://localhost:3000/api/health | jq ."
echo ""
echo " Rollback (if needed):"
echo "   cp -r $BACKUP_DIR/.next $APP_DIR/.next"
echo "   pm2 reload ecosystem.config.js --update-env"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
