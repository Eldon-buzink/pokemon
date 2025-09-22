-- Create manual overrides table for admin PSA10 price adjustments
CREATE TABLE IF NOT EXISTS manual_overrides (
  set_id text NOT NULL,
  number text NOT NULL,
  psa10_override numeric,
  reason text,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (set_id, number)
);

-- Add comments
COMMENT ON TABLE manual_overrides IS 'Manual PSA10 price overrides for admin corrections';
COMMENT ON COLUMN manual_overrides.psa10_override IS 'Manual PSA10 price override in USD';
COMMENT ON COLUMN manual_overrides.reason IS 'Reason for the manual override';
