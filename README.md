# VibePulse Relaunch

A mobile-first social competition platform starter: **Post → Earn → Steal → Gift → Battle → Rank**.

This ZIP is a working starter/MVP, not a claim that every item in the large specification is finished. It includes a React/Vite web UI, Express API, PostgreSQL/Prisma schema, authentication, posts, basic likes/comments, leaderboard, 3-point stealing with a server-side 4-second per-target cooldown, point gifting, notifications, messaging, reports, admin-only endpoints, and seed data. Battles, voting, full missions/achievements/teams/referrals, payment integration, image uploads, complete audit logging, and production anti-fraud systems still need implementation before a broad public launch.

## Requirements
- Node.js 20 or newer
- npm
- A PostgreSQL database (Supabase PostgreSQL is supported)

## Local setup (beginner)
1. Extract this ZIP.
2. In the project folder, run `npm install`.
3. Run `npm --prefix server install` and `npm --prefix client install`.
4. Copy `.env.example` to `server/.env`.
5. In Supabase, create a project and copy its PostgreSQL connection string into `DATABASE_URL` in `server/.env`. Use the connection string format Supabase shows; keep secrets private.
6. Set `AUTH_SECRET` to a long random secret (32+ characters). Set `CLIENT_ORIGIN=http://localhost:5173`.
7. Run `npm run db:generate`.
8. Run `npm run db:push` to create/update the database tables.
9. Optional demo data: `npm run db:seed`. Seed accounts use `ChangeMe123!`; do not leave demo accounts active on a public deployment.
10. Run `npm run dev`.
11. Open `http://localhost:5173`. API health check: `http://localhost:4000/api/health`.

## Build
- Frontend production build: `npm run build`
- Server TypeScript build: `npm --prefix server run build`

## Render deployment
For the API service, use the repository root as the root directory, build command `npm install && npm --prefix server install && npm --prefix server run db:generate && npm --prefix server run build`, and start command `npm --prefix server start`. Add `DATABASE_URL`, `AUTH_SECRET`, `CLIENT_ORIGIN`, and `PORT` environment variables. For the frontend, create a separate Render Static Site with root directory `client`, build command `npm install && npm run build`, publish directory `dist`, and `VITE_API_URL` pointing to the API service URL. To keep the *same existing Render URL*, it depends on how the current Render service is configured; replacing its source code may require changing build/start settings. Keep the old service/backup until the new deployment passes tests.

## Database and storage
The Prisma schema is in `server/prisma/schema.prisma`. This starter uses image URLs in posts. Supabase Storage upload integration is not wired yet; do not expose the Supabase service-role key in frontend code. Configure a private backend upload route and appropriate bucket policies before enabling uploads.

## Admin account
Do not add a public admin signup option. The initial registration endpoint always creates a normal `USER`. For a first admin, register your account, then promote it manually in the database from `USER` to `ADMIN` using a secure SQL session. Example (replace username carefully): `UPDATE "User" SET role='ADMIN' WHERE username='your_username';`. Never expose database credentials in the browser or commit them to GitHub.

## Payments
No real bKash/Nagad integration or payment credentials are included. Do not award purchased points until a trusted provider's server-side verification confirms payment. This starter has no cash-out/withdrawal.

## Security notes before public launch
- Replace the development fallback secret; set `AUTH_SECRET` in the server environment.
- Use HTTPS and secure environment variables. Never commit `.env`.
- Add email verification/password reset, CSRF strategy appropriate to deployment, stronger anti-abuse checks, block/mute tools, full admin audit logs, content moderation, upload scanning, backup/restore procedures, and tests before launch.
- The current steal transaction uses database transactions, but should be reviewed and concurrency-tested for your production database. Add daily limits and suspicious-activity monitoring before opening it to the public.
- Demo seed users share a known password; remove or change them before production.
