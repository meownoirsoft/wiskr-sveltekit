-- Add completed status to project_questions table
ALTER TABLE project_questions 
ADD COLUMN completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for faster completion queries
CREATE INDEX idx_project_questions_completed ON project_questions(project_id, completed);

-- Update the updated_at trigger to fire when completed status changes
-- (The existing trigger will already handle this, but making it explicit)
