# VibePulse — Social Gaming Arena

VibePulse combines a photo community with a point economy and friendly competition:

**Post → Earn → Steal → Gift → Battle → Rank**

The current MVP includes:
- Username-based registration and login with password hashing.
- Photo posts, privacy choices, likes, comments, and a 4-hour post-edit cooldown.
- Server-verified point balance, transaction history, 3-point stealing, 4-second per-target cooldown, daily steal limit, and point gifting.
- Overall/daily/weekly rankings, trending posts, and rising users.
- Server-tracked daily missions, achievements, free Quick Tap practice rewards, free mystery rewards, teams, and photo battles.
- Referrals, notifications, private messages, reports, admin point adjustments, moderation, and audit logs.
- Optional image upload through a backend route to Supabase Storage.

This is an actively developed MVP, not yet a claim that every item in the full specification is production-ready. Real-money point purchase, bKash/Nagad verification, email verification, advanced anti-fraud/device analysis, and full automated tests are not included. Do not award purchased points without a trusted payment provider's server-side confirmation.

## Requirements

- Node.js 20 or newer (Node.js 22 is recommended)
- npm
- A PostgreSQL database (Supabase PostgreSQL is supported)

## Local setup

1. Make a backup of the Supabase database before changing any schema.
2. From the repository root, run:

   ```bash
   npm install
   npm --prefix server install
   npm --prefix client install
   ```

3. Create `server/.env` using `server/.env.example`.
4. Set `DATABASE_URL` to the Supabase PostgreSQL connection string. Keep it private.
5. Set `AUTH_SECRET` to a unique, long random secret (32+ characters).
6. Set `CLIENT_ORIGIN=http://localhost:5173`.
7. Generate the Prisma client:

   ```bash
   npm run db:generate
   ```

8. After checking the schema and backing up the database, apply the Prisma schema:

   ```bash
   npm run db:push
   ```

   This creates/updates tables used by this app. Do not accept any proposed destructive schema change without inspecting it first. Existing legacy tables should not be manually deleted.

9. Optional local demo data:

   ```bash
   npm run db:seed
   ```

   Seed accounts share the known password `ChangeMe123!`. Do not leave demo accounts enabled on a public deployment.

10. Start frontend and API:

   ```bash
   npm run dev
   ```

11. Open `http://localhost:5173`. API health check: `http://localhost:4000/api/health`.

## Environment variables

### API service — `server/.env` or Render API environment

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require
AUTH_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGIN=http://localhost:5173
PORT=4000

# Optional image upload to Supabase Storage:
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=vibepulse-media
```

For image uploads, create a bucket named `vibepulse-media` in Supabase Storage and configure it for the public image URLs used by the feed. The service-role key belongs only in the API environment; never put it in a `VITE_*` variable, browser code, or GitHub.

If image upload environment variables are not configured, users can still publish a post using a direct HTTPS image URL.

### Frontend — `client/.env` or Render Static Site environment

```dotenv
VITE_API_URL=https://YOUR-API-SERVICE.onrender.com/api
```

Use the real URL of your API service. Do not include credentials in this value.

## Build checks

```bash
npm run db:generate
npm --prefix server run build
npm --prefix client run build
```

GitHub Actions runs the same install/build checks on pushes and pull requests.

## Render deployment

For a separate API Web Service:
- Root directory: repository root
- Build command: `npm install && npm --prefix server install && npm --prefix server run db:generate && npm --prefix server run build`
- Start command: `npm --prefix server start`
- Environment: `DATABASE_URL`, `AUTH_SECRET`, `CLIENT_ORIGIN`, and `PORT`; add the three optional Supabase Storage variables to enable file uploads.

For a Static Site frontend:
- Root directory: `client`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment: `VITE_API_URL=https://YOUR-API-SERVICE.onrender.com/api`

Before switching the existing public site to this app, back up the current deploy settings and database. Do not run a schema push against production until the generated Prisma changes have been reviewed. Keep the previous Render deployment available until signup, login, posting, points, and moderation have been verified.

## First admin account

Public registration always creates a normal `USER`. To promote your own account, use a secure database session after registering:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE username = 'your_username';
```

Replace `your_username` with your exact username. Never expose database credentials or the service-role key to the browser.

## Important production limitations

- Payment integration and cash-out are intentionally not enabled.
- Stronger fraud monitoring, email verification, moderation review workflows, backup/restore drills, and broader automated security tests are still needed before a wide public launch.
- The daily ranking is based on recorded point transaction movement; it is not an analytics-grade ranking service.
