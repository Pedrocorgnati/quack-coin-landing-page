# Makefile — dev shortcuts for quack-coin-landing-page
# Usage: make <target>

.PHONY: dev cron build deploy db-studio db-migrate db-push db-generate lint type-check test help

# ── Development ──────────────────────────────────────────────

dev:
	npm run dev

cron:
	npm run cron:start

# ── Production Build ─────────────────────────────────────────

build:
	npm run build

start:
	npm start

# ── Deployment (VPS) ─────────────────────────────────────────

deploy:
	bash deployment/deploy.sh

# ── Database ─────────────────────────────────────────────────

db-studio:
	npm run db:studio

db-migrate:
	npm run db:migrate

db-push:
	npm run db:push

db-generate:
	npm run db:generate

db-migrate-deploy:
	npm run db:migrate:deploy

# ── Code Quality ─────────────────────────────────────────────

lint:
	npm run lint

type-check:
	npm run type-check

test:
	npm test

test-coverage:
	npm run test:coverage

# ── Help ─────────────────────────────────────────────────────

help:
	@echo ""
	@echo "Available targets:"
	@echo "  dev              Start Next.js dev server"
	@echo "  cron             Start cron scheduler"
	@echo "  build            Build for production"
	@echo "  start            Start production server"
	@echo "  deploy           Run deployment script on VPS"
	@echo "  db-studio        Open Prisma Studio"
	@echo "  db-migrate       Run database migrations (dev)"
	@echo "  db-migrate-deploy  Run database migrations (production)"
	@echo "  db-push          Push schema without migration"
	@echo "  db-generate      Regenerate Prisma client"
	@echo "  lint             Run ESLint"
	@echo "  type-check       Run TypeScript type checker"
	@echo "  test             Run Jest tests"
	@echo "  test-coverage    Run Jest with coverage report"
	@echo ""
