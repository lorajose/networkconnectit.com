ALTER TABLE OperationsScheduleEntry
  ADD COLUMN timeZone VARCHAR(64) NOT NULL DEFAULT 'America/New_York' AFTER endsAt;
