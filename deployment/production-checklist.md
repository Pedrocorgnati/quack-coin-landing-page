# QuackCoin — Production Go-Live Checklist

Run through this checklist before every production launch or major deployment.

---

## 1. Infrastructure

- [ ] VPS provisioned and `bash deployment/setup.sh` completed without errors
- [ ] SSH access works: `ssh quackcoin@<vps-ip>`
- [ ] `/var/log/quackcoin/` directory exists and is writable by the app user
- [ ] Nginx installed and running: `systemctl status nginx`
- [ ] HTTPS certificate obtained: `certbot --nginx -d quackcoin.io -d www.quackcoin.io`
- [ ] SSL certificate valid: `curl -v https://quackcoin.io 2>&1 | grep -i "SSL certificate verify"`
- [ ] HTTP → HTTPS redirect works: `curl -I http://quackcoin.io` shows 301

---

## 2. Database

- [ ] MariaDB installed and running: `systemctl status mariadb`
- [ ] `quackcoin_prod` database and app user created (run `mariadb-setup.sql`)
- [ ] `prisma migrate deploy` ran successfully without errors:
  ```bash
  cd /var/www/quackcoin && npx prisma migrate deploy
  ```
- [ ] Prisma client generated: `npx prisma generate`
- [ ] DB connection test: `node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.$connect().then(() => { console.log('DB OK'); p.$disconnect(); })"`

---

## 3. Environment Variables

- [ ] `.env.local` present at `/var/www/quackcoin/.env.local`
- [ ] All required vars set (no placeholder values remaining):
  - [ ] `DATABASE_URL` — points to production MariaDB
  - [ ] `NEXTAUTH_SECRET` — at least 32 random chars (`openssl rand -base64 32`)
  - [ ] `NEXTAUTH_URL` — `https://quackcoin.io`
  - [ ] `NEXT_PUBLIC_APP_URL` — `https://quackcoin.io`
  - [ ] `UPSTASH_REDIS_REST_URL` — Upstash dashboard REST endpoint
  - [ ] `UPSTASH_REDIS_REST_TOKEN` — Upstash REST token
  - [ ] `RESEND_API_KEY` — Resend dashboard API key
  - [ ] `SOLANA_WEBHOOK_SECRET` — at least 32 chars
  - [ ] `SOLANA_RECIPIENT_ADDRESS` — valid Solana wallet address
  - [ ] `SOLANA_RPC_URL` — `https://api.mainnet-beta.solana.com` (or private RPC)
  - [ ] `USDC_MINT_ADDRESS` — mainnet USDC mint
  - [ ] `CRON_SECRET` — at least 32 chars (`openssl rand -base64 48`)
  - [ ] `ADMIN_CONFIRM_SECRET` — at least 16 chars
  - [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — VAPID public key
  - [ ] `VAPID_PRIVATE_KEY` — VAPID private key
  - [ ] `VAPID_SUBJECT` — `mailto:admin@quackcoin.io`

---

## 4. Build and Process Manager

- [ ] Application built successfully: `npm run build` exits 0
- [ ] PM2 started: `pm2 start ecosystem.config.js`
- [ ] Both processes running: `pm2 list` shows `quackcoin-web` + `quackcoin-cron` as `online`
- [ ] PM2 startup configured: `pm2 save` + `pm2 startup`
- [ ] PM2 log rotation active: `pm2 show pm2-logrotate`

---

## 5. Health Check

- [ ] Health endpoint responds 200:
  ```bash
  curl -s https://quackcoin.io/api/health | jq .
  ```
  Expected:
  ```json
  { "status": "ok", "db": "ok", "redis": "ok" }
  ```
- [ ] If `db` or `redis` is `"error"`, check logs before proceeding

---

## 6. Cron Jobs

- [ ] Cron process logs show scheduled jobs:
  ```bash
  pm2 logs quackcoin-cron --lines 50
  ```
- [ ] At least one successful cron run visible in DB:
  ```bash
  npx prisma studio
  # Check CronJobLog table for recent entries
  ```
- [ ] CRON_SECRET validated: manually hit a cron endpoint with correct Bearer token
  ```bash
  curl -X POST https://quackcoin.io/api/cron/daily-login \
    -H "Authorization: Bearer $CRON_SECRET"
  ```

---

## 7. SSE Streaming

- [ ] SSE endpoint accessible with proper headers:
  ```bash
  curl -N https://quackcoin.io/api/events/stream \
    -H "Cookie: next-auth.session-token=<valid_session>"
  ```
- [ ] Nginx SSE headers verified (`X-Accel-Buffering: no`):
  ```bash
  curl -I https://quackcoin.io/api/events/stream | grep -i accel
  ```

---

## 8. Web Push / VAPID

- [ ] VAPID keys generated and set (see `docs/environment-setup.md`)
- [ ] Push subscription endpoint functional: `POST /api/push/subscribe` returns 200
- [ ] Test push notification delivered to a subscribed browser

---

## 9. Authentication

- [ ] Registration flow works end-to-end (email + invite code)
- [ ] Verification email received via Resend
- [ ] Login works; session token set correctly
- [ ] 2FA setup and login works (TOTP)
- [ ] Admin role can access `/admin` routes
- [ ] Non-admin cannot access `/admin` (returns 403)

---

## 10. Solana Payments

- [ ] `SOLANA_RECIPIENT_ADDRESS` is funded with SOL for transaction fees
- [ ] USDC token account exists on the recipient wallet
- [ ] Test USDC payment processed end-to-end (use devnet first if possible)
- [ ] Webhook from Helius/Solana received and processed correctly

---

## 11. Final Smoke Test

Run through the core user journey manually:

- [ ] Register new account with invite code
- [ ] Complete email verification
- [ ] Set up 2FA
- [ ] Purchase a membership tier (USDC)
- [ ] Earn QC from daily login bonus
- [ ] Enroll in a course and complete a lesson
- [ ] Unlock at least one badge
- [ ] Enter a raffle
- [ ] Receive in-app notification + push notification
- [ ] Admin panel shows all events correctly (`/admin/dashboard`)

---

## 12. Rollback Plan

If a critical issue is found after deploy:

```bash
cd /var/www/quackcoin

# Roll back to previous build
git log --oneline -5  # find the previous commit
git checkout <previous-commit>

# Rebuild and restart
npm ci --only=production
npx prisma generate
npm run build
pm2 reload --update-env
```

For database rollback, use Prisma's migration history:
```bash
npx prisma migrate status
npx prisma migrate resolve --rolled-back <migration-name>
```

---

*Last updated: 2026-02-28*
