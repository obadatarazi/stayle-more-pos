-- Style More POS · MariaDB/MySQL schema
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  short_name VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  sku VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  name_ar VARCHAR(255) NOT NULL,
  category VARCHAR(120) NOT NULL DEFAULT 'أخرى',
  cost DECIMAL(14,2) NOT NULL DEFAULT 0,
  price DECIMAL(14,2) NOT NULL DEFAULT 0,
  cost_usd DECIMAL(14,2) NOT NULL DEFAULT 0,
  usd_rate DECIMAL(14,4) NOT NULL DEFAULT 0,
  initial_stock INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 5,
  quick_sale TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (sku),
  KEY idx_products_quick_sale (quick_sale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales (
  id BIGINT NOT NULL,
  date DATE NOT NULL,
  sku VARCHAR(64) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(14,2) NULL,
  unit_cost DECIMAL(14,2) NULL,
  unit_cost_usd DECIMAL(14,2) NULL,
  sold_by VARCHAR(64) NULL,
  sold_by_name VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sales_date (date),
  KEY idx_sales_sku (sku),
  KEY idx_sales_sold_by (sold_by),
  CONSTRAINT fk_sales_product FOREIGN KEY (sku) REFERENCES products (sku) ON DELETE CASCADE,
  CONSTRAINT chk_sales_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT NOT NULL,
  category VARCHAR(120) NOT NULL,
  category_ar VARCHAR(120) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  due_date DATE NOT NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_expenses_due (due_date),
  CONSTRAINT chk_expenses_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  name VARCHAR(64) NOT NULL,
  value VARCHAR(255) NOT NULL,
  PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exchanges (
  id BIGINT NOT NULL,
  date DATE NOT NULL,
  direction VARCHAR(16) NOT NULL,
  syp_amount DECIMAL(16,2) NOT NULL,
  usd_amount DECIMAL(14,2) NOT NULL,
  note VARCHAR(255) NULL,
  done_by VARCHAR(64) NULL,
  done_by_name VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_exchanges_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
