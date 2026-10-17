-- USD selling price on products, frozen on each sale like unit_price/unit_cost
-- Run after migrate_unit_cost.sql
ALTER TABLE products
  ADD COLUMN price_usd DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER price;

ALTER TABLE sales
  ADD COLUMN unit_price_usd DECIMAL(14,2) NULL AFTER unit_cost;
