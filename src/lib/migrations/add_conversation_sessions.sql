-- Migration: Add conversation sessions
-- This creates a session-based conversation system with branches per session

-- Create conversation_sessions table
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  topic_summary TEXT, -- AI-generated summary of main topics
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update conversation_branches to reference sessions instead of projects directly
-- We'll keep project_id for easier querying, but add session_id as the primary relationship
ALTER TABLE conversation_branches 
ADD COLUMN session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE;

-- Update messages table to include session_id for faster queries
ALTER TABLE messages 
ADD COLUMN session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_project_date ON conversation_sessions(project_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON conversation_sessions(project_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_messages_session_branch ON messages(session_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_branches_session ON conversation_branches(session_id);

-- Update the unique constraint on conversation_branches to be per-session instead of per-project
ALTER TABLE conversation_branches DROP CONSTRAINT IF EXISTS conversation_branches_project_id_branch_id_key;
ALTER TABLE conversation_branches ADD CONSTRAINT conversation_branches_session_branch_unique UNIQUE(session_id, branch_id);

-- Create default sessions for existing projects
-- This will create a "Main Session" for each project and move existing data there
DO $$
DECLARE
    project_record RECORD;
    new_session_id UUID;
BEGIN
    -- For each project, create a default session
    FOR project_record IN SELECT id, name, created_at FROM projects LOOP
        -- Insert default session
        INSERT INTO conversation_sessions (
            project_id, 
            session_name, 
            session_date, 
            is_active, 
            topic_summary,
            created_at,
            updated_at
        ) 
        VALUES (
            project_record.id,
            'Main Session',
            CURRENT_DATE,
            TRUE,
            'Initial conversation session',
            project_record.created_at,
            NOW()
        ) 
        RETURNING id INTO new_session_id;
        
        -- Update existing messages to reference this session
        UPDATE messages 
        SET session_id = new_session_id 
        WHERE project_id = project_record.id AND session_id IS NULL;
        
        -- Update existing branches to reference this session
        UPDATE conversation_branches 
        SET session_id = new_session_id 
        WHERE project_id = project_record.id AND session_id IS NULL;
        
        -- Update message count for the session
        UPDATE conversation_sessions 
        SET message_count = (
            SELECT COUNT(*) FROM messages WHERE session_id = new_session_id
        )
        WHERE id = new_session_id;
    END LOOP;
END
$$;

-- Create a function to update session timestamps and message counts
CREATE OR REPLACE FUNCTION update_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update session message count and timestamp
        UPDATE conversation_sessions 
        SET 
            message_count = message_count + 1,
            updated_at = NOW()
        WHERE id = NEW.session_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update session message count
        UPDATE conversation_sessions 
        SET 
            message_count = message_count - 1,
            updated_at = NOW()
        WHERE id = OLD.session_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update session stats
DROP TRIGGER IF EXISTS trigger_update_session_stats ON messages;
CREATE TRIGGER trigger_update_session_stats
    AFTER INSERT OR DELETE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_session_stats();

-- Add RLS policies for conversation_sessions
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversation sessions" ON conversation_sessions
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create conversation sessions in their projects" ON conversation_sessions
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own conversation sessions" ON conversation_sessions
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own conversation sessions" ON conversation_sessions
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

SELECT 'Conversation sessions migration completed successfully!' as status;
