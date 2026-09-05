-- Bot or Not - D1 schema
-- Two core tables per spec section 4.

CREATE TABLE IF NOT EXISTS days (
  date TEXT PRIMARY KEY,          -- game day, YYYY-MM-DD (player-local date key)
  day_number INTEGER NOT NULL,    -- "Bot or Not #12"
  cards_json TEXT NOT NULL        -- JSON array of 5 cards:
                                  -- [{id, context_label:{he,en}, text, is_ai, tell:{he,en}}]
                                  -- is_ai and tell are NEVER sent to the client before submit.
);

CREATE TABLE IF NOT EXISTS plays (
  anon_id TEXT NOT NULL,
  date TEXT NOT NULL,             -- game day this play belongs to
  score INTEGER NOT NULL,         -- 0-5
  answers_json TEXT NOT NULL,     -- JSON array of 5 booleans: true = guessed "bot"
  ts INTEGER NOT NULL,            -- unix seconds
  PRIMARY KEY (anon_id, date)
);


CREATE INDEX IF NOT EXISTS idx_plays_date ON plays(date);
