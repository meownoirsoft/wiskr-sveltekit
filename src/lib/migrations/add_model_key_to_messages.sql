-- Add model_key column to messages table
-- This stores which AI model was used for each assistant response

DO $$
BEGIN
    -- Add model_key column to messages table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'model_key'
    ) THEN
        ALTER TABLE messages ADD COLUMN model_key TEXT DEFAULT NULL;
        
        -- Add index for performance when querying by model
        CREATE INDEX IF NOT EXISTS idx_messages_model_key ON messages(model_key);
        
        -- Add a comment to describe the column
        COMMENT ON COLUMN messages.model_key IS 'The model key used to generate this message (e.g., speed, quality, micro)';
    END IF;
END
$$;

-- Verify the setup
SELECT 'model_key column added successfully!' as status;
