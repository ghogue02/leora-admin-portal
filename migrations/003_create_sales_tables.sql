-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  lead_source VARCHAR(50) NOT NULL,
  interest_level VARCHAR(20) NOT NULL,
  estimated_value DECIMAL(15, 2),
  products_interested TEXT,
  assigned_rep_id VARCHAR(36),
  current_stage VARCHAR(50) NOT NULL,
  notes TEXT,
  converted_to_customer_id VARCHAR(36),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_current_stage (current_stage),
  INDEX idx_assigned_rep_id (assigned_rep_id),
  INDEX idx_lead_source (lead_source),
  INDEX idx_interest_level (interest_level),
  INDEX idx_created_at (created_at)
);

-- Create lead_stage_history table
CREATE TABLE IF NOT EXISTS lead_stage_history (
  id VARCHAR(36) PRIMARY KEY,
  lead_id VARCHAR(36) NOT NULL,
  stage VARCHAR(50) NOT NULL,
  entered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  exited_at TIMESTAMP,
  moved_by VARCHAR(36) NOT NULL,
  notes TEXT,
  win_loss_reason TEXT,
  INDEX idx_lead_id (lead_id),
  INDEX idx_stage (stage),
  INDEX idx_entered_at (entered_at),
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Create sales_reps table (if not exists)
CREATE TABLE IF NOT EXISTS sales_reps (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  territory VARCHAR(100),
  quota_monthly DECIMAL(15, 2),
  quota_annual DECIMAL(15, 2),
  commission_rate DECIMAL(5, 2),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_user_id (user_id),
  INDEX idx_active (active)
);

-- Create products table (if not exists)
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(15, 2),
  category VARCHAR(100),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_category (category),
  INDEX idx_active (active)
);

-- Insert sample data for testing (optional)
-- This can be commented out in production

-- Sample sales rep
-- INSERT INTO sales_reps (id, tenant_id, user_id, name, email, quota_monthly, quota_annual, commission_rate)
-- VALUES (
--   UUID(),
--   'sample-tenant-id',
--   'sample-user-id',
--   'John Smith',
--   'john.smith@example.com',
--   50000.00,
--   600000.00,
--   5.00
-- );

-- Sample products
-- INSERT INTO products (id, tenant_id, name, description, price, category)
-- VALUES
--   (UUID(), 'sample-tenant-id', 'Product A', 'Enterprise solution', 10000.00, 'Software'),
--   (UUID(), 'sample-tenant-id', 'Product B', 'Standard package', 5000.00, 'Software'),
--   (UUID(), 'sample-tenant-id', 'Service X', 'Consulting services', 15000.00, 'Services');
