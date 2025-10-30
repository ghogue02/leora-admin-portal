-- Create invoices table to track downloaded invoices
CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,
  reference_number INTEGER UNIQUE NOT NULL,
  date DATE,
  customer_name TEXT,
  delivery_method TEXT,
  status TEXT,
  invoice_type TEXT,
  file_path TEXT,
  file_size_kb NUMERIC,
  download_status TEXT DEFAULT 'pending',
  downloaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on reference number for fast lookups
CREATE INDEX IF NOT EXISTS idx_invoices_reference ON invoices(reference_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(download_status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create download_log table for tracking all attempts
CREATE TABLE IF NOT EXISTS download_log (
  id BIGSERIAL PRIMARY KEY,
  reference_number INTEGER NOT NULL,
  attempt_status TEXT NOT NULL, -- 'success', 'not_found', 'error'
  message TEXT,
  error_details TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_download_log_reference ON download_log(reference_number);
CREATE INDEX IF NOT EXISTS idx_download_log_status ON download_log(attempt_status);

COMMENT ON TABLE invoices IS 'Stores metadata for downloaded HAL App invoices';
COMMENT ON TABLE download_log IS 'Logs all download attempts for tracking and debugging';
