-- Add description column to projects table
-- This column will store the project description that helps the AI understand project goals and context

ALTER TABLE projects ADD COLUMN description TEXT;

-- Add a comment explaining the column purpose
COMMENT ON COLUMN projects.description IS 'Project description that defines goals and objectives for better AI assistance';
