-- Add wallet_address to agents table for MoltRank integration
ALTER TABLE agents ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42);
CREATE INDEX IF NOT EXISTS idx_agents_wallet_address ON agents(wallet_address);
