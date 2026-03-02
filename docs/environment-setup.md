# Environment Setup Guide

Step-by-step guide for configuring all environment variables required by the QuackCoin platform.

---

## Prerequisites

- Node.js 20+
- MariaDB 10.6+ (or MySQL 8+)
- A free [Upstash](https://console.upstash.com) account (Redis)
- A free [Resend](https://resend.com) account (transactional email)
- A Solana wallet with a USDC token account

---

## 1. Copy the example file

```bash
cp .env.example .env.local
```

Never commit `.env.local`. It is already in `.gitignore`.

---

## 2. DATABASE

Configure MariaDB/MySQL:

```bash
DATABASE_URL="mysql://<user>:<password>@<host>:<port>/<database>?connection_limit=10&pool_timeout=10"
```

**Local development:**
```bash
DATABASE_URL="mysql://quackcoin:changeme@localhost:3306/quackcoin?connection_limit=10&pool_timeout=10"
```

**Apply migrations:**
```bash
npm run db:migrate:deploy
```

---

## 3. AUTH (NextAuth)

Generate a secure secret:

```bash
openssl rand -base64 32
# → paste result as NEXTAUTH_SECRET
```

Set `NEXTAUTH_URL` to your deployment URL:
- Development: `http://localhost:3000`
- Production: `https://quackcoin.io`

Generate `ADMIN_CONFIRM_SECRET` (used to confirm destructive admin actions):
```bash
openssl rand -hex 16
```

---

## 4. REDIS (Upstash)

1. Go to [console.upstash.com](https://console.upstash.com)
2. Create a new Redis database (free tier is sufficient)
3. Copy **REST URL** → `UPSTASH_REDIS_REST_URL`
4. Copy **REST Token** → `UPSTASH_REDIS_REST_TOKEN`

---

## 5. RESEND (Email)

1. Go to [resend.com](https://resend.com)
2. Create an API key with **Full Access**
3. Verify your sending domain (add DNS records)
4. Copy the API key → `RESEND_API_KEY`

---

## 6. SOLANA / USDC

### 6.1 Create a Solana wallet

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate a new keypair
solana-keygen new --outfile ~/.config/solana/quackcoin-wallet.json

# Get the public key
solana-keygen pubkey ~/.config/solana/quackcoin-wallet.json
# → paste as SOLANA_RECIPIENT_ADDRESS
```

### 6.2 Create a USDC token account

```bash
# Ensure the wallet is funded with SOL for rent
solana airdrop 0.01 <SOLANA_RECIPIENT_ADDRESS> --url mainnet-beta

# Create USDC associated token account
spl-token create-account EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --owner <SOLANA_RECIPIENT_ADDRESS> \
  --url mainnet-beta
```

### 6.3 Webhook secret

```bash
openssl rand -base64 32
# → paste as SOLANA_WEBHOOK_SECRET
```

---

## 7. VAPID (Web Push Notifications)

Generate VAPID keypair:

```bash
npx web-push generate-vapid-keys
# Outputs:
# Public Key: <public>
# Private Key: <private>
```

Set:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = public key from above (the `NEXT_PUBLIC_` prefix exposes it to the browser for push subscriptions)
- `VAPID_PRIVATE_KEY` = private key from above
- `VAPID_SUBJECT` = `mailto:admin@quackcoin.io` (or your domain)

---

## 8. CRON

Generate a strong secret (minimum 32 characters):

```bash
openssl rand -base64 48
# → paste as CRON_SECRET
```

The same value must be set in both the Next.js env and the cron process env (PM2 reads from `.env.local` by default).

---

## 9. HUBSPOT (Optional)

1. Go to [app.hubspot.com/private-apps](https://app.hubspot.com/private-apps)
2. Create a private app with **CRM > Contacts > Write** scope
3. Copy the access token → `HUBSPOT_API_KEY`
4. Find your marketing email list ID → `HUBSPOT_LEADS_LIST_ID`

If these variables are absent, HubSpot integration is silently disabled.

---

## 10. AFFILIATE WEBHOOK (Optional)

Generate a secret to verify webhook payloads from your affiliate network:

```bash
openssl rand -base64 32
# → paste as AFFILIATE_WEBHOOK_SECRET
```

If absent, the `/api/webhooks/affiliate` endpoint returns `503 Service Unavailable`.

---

## 11. Verifying your setup

After filling `.env.local`, run:

```bash
# Type check (validates env at startup)
npm run type-check

# Check health endpoint (after starting dev server)
npm run dev
curl http://localhost:3000/api/health
# Expected: {"status":"ok","db":"ok","redis":"ok"}
```

---

## 12. PM2 Production Setup

```bash
# Install PM2 globally
npm install -g pm2

# Start all processes
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View cron logs
pm2 logs quackcoin-cron
```

PM2 will automatically restart the web server and cron process on crash.
