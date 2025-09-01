-- Create table for storing project-specific good questions
CREATE TABLE project_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_project_questions_project_id ON project_questions(project_id);
CREATE INDEX idx_project_questions_sort_order ON project_questions(project_id, sort_order);

-- Enable Row Level Security
ALTER TABLE project_questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy so users can only see questions for their own projects
CREATE POLICY "Users can view questions for their own projects" ON project_questions
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Create RLS policy for insert
CREATE POLICY "Users can create questions for their own projects" ON project_questions
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Create RLS policy for update
CREATE POLICY "Users can update questions for their own projects" ON project_questions
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Create RLS policy for delete
CREATE POLICY "Users can delete questions for their own projects" ON project_questions
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Create trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_questions_updated_at 
  BEFORE UPDATE ON project_questions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
