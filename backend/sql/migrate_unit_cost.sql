-- Store the product cost on each sale so later cost changes don't alter past profit
ALTER TABLE sales
  ADD COLUMN unit_cost DECIMAL(14,2) NULL AFTER unit_price;

-- Freeze existing sales at the current product cost and price
UPDATE sales s
  JOIN products p ON p.sku = s.sku
SET s.unit_cost = COALESCE(s.unit_cost, p.cost),
    s.unit_price = COALESCE(s.unit_price, p.price);
