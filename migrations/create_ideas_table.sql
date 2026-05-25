-- Create Ideas Table Migration
-- Creates table for storing AI-generated related ideas for projects

-- Ideas table - stores AI-generated related ideas for projects
CREATE TABLE IF NOT EXISTS ideas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Idea content
    title VARCHAR(500) NOT NULL,
    description TEXT,
    text TEXT NOT NULL, -- Main content of the idea
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(project_id, text) -- Prevent duplicate ideas within a project
);

-- Indexes for performance
CREATE INDEX idx_ideas_project_id ON ideas(project_id);
CREATE INDEX idx_ideas_user_id ON ideas(user_id);
CREATE INDEX idx_ideas_created_at ON ideas(created_at);
CREATE INDEX idx_ideas_title ON ideas(title);
CREATE INDEX idx_ideas_text ON ideas USING gin(to_tsvector('english', text));

-- RLS (Row Level Security) policies
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Users can only access ideas for their projects
CREATE POLICY "Users can view ideas for their projects" ON ideas
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert ideas for their projects" ON ideas
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        ) AND user_id = auth.uid()
    );

CREATE POLICY "Users can update ideas for their projects" ON ideas
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        ) AND user_id = auth.uid()
    );

CREATE POLICY "Users can delete ideas for their projects" ON ideas
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        ) AND user_id = auth.uid()
    );

-- Function to update idea timestamps
CREATE OR REPLACE FUNCTION update_idea_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamps
CREATE TRIGGER trigger_update_idea_updated_at
    BEFORE UPDATE ON ideas
    FOR EACH ROW
    EXECUTE FUNCTION update_idea_updated_at();
