-- Track which staff user recorded each sale
ALTER TABLE sales
  ADD COLUMN sold_by VARCHAR(64) NULL AFTER unit_price,
  ADD COLUMN sold_by_name VARCHAR(120) NULL AFTER sold_by;

CREATE INDEX idx_sales_sold_by ON sales (sold_by);
