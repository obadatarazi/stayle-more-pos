-- Optional note on expenses
ALTER TABLE expenses
  ADD COLUMN note VARCHAR(255) NULL AFTER due_date;
