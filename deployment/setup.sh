#!/usr/bin/env bash
# deployment/setup.sh — Hostinger VPS initial setup script
# Run as root on a fresh Ubuntu 22.04 VPS.
# Usage: bash deployment/setup.sh
set -euo pipefail

APP_USER="quackcoin"
APP_DIR="/var/www/quackcoin"
LOG_DIR="/var/log/quackcoin"
NODE_VERSION="20"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " QuackCoin VPS Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Update system packages ────────────────────────────────────
echo "[1/9] Updating system packages..."
apt-get update -y && apt-get upgrade -y

# ── 2. Install required tools ────────────────────────────────────
echo "[2/9] Installing build tools, git, curl..."
apt-get install -y git curl wget build-essential software-properties-common

# ── 3. Install Node.js via nvm ───────────────────────────────────
echo "[3/9] Installing Node.js ${NODE_VERSION} via nvm..."
export NVM_DIR="/root/.nvm"
if [ ! -d "$NVM_DIR" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"
nvm install "${NODE_VERSION}"
nvm use "${NODE_VERSION}"
nvm alias default "${NODE_VERSION}"

# Symlink for system-wide use
NODE_BIN=$(nvm which "${NODE_VERSION}")
ln -sf "$NODE_BIN" /usr/local/bin/node
ln -sf "$(dirname "$NODE_BIN")/npm" /usr/local/bin/npm

# ── 4. Install PM2 globally ──────────────────────────────────────
echo "[4/9] Installing PM2..."
npm install -g pm2
# Configure PM2 to start on system boot
pm2 startup systemd -u root --hp /root | tail -1 | bash

# ── 5. Install and configure Nginx ──────────────────────────────
echo "[5/9] Installing Nginx..."
apt-get install -y nginx
systemctl enable nginx

# ── 6. Install Certbot (Let's Encrypt) ──────────────────────────
echo "[6/9] Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# ── 7. Create app user + directories ────────────────────────────
echo "[7/9] Creating app user and directories..."
if ! id "$APP_USER" &>/dev/null; then
    useradd --system --shell /bin/bash --create-home "$APP_USER"
fi
mkdir -p "$APP_DIR" "$LOG_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR" "$LOG_DIR"

# ── 8. Configure Nginx ───────────────────────────────────────────
echo "[8/9] Configuring Nginx..."
cp "$(dirname "$0")/nginx.conf" /etc/nginx/sites-available/quackcoin
ln -sf /etc/nginx/sites-available/quackcoin /etc/nginx/sites-enabled/quackcoin
# Remove default Nginx config
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 9. Configure PM2 log rotation ───────────────────────────────
echo "[9/9] Configuring PM2 log rotation..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:compress true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Setup complete!"
echo ""
echo " Next steps:"
echo " 1. Clone the repo to $APP_DIR"
echo " 2. Copy .env.local to $APP_DIR/.env.local"
echo " 3. Run: cd $APP_DIR && bash deployment/deploy.sh"
echo " 4. Obtain SSL certificate:"
echo "    certbot --nginx -d quackcoin.io -d www.quackcoin.io"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
