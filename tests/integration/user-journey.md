# QuackCoin — Full User Journey Integration Test

Run this test against a staging or production-like environment before every release.

---

## Prerequisites

- App running at `BASE_URL` (e.g. `https://staging.quackcoin.io` or `http://localhost:3000`)
- Fresh database (or at least no conflicting test user)
- Valid invite code available in the `InviteCode` table
- At least one active `MembershipTier` in the DB
- At least one active `Course` with at least one `Lesson`
- At least one active `Raffle`
- Admin account credentials

Set env vars before running:

```bash
export BASE_URL=http://localhost:3000
export INVITE_CODE=<valid-invite-code>
export TEST_EMAIL=integration-test@quackcoin.io
export TEST_PASSWORD=IntegrationTest123!
export ADMIN_EMAIL=admin@quackcoin.io
export ADMIN_PASSWORD=<admin-password>
```

---

## Step 1: Registration

```bash
# POST /api/auth/register
curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"inviteCode\":\"$INVITE_CODE\"}" \
  | jq .
```

**Expected:** `{ "success": true }` — verification email dispatched via Resend.

**Check:** `User` row in DB with `emailVerified: null`, `Resend` delivery log.

---

## Step 2: Email Verification

Open the verification link sent to `TEST_EMAIL` (check Resend dashboard or mailbox).

```bash
# GET /api/auth/verify-email?token=<token>
curl -sv "$BASE_URL/api/auth/verify-email?token=<TOKEN>" 2>&1 | grep -E "HTTP|Location"
```

**Expected:** Redirect to `/login?verified=1` (HTTP 302).

**Check:** `User.emailVerified` is now set.

---

## Step 3: Login

```bash
# Credentials login via NextAuth
curl -s -c /tmp/qc-cookies.txt -X POST $BASE_URL/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=$TEST_EMAIL&password=$TEST_PASSWORD&redirect=false&callbackUrl=%2Fdashboard" \
  | jq .
```

**Expected:** `{ "url": "/dashboard" }` — session cookie set.

---

## Step 4: 2FA Setup (TOTP)

1. Navigate to `/settings/security` as the logged-in user.
2. Click "Enable Two-Factor Authentication".
3. Scan the QR code with an authenticator app.
4. Submit the 6-digit TOTP code.

```bash
# POST /api/auth/2fa/setup
curl -s -b /tmp/qc-cookies.txt -X POST $BASE_URL/api/auth/2fa/setup \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"<TOTP_CODE>\"}" \
  | jq .
```

**Expected:** `{ "success": true, "backupCodes": [...] }` — store backup codes securely.

**Check:** `User.twoFactorEnabled = true` in DB.

---

## Step 5: Purchase Membership (USDC on Solana devnet)

1. Navigate to `/membership`.
2. Select a tier and initiate payment.
3. Send USDC to the displayed Solana recipient address (devnet).
4. The Helius webhook fires at `/api/webhooks/solana`.

```bash
# Verify webhook processed (check server logs or DB)
curl -s -b /tmp/qc-cookies.txt $BASE_URL/api/user/membership | jq .
```

**Expected:** `{ "tier": "<tier_name>", "expiresAt": "<date>" }`.

**Check:** `Membership` row created; `User.membershipTier` updated.

---

## Step 6: Earn QC — Daily Login Bonus

```bash
# POST /api/cron/daily-login (simulated user trigger)
curl -s -b /tmp/qc-cookies.txt -X POST $BASE_URL/api/user/claim-daily-login \
  | jq .
```

**Expected:** `{ "awarded": <N>, "balance": <M> }`.

**Check:** `QuackCoinTransaction` row with `type: DAILY_LOGIN`; balance increased.

---

## Step 7: Course Enrollment and Lesson Completion

```bash
# Enroll in first available course
COURSE_ID=$(curl -s -b /tmp/qc-cookies.txt $BASE_URL/api/courses | jq -r '.[0].id')

curl -s -b /tmp/qc-cookies.txt -X POST $BASE_URL/api/courses/$COURSE_ID/enroll \
  | jq .

# Complete first lesson
LESSON_ID=$(curl -s -b /tmp/qc-cookies.txt $BASE_URL/api/courses/$COURSE_ID/lessons \
  | jq -r '.[0].id')

curl -s -b /tmp/qc-cookies.txt -X POST $BASE_URL/api/courses/$COURSE_ID/lessons/$LESSON_ID/complete \
  | jq .
```

**Expected:** `{ "success": true, "qcAwarded": <N> }` on lesson completion.

**Check:** `LessonProgress` row; QC balance increased; badge check triggered.

---

## Step 8: Badge Unlock

```bash
curl -s -b /tmp/qc-cookies.txt $BASE_URL/api/user/badges | jq .
```

**Expected:** At least one badge with `earnedAt` set (e.g. "First Lesson" badge).

**Check:** `UserBadge` row in DB.

---

## Step 9: Raffle Entry

```bash
RAFFLE_ID=$(curl -s -b /tmp/qc-cookies.txt $BASE_URL/api/raffles | jq -r '.[0].id')

curl -s -b /tmp/qc-cookies.txt -X POST $BASE_URL/api/raffles/$RAFFLE_ID/enter \
  | jq .
```

**Expected:** `{ "success": true, "ticketCount": <N> }`.

**Check:** `RaffleEntry` row; QC balance deducted for ticket cost.

---

## Step 10: In-App Notification + Web Push

```bash
# Check in-app notifications
curl -s -b /tmp/qc-cookies.txt $BASE_URL/api/notifications | jq '.notifications[0]'
```

**Expected:** At least one unread notification (e.g. badge unlocked, lesson completed).

**Web Push check (manual):**
1. Open the app in a browser with push notifications enabled.
2. Complete step 7 again.
3. Confirm push notification is delivered to the browser.

---

## Step 11: SSE Stream Connectivity

```bash
# Open SSE connection and confirm initial ping
curl -N -b /tmp/qc-cookies.txt $BASE_URL/api/events/stream &
SSE_PID=$!
sleep 3
kill $SSE_PID
```

**Expected:** `event: ping` and `data: {"type":"ping"}` lines in output.

**Nginx header check:**
```bash
curl -I -b /tmp/qc-cookies.txt $BASE_URL/api/events/stream | grep -i accel
# Should show: X-Accel-Buffering: no
```

---

## Step 12: Admin Panel Verification

```bash
# Login as admin (separate cookie jar)
curl -s -c /tmp/qc-admin-cookies.txt -X POST $BASE_URL/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=$ADMIN_EMAIL&password=$ADMIN_PASSWORD&redirect=false" \
  | jq .

# Check dashboard stats
curl -s -b /tmp/qc-admin-cookies.txt $BASE_URL/api/admin/dashboard/stats | jq .
```

**Expected:**
```json
{
  "newRegistrations": 1,
  "activeMemberships": 1,
  "lessonCompletions": 1,
  "raffleEntries": 1
}
```

---

## Step 13: Health Check

```bash
curl -s $BASE_URL/api/health | jq .
```

**Expected:**
```json
{ "status": "ok", "db": "ok", "redis": "ok" }
```

---

## Pass / Fail Criteria

| Step | Description | Status |
|------|-------------|--------|
| 1 | Registration | ⬜ |
| 2 | Email verification | ⬜ |
| 3 | Login | ⬜ |
| 4 | 2FA setup | ⬜ |
| 5 | USDC membership purchase | ⬜ |
| 6 | Daily login QC earn | ⬜ |
| 7 | Course enroll + lesson complete | ⬜ |
| 8 | Badge unlock | ⬜ |
| 9 | Raffle entry | ⬜ |
| 10 | In-app + push notification | ⬜ |
| 11 | SSE stream + Nginx headers | ⬜ |
| 12 | Admin panel shows all events | ⬜ |
| 13 | Health check | ⬜ |

All 13 steps must pass before a production release.

---

## Known Blockers / Notes

- Step 5 requires Helius webhook to be configured and the Solana devnet wallet funded
- Step 4 requires a physical authenticator app during manual testing
- Automated Playwright E2E for steps 1-4 and 11-13 can be run via `make e2e` once configured

---

*Last updated: 2026-02-28*
