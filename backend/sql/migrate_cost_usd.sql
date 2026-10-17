-- The USD amount on products is the cost, not the selling price
-- Run after migrate_usd_rate.sql
ALTER TABLE products
  CHANGE COLUMN price_usd cost_usd DECIMAL(14,2) NOT NULL DEFAULT 0;

ALTER TABLE sales
  CHANGE COLUMN unit_price_usd unit_cost_usd DECIMAL(14,2) NULL;
