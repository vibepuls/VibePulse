# VibePulse Social Gaming V1 — Safe rollout notes

This branch is a first real-backend slice of the Social Gaming Platform. It is intentionally separate from `main` so the current public deployment is not replaced unexpectedly.

## Included in this slice

- Live React/Vite arena reads the signed-in user, photo posts, and leaderboard from the Express/Prisma API.
- Photo post reward: +10 points for up to five posts per user per calendar day. Additional posts publish without that reward.
- Point stealing: server-side 3-point transfer and 4-second per-target cooldown.
- Point gifting and point transaction history.
- Follow/unfollow and notifications.
- Referral URL, successful-signup reward (+10,000 points to the referrer), and one daily +30 referral-sharing claim.
- Notification read action.
- Admin user status controls, point adjustments, report status, and post hide/restore endpoints, with admin action records.
- Daily missions with server-tracked progress and claim-once rewards; a mission can grant a 30-minute shield.
- Achievement unlocks derived from actual points, posts, steals, gifts, battle wins, and team membership.
- Photo battles with opponent photo validation, one community vote per user, a 10-minute voting window, and a server-awarded winner reward.
- Teams with join/leave controls and combined member-point rankings.
- Quick Tap game with server-created sessions, a score cap, one-time reward claims, and five rewarded rounds per day.

## Important limits

This is not the full specification yet. Image upload requires the documented Supabase Storage bucket and server-only credentials. Team ownership transfer, production media moderation/scanning, advanced referral anti-fraud, and production anti-bot/device-fraud controls still require further work. Point purchase must remain disabled until a real provider verifies payment server-side.

## Preserve the existing Supabase data

1. Take a Supabase database backup/export before changing schema.
2. Do not drop legacy tables or run a database reset.
3. After reviewing and merging this branch, run Prisma generate and schema push against the existing Supabase connection. If Prisma proposes a reset or destructive change, cancel and inspect the diff first.
4. The optional SQL file `server/prisma/migrate-legacy-users-and-photo-posts.sql` copies compatible legacy accounts and image posts into the new Prisma tables. Run it only after the new tables exist. It does not delete or update legacy records.
5. Review the copied row counts before inviting users back. Legacy text-only posts and other legacy records are not copied by that script.

## Local commands

From the repository root:

```powershell
npm install
npm --prefix server install
npm --prefix client install
```

Set `DATABASE_URL` and a long random `AUTH_SECRET` in `server/.env`, then run:

```powershell
npm run db:generate
npm run db:push
npm --prefix server run build
npm --prefix client run build
npm run dev
```

Open `http://localhost:5173`. The API health endpoint is `http://localhost:4000/api/health`.

## Render settings

- API service root: repository root.
- API build command: `npm install && npm --prefix server install && npm --prefix server run db:generate && npm --prefix server run build`
- API start command: `npm --prefix server start`
- Required API environment variables: `DATABASE_URL`, `AUTH_SECRET`, `CLIENT_ORIGIN`, and `PORT`.
- For photo uploads, also set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `SUPABASE_STORAGE_BUCKET=vibepulse-media` on the API service only. Create a `vibepulse-media` bucket in the existing Supabase Storage dashboard and make it public for direct photo display. Never add the service-role key to the frontend or GitHub.
- Static frontend root: `client`.
- Frontend build command: `npm install && npm run build`
- Publish directory: `dist`.
- Frontend `VITE_API_URL`: the API service base URL. It may end with `/api`; the frontend normalizes that suffix.

Keep the old Render deployment available until the new frontend and API have both been tested. Merging the GitHub pull request does not by itself guarantee Render's build settings or environment variables are correct.
