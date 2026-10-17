-- Per-product USD rate (SYP price = price_usd * usd_rate) and store-wide settings
-- Run after migrate_price_usd.sql
ALTER TABLE products
  ADD COLUMN usd_rate DECIMAL(14,4) NOT NULL DEFAULT 0 AFTER price_usd;

CREATE TABLE IF NOT EXISTS settings (
  name VARCHAR(64) NOT NULL,
  value VARCHAR(255) NOT NULL,
  PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
