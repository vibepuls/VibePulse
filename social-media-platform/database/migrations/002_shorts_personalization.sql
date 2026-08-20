-- VibePulse personalized Shorts recommendation engine
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_interests JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_users_user_interests_gin
  ON users USING GIN (user_interests);

CREATE TABLE IF NOT EXISTS shorts_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id VARCHAR(32) NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    event_type VARCHAR(30) NOT NULL CHECK (
      event_type IN ('watch_70','loop','like','share','comment','skip')
    ),
    watch_duration_ms INTEGER NOT NULL DEFAULT 0,
    watch_percent NUMERIC(6,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shorts_interactions_user_created
  ON shorts_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shorts_interactions_video
  ON shorts_interactions(video_id);
