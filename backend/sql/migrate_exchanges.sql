-- Currency exchange log (SYP <-> USD); not part of any report
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
