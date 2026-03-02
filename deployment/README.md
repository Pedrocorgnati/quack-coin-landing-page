# QuackCoin — Deployment Guide

## Architecture Overview

```
Internet
  └── Nginx (443 HTTPS + SSL)
        └── localhost:3000 (Next.js — PM2: quackcoin-web)
              └── cron/scheduler.ts (PM2: quackcoin-cron)
                    └── localhost:3000/api/cron/* (Bearer CRON_SECRET)
```

Dependencies:
- **MariaDB** — primary database (localhost:3306)
- **Upstash Redis** — REST API (remote, over HTTPS)

---

## Files in this directory

| File | Purpose |
|------|---------|
| `nginx.conf` | Nginx server block (HTTP→HTTPS redirect, SSL, SSE headers) |
| `setup.sh` | Fresh VPS initial setup (Node.js, PM2, Nginx, Certbot) |
| `deploy.sh` | Zero-downtime deploy (git pull → build → pm2 reload) |
| `mariadb-setup.sql` | Database + user creation |
| `production-checklist.md` | Pre-launch checklist |

---

## Upstash Redis Configuration

QuackCoin uses [Upstash Redis](https://console.upstash.com) via the REST API (not TCP).

### Why Upstash?

- **Serverless-compatible**: REST API works in Next.js serverless and Edge environments
- **No connection pooling needed**: each request is a stateless HTTP call
- **Global replication** available for multi-region deployments

### Configuration

```env
UPSTASH_REDIS_REST_URL="https://your-database.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxA"
```

### Recommended Upstash settings

- **Max memory policy**: `allkeys-lru`
  - All cached data (SiteConfig, cron status, session cache) is regenerable
  - LRU eviction ensures the cache never runs out of memory
- **Persistence**: disabled (cache-only workload, data is in MariaDB)
- **TLS**: always enabled (default for Upstash REST)
- **Eviction policy**: set via Upstash dashboard → Database Settings

### Cache TTLs used by the application

| Cache Key | TTL | Used for |
|-----------|-----|---------|
| `site_config` | 300s | SiteConfig values |
| `admin:cron:status` | 60s | Cron job status panel |
| `notif_prefs:{userId}` | 120s | Notification preferences |
| `admin:stats:overview` | 30s | Admin dashboard metrics |
| Rate limit keys | varies | Per-endpoint rate limits (Upstash Ratelimit) |

### Connection pool (Next.js serverless)

The `@upstash/redis` client uses HTTP/REST — no TCP connections. Each request creates a new HTTP call. No connection pool configuration is required.

For `next start` (persistent server):
- The Redis client is a singleton (`lib/redis.ts`) reused across requests
- Upstash handles connection management on their end

---

## Quick Deploy

```bash
# First deploy
bash deployment/setup.sh
git clone https://github.com/your-org/quack-coin.git /var/www/quackcoin
cp /path/to/.env.local /var/www/quackcoin/.env.local
bash /var/www/quackcoin/deployment/deploy.sh
certbot --nginx -d quackcoin.io -d www.quackcoin.io

# Subsequent deploys (triggered by GitHub Actions)
bash /var/www/quackcoin/deployment/deploy.sh
```

---

## Monitoring

```bash
pm2 list                      # Process status
pm2 logs quackcoin-web        # Next.js logs
pm2 logs quackcoin-cron       # Cron scheduler logs
pm2 monit                     # Real-time monitoring
curl -s localhost:3000/api/health | jq .   # Health check
```
