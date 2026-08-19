# Render deployment

## PostgreSQL
1. Create a Render PostgreSQL database.
2. Copy its Internal Database URL.
3. Run the migration against that database using the server service shell or a one-off job:
   `npm run migrate:up`

## Backend Web Service
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment:
  - `NODE_ENV=production`
  - `DATABASE_URL=<Render internal database URL>`
  - `JWT_SECRET=<long random secret>`
  - `JWT_REFRESH_SECRET=<different long random secret>`
  - `CLIENT_URL=<your frontend URL>`
  - Optional SMTP variables for password reset emails

Health check: `/health`

## Frontend Static Site
- Root Directory: `client`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Environment:
  - `VITE_API_URL=https://YOUR-BACKEND.onrender.com/api`

If the frontend URL changes, update `CLIENT_URL` on the backend.

## Media warning
The current app stores uploaded media under `server/uploads`. This is fine for testing, but Render's ephemeral filesystem should not be treated as permanent storage. Add Cloudflare R2, S3, Cloudinary, or another object-storage provider later for durable media.

## React Router rewrite
In the Render Static Site, add a rewrite:
- Source: `/*`
- Destination: `/index.html`
- Action: `Rewrite`

This keeps direct links such as `/profile/name`, `/post/id`, and `/reset-password` working after refresh.
