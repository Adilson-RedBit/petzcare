-- Migration: Create working_hours table
-- Description: Stores business working hours configuration

CREATE TABLE IF NOT EXISTS working_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start_time TEXT NOT NULL, -- Format: HH:MM
  end_time TEXT NOT NULL, -- Format: HH:MM
  is_active INTEGER DEFAULT 1, -- 1 = active, 0 = inactive
  break_start TEXT, -- Optional break start time
  break_end TEXT, -- Optional break end time
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups by day
CREATE INDEX IF NOT EXISTS idx_working_hours_day ON working_hours(day_of_week);

-- Insert default working hours (Monday to Saturday, 8AM to 6PM)
INSERT INTO working_hours (day_of_week, start_time, end_time, is_active, break_start, break_end) VALUES
  (1, '08:00', '18:00', 1, '12:00', '13:00'), -- Monday
  (2, '08:00', '18:00', 1, '12:00', '13:00'), -- Tuesday
  (3, '08:00', '18:00', 1, '12:00', '13:00'), -- Wednesday
  (4, '08:00', '18:00', 1, '12:00', '13:00'), -- Thursday
  (5, '08:00', '18:00', 1, '12:00', '13:00'), -- Friday
  (6, '08:00', '18:00', 1, '12:00', '13:00'); -- Saturday
