-- Dhaka Open World game profiles, server-owned mission rewards and sessions.
CREATE TABLE IF NOT EXISTS dhaka_game_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  score BIGINT NOT NULL DEFAULT 0 CHECK (score >= 0),
  missions_completed INTEGER NOT NULL DEFAULT 0 CHECK (missions_completed >= 0),
  play_seconds BIGINT NOT NULL DEFAULT 0 CHECK (play_seconds >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dhaka_game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','finished','expired')),
  active_mission_id TEXT NOT NULL DEFAULT 'explore',
  mission_started_at TIMESTAMPTZ DEFAULT NOW(),
  mission_target_x DOUBLE PRECISION,
  mission_target_z DOUBLE PRECISION,
  player_x DOUBLE PRECISION,
  player_z DOUBLE PRECISION,
  player_heading DOUBLE PRECISION NOT NULL DEFAULT 0,
  vehicle_type TEXT NOT NULL DEFAULT 'car',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dhaka_game_sessions_user_active_idx
  ON dhaka_game_sessions(user_id, started_at DESC) WHERE status='active';

CREATE TABLE IF NOT EXISTS dhaka_game_mission_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES dhaka_game_sessions(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  reward INTEGER NOT NULL CHECK (reward BETWEEN 1 AND 5000),
  completion_day DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, mission_id, completion_day)
);

CREATE INDEX IF NOT EXISTS dhaka_game_missions_user_date_idx
  ON dhaka_game_mission_completions(user_id, completed_at DESC);
