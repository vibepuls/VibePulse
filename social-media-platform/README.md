# Social Media Platform

A full-stack social media platform foundation built with React, Node.js/Express, PostgreSQL, and Socket.IO.

## Features

- **User Authentication**: Registration, login, JWT tokens, password reset, session management
- **User Profiles**: Profile/cover photos, bio, location, website, follower/following counts
- **Follow System**: Follow/unfollow, private accounts with follow requests
- **Posts**: Text, image, video posts with privacy settings (public/followers/private)
- **Interactions**: Reactions, comments with replies, share/repost, bookmarks
- **Stories**: 24-hour image/video/text stories with a simple viewer and text-story composer
- **Real-time Messaging**: WebSocket-powered direct messaging with typing indicators
- **Notifications**: Real-time notifications for all interactions
- **Search**: Search users, posts, and hashtags
- **Explore**: Trending posts and hashtags
- **Admin Panel**: User management, content moderation, reports, analytics
- **Privacy**: Granular privacy settings, block/mute users, messaging restrictions
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Mode**: Light/dark/system theme support

## Tech Stack

- **Frontend**: React 18, React Router, Tailwind CSS, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO
- **Database**: PostgreSQL
- **Authentication**: JWT with refresh tokens, bcrypt password hashing
- **File Uploads**: Multer with file type validation
- **Security**: Helmet, CORS, rate limiting, SQL injection prevention

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd social-media-platform
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials and secrets
```

4. Set up the database:
```bash
# Create a PostgreSQL database named 'social_media_db'
# Update .env with your database credentials
npm run migrate
```

5. Start the development servers:
```bash
npm run dev
```

This will start both the backend (port 5000) and frontend (port 5173) with hot reload.

## Environment Variables

Create a `.env` file in the root and server directories:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/social_media_db
# OR individual variables:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=social_media_db
DB_USER=username
DB_PASSWORD=password

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_refresh_secret

# Email (optional, for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## Production Build

```bash
# Build the frontend
cd client && npm run build

# Start the production server
cd ../server && npm start
```

## Render.com Deployment

### 1. Create PostgreSQL Database
- Go to Render Dashboard → New → PostgreSQL
- Choose a name and region
- Copy the "Internal Database URL"

### 2. Create Web Service
- Go to Render Dashboard → New → Web Service
- Connect your GitHub repository
- Configure:
  - **Root Directory**: `server`
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`
- Add environment variables:
  - `NODE_ENV`: `production`
  - `DATABASE_URL`: (paste from PostgreSQL service)
  - `JWT_SECRET`: (generate a random string)
  - `JWT_REFRESH_SECRET`: (generate another random string)
  - `CLIENT_URL`: (your frontend URL or Render static site URL)

### 3. Create Static Site (Frontend)
- Go to Render Dashboard → New → Static Site
- Connect the same repository
- Configure:
  - **Root Directory**: `client`
  - **Build Command**: `npm install && npm run build`
  - **Publish Directory**: `dist`
- Add environment variable:
  - `VITE_API_URL`: `https://your-backend-service.onrender.com/api`

### 4. Update CORS
Make sure `CLIENT_URL` in your backend environment variables matches your static site URL.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Users
- `GET /api/users/search?q=` - Search users
- `GET /api/users/profile/:username` - Get user profile
- `PATCH /api/users/profile` - Update profile
- `POST /api/users/follow/:userId` - Follow user
- `POST /api/users/unfollow/:userId` - Unfollow user
- `GET /api/users/privacy` - Get privacy settings
- `PATCH /api/users/privacy` - Update privacy settings

### Posts
- `GET /api/posts/feed` - Get home feed
- `GET /api/posts/trending` - Get trending posts
- `GET /api/posts/user/:username` - Get user's posts
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post (multipart/form-data)
- `PATCH /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/share` - Share/repost

### Comments
- `GET /api/comments/post/:postId` - Get comments
- `POST /api/comments/post/:postId` - Add comment
- `PATCH /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Messages
- `GET /api/messages/conversations` - Get conversations
- `POST /api/messages/conversations` - Start conversation
- `GET /api/messages/conversations/:id` - Get messages
- `POST /api/messages/conversations/:id` - Send message

### Admin
- `GET /api/admin/dashboard` - Get stats
- `GET /api/admin/users` - List users
- `POST /api/admin/users/:id/suspend` - Suspend user
- `GET /api/admin/reports` - Get reports

## Project Structure

```
social-media-platform/
├── server/                 # Backend
│   ├── config/            # Database config
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Auth, upload, rate limiting
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── websocket/         # Socket.IO setup
│   ├── uploads/           # File uploads
│   ├── app.js             # Express app
│   └── server.js          # Entry point
├── client/                 # Frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service
│   │   ├── admin/         # Admin panel
│   │   └── App.jsx
│   └── index.html
├── database/migrations/    # SQL schema
├── .env.example
├── package.json
└── README.md
```

## Important deployment note

This version intentionally keeps media files on the backend filesystem so the project can be deployed without an external storage provider. On Render, the local filesystem is not a durable long-term media store. Add an object-storage provider later before relying on permanent image/video uploads.

## Security Features

- Password hashing with bcrypt (12 rounds)
- JWT authentication with refresh tokens
- Rate limiting on auth and API endpoints
- SQL injection prevention via parameterized queries
- XSS protection through output encoding
- File upload validation (type and size)
- Authentication and API rate limiting
- Refresh-token rotation and session invalidation on password reset
- CORS configuration
- Helmet security headers

## Troubleshooting

### Database connection errors
- Verify PostgreSQL is running
- Check DATABASE_URL or individual DB_* variables
- Ensure database exists: `createdb social_media_db`

### Port already in use
- Change PORT in .env
- Kill existing process: `npx kill-port 5000`

### File upload errors
- Ensure `uploads` directory exists and is writable
- Check MAX_FILE_SIZE in .env

### WebSocket not working
- Verify CORS origins match your frontend URL
- Check that Socket.IO client connects to correct server URL

## License

MIT
