CREATE TABLE character_net_worth_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  world_instance_id UUID NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  world_year INTEGER NOT NULL,
  world_month INTEGER NOT NULL,
  cash_in_hand NUMERIC(15, 2) NOT NULL DEFAULT 0,
  equity_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_net_worth NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_char_net_worth_hist_char_id ON character_net_worth_history(character_id);
CREATE INDEX idx_char_net_worth_hist_world_id ON character_net_worth_history(world_instance_id);
