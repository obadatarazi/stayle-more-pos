-- Add quick_sale flag for existing databases
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS quick_sale TINYINT(1) NOT NULL DEFAULT 0 AFTER reorder_level;

-- MariaDB < 10.5 may not support IF NOT EXISTS on ADD COLUMN; fallback handled in deploy script
