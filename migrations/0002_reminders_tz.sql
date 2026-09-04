-- Add timezone + last-sent tracking to reminders (for the cron sender).
ALTER TABLE reminders ADD COLUMN tz TEXT;        -- IANA tz from the player's browser, NULL = game default
ALTER TABLE reminders ADD COLUMN last_sent TEXT; -- subscriber-local date (YYYY-MM-DD) of last send
