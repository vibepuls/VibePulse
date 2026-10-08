# VibePulse

VibePulse is a React + Node/Express + PostgreSQL social application. This upgrade changes the main feed to **zero-backend-media-storage** mode: posts store captions and remote media URLs/metadata only. The backend does not download or save feed images/videos.

## What changed

### 1. Zero-storage feed
The Create Post composer now has:
- Caption/hashtag textarea.
- Remote media URL field.

Supported:
- YouTube
- Facebook
- Instagram
- Direct `.jpg/.jpeg/.png/.gif/.webp/.avif` image URLs
- Direct `.mp4/.webm/.mov/.m4v/.ogv` video URLs

The backend parses the URL and stores only:
- provider
- original URL
- media type
- embed URL

The UI never prints the raw media URL in the feed card. It renders the original media or a platform iframe.

### 2. Database
`post_media` now has:
- `provider`
- `embed_url`

Run the existing migration command:

```bash
cd server
npm run migrate:up
```

The migration is idempotent and upgrades an existing database.

### 3. Profile and cover photos
Profile and cover photo changes now use remote URLs. The profile page provides:
- Direct image URL
- Optional Cloudinary unsigned upload

The image is uploaded directly from the browser to Cloudinary, then only the returned URL is saved in PostgreSQL. The VibePulse backend never receives or stores the image bytes.

Client environment:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

Create an **unsigned image upload preset** in Cloudinary and restrict it to images if possible.

### 4. Existing uploads
The repository still contains legacy upload support for stories/messages and old `/uploads` records. **New feed posts do not use Multer and do not write feed media to `server/uploads`.** Existing old post media continues to render for backward compatibility.

If you want a completely filesystem-free deployment later, migrate legacy stories/messages to the same direct-cloud approach and remove `server/uploads`.

## Deployment

### Backend on Render
- Root directory: `server`
- Build: `npm install`
- Start: `npm start`
- Environment:
  - `NODE_ENV=production`
  - `DATABASE_URL=...`
  - `JWT_SECRET=...`
  - `JWT_REFRESH_SECRET=...`
  - `CLIENT_URL=https://your-frontend-domain`

Run migration once:

```bash
npm run migrate:up
```

### Frontend on Vercel/Render
- Root directory: `client`
- Build: `npm install && npm run build`
- Output: `dist`
- Environment:

```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
```

For Vercel, configure a rewrite for SPA routes if your deployment setup requires it.

## Security notes

The embed parser uses URL/hostname allow-list logic rather than fetching arbitrary URLs from the backend. This avoids turning the post endpoint into an SSRF proxy.

For production Cloudinary:
- Use an unsigned preset restricted to images.
- Do not put Cloudinary API secrets in Vite environment variables.
- Consider Cloudinary upload restrictions, transformations, and moderation as the project grows.

## Project structure

```text
social-media-platform/
├── client/
│   └── src/
│       ├── components/
│       │   ├── CreatePost.jsx
│       │   ├── MediaEmbed.jsx
│       │   └── PostCard.jsx
│       ├── pages/Profile.jsx
│       └── services/
│           └── cloudinary.js
├── server/
│   ├── controllers/
│   │   ├── postController.js
│   │   └── userController.js
│   ├── models/Post.js
│   ├── routes/posts.js
│   ├── routes/users.js
│   └── utils/embedParser.js
└── database/
    └── migrations/001_initial_schema.sql
```
