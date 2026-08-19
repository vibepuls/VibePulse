# Render deployment for VibePulse

## Backend
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment:
  - `NODE_ENV=production`
  - `DATABASE_URL=<Render PostgreSQL URL>`
  - `JWT_SECRET=<long random secret>`
  - `JWT_REFRESH_SECRET=<different long random secret>`
  - `CLIENT_URL=<frontend URL>`

After deployment, run the migration once:

```bash
npm run migrate:up
```

Health check: `/health`

## Frontend
- Root Directory: `client`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Environment:
  - `VITE_API_URL=https://YOUR-BACKEND.onrender.com/api`
  - `VITE_CLOUDINARY_CLOUD_NAME=<cloud name>`
  - `VITE_CLOUDINARY_UPLOAD_PRESET=<unsigned preset>`

## Zero-storage media behavior
Feed posts no longer accept multipart media uploads. The feed stores only remote media URLs and embed metadata in PostgreSQL. YouTube/Facebook/Instagram media is displayed with iframe embeds; direct image/video URLs are loaded by the browser from the original host.

Profile/cover uploads go directly from the browser to Cloudinary and only the returned URL is stored in PostgreSQL.

Legacy story/message uploads remain in the repository for compatibility. They are unrelated to the new feed pipeline.
