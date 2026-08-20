# VibePulse Shorts Personalization

## Database
Run `database/migrations/002_shorts_personalization.sql` against the VibePulse PostgreSQL database.

It adds:
- `users.user_interests` JSONB score map
- `shorts_interactions` event history table

## API
- `GET /api/shorts` — optional auth; returns a 70/20/10 personalized/trending/exploration blend.
- `POST /api/shorts/track` — authenticated silent interaction tracking.
- `GET /api/shorts/interests` — authenticated user's current interest scores.

The Shorts cursor is opaque and carries independent YouTube page tokens for the personalized, trending, and exploration lanes.

## Scoring
- watch_70: +2
- loop: +2.5
- like: +4
- share: +5
- comment: +3
- skip under 2 seconds: -1.5

Scores are clamped to 0..20.

## Guest defaults
Guests/new users receive general Bangla/English discovery queries including `#viral`, `#trending`, `#bangla`, `#বাংলা`, plus exploration.

## Frontend
`client/src/pages/Shorts.jsx` tracks visibility/watch/skip and explicit interactions without blocking playback. Tracking failures are ignored so the feed remains usable.
