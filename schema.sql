CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  password_hash text,
  display_name text NOT NULL DEFAULT 'Jugador',
  email_verified_at timestamptz,
  referral_code text UNIQUE NOT NULL,
  referred_by uuid REFERENCES users(id) ON DELETE SET NULL,
  referral_awarded_at timestamptz,
  qualified_activity_at timestamptz,
  next_hourly_claim_at timestamptz,
  next_wheel_spin_at timestamptz,
  risk_status text NOT NULL DEFAULT 'clear' CHECK (risk_status IN ('clear','review','blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq ON users (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_identities (
  provider text NOT NULL CHECK (provider IN ('google','facebook','instagram')),
  provider_user_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_at_link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS email_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify','reset','delete')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points_ledger (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points bigint NOT NULL CHECK (points <> 0),
  reason text NOT NULL,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reason, reference)
);
CREATE INDEX IF NOT EXISTS points_ledger_user_date_idx ON points_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lottery_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  draw_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  winner boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS lottery_tickets_draw_idx ON lottery_tickets(draw_date);

CREATE TABLE IF NOT EXISTS daily_jackpots (
  draw_date date PRIMARY KEY,
  revenue numeric(14,6) NOT NULL DEFAULT 0,
  jackpot_amount numeric(14,6) NOT NULL DEFAULT 0,
  winner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ad_conversions (
  provider text NOT NULL,
  conversion_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_id text,
  event_name text,
  reward_points bigint NOT NULL,
  revenue numeric(14,6) NOT NULL,
  status text NOT NULL DEFAULT 'credited' CHECK (status IN ('credited','reversed','review')),
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider, conversion_id)
);
CREATE INDEX IF NOT EXISTS ad_conversions_user_idx ON ad_conversions(user_id, created_at DESC);

-- Daily publisher-reported totals are imported idempotently (not per impression).
CREATE TABLE IF NOT EXISTS ad_revenue_daily (
  provider text NOT NULL,
  draw_date date NOT NULL,
  revenue numeric(14,6) NOT NULL CHECK (revenue >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider, draw_date)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_recent_idx ON chat_messages(created_at DESC) WHERE hidden=false;
CREATE TABLE IF NOT EXISTS chat_reports (
  message_id bigint NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  reporter_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'reported',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(message_id,reporter_user_id)
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('bot','multiplayer','solo')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','complete','abandoned')),
  score integer,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward_points bigint NOT NULL DEFAULT 0,
  ad_verified boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS fraud_signals (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  signal text NOT NULL,
  ip_hash text,
  device_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fraud_signals_user_idx ON fraud_signals(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id text NOT NULL,
  room_code text UNIQUE NOT NULL,
  host_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','playing','complete','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS game_room_players (
  room_id uuid NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seat integer NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(room_id,user_id), UNIQUE(room_id,seat)
);
