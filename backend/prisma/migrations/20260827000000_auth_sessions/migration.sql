CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL UNIQUE,
  expires_at timestamptz(6) NOT NULL,
  revoked_at timestamptz(6),
  used_at timestamptz(6),
  rotated_from_id uuid REFERENCES sessions(id),
  created_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_expires_at_idx ON sessions(user_id, expires_at);
CREATE INDEX sessions_rotated_from_id_idx ON sessions(rotated_from_id);
