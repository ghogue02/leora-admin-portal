-- Migration: Create recommendation_feedback table
-- Purpose: Track AI recommendation feedback for analytics and improvement
-- Created: 2024-01-25

-- Create recommendation_feedback table
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommendation_reason TEXT NOT NULL,
  confidence_score NUMERIC(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  action VARCHAR(20) NOT NULL CHECK (action IN ('accepted', 'rejected', 'deferred')),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes for common queries
  CONSTRAINT valid_confidence CHECK (confidence_score BETWEEN 0 AND 1)
);

-- Indexes for performance
CREATE INDEX idx_recommendation_feedback_customer ON recommendation_feedback(customer_id);
CREATE INDEX idx_recommendation_feedback_product ON recommendation_feedback(product_id);
CREATE INDEX idx_recommendation_feedback_action ON recommendation_feedback(action);
CREATE INDEX idx_recommendation_feedback_created_at ON recommendation_feedback(created_at DESC);

-- Composite index for analytics queries
CREATE INDEX idx_recommendation_feedback_analytics ON recommendation_feedback(customer_id, action, created_at DESC);

-- Comments for documentation
COMMENT ON TABLE recommendation_feedback IS 'Tracks user interactions with AI-powered product recommendations';
COMMENT ON COLUMN recommendation_feedback.recommendation_reason IS 'The AI-generated reason for this recommendation';
COMMENT ON COLUMN recommendation_feedback.confidence_score IS 'AI confidence score (0-1) for the recommendation';
COMMENT ON COLUMN recommendation_feedback.action IS 'User action: accepted (added to order), rejected (not interested), or deferred (maybe later)';
COMMENT ON COLUMN recommendation_feedback.order_id IS 'If accepted, the order ID where the product was added';

-- Grant permissions (adjust based on your RLS policies)
-- This is just an example - modify based on your security requirements
-- ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;
