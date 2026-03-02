-- deployment/mariadb-setup.sql
-- Initial database setup for QuackCoin on Hostinger VPS.
-- Run as MariaDB root: mysql -u root -p < deployment/mariadb-setup.sql

-- ── Create production database ───────────────────────────────────
CREATE DATABASE IF NOT EXISTS quackcoin_prod
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- ── Create application user (minimal privileges) ─────────────────
-- NOTE: Do NOT grant DROP/ALTER/CREATE to this user.
-- Use a separate migration user (or root) to run `prisma migrate deploy`.
CREATE USER IF NOT EXISTS 'quackcoin'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';

-- Application user: read + write only
GRANT SELECT, INSERT, UPDATE, DELETE ON quackcoin_prod.* TO 'quackcoin'@'localhost';

-- ── Create migration user (for Prisma migrations only) ───────────
-- This user has schema-altering privileges but should NOT be used by the app.
CREATE USER IF NOT EXISTS 'quackcoin_migrate'@'localhost' IDENTIFIED BY 'CHANGE_THIS_MIGRATE_PASSWORD';
GRANT ALL PRIVILEGES ON quackcoin_prod.* TO 'quackcoin_migrate'@'localhost';

FLUSH PRIVILEGES;

-- ── Instructions ─────────────────────────────────────────────────
-- After running this script:
-- 1. Set DATABASE_URL (app) to:
--    mysql://quackcoin:CHANGE_THIS_PASSWORD@localhost:3306/quackcoin_prod
-- 2. Run migrations using the migration user:
--    DATABASE_URL="mysql://quackcoin_migrate:CHANGE_THIS_MIGRATE_PASSWORD@localhost:3306/quackcoin_prod" \
--    npx prisma migrate deploy
-- 3. Remove the migration user after initial setup if desired.
