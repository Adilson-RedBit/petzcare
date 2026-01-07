-- Migration: Remove appointment_duration from working_hours
-- Description: Remove the fixed appointment duration field as we now calculate dynamically

-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
CREATE TABLE working_hours_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  break_start TEXT,
  break_end TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table (excluding appointment_duration)
INSERT INTO working_hours_new (id, day_of_week, start_time, end_time, is_active, break_start, break_end, created_at, updated_at)
SELECT id, day_of_week, start_time, end_time, is_active, break_start, break_end, created_at, updated_at
FROM working_hours;

-- Drop old table
DROP TABLE working_hours;

-- Rename new table
ALTER TABLE working_hours_new RENAME TO working_hours;

-- Recreate index
CREATE INDEX idx_working_hours_day ON working_hours(day_of_week);
