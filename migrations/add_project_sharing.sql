-- Add sharing functionality to projects table
ALTER TABLE projects 
ADD COLUMN share_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN share_password TEXT DEFAULT NULL,
ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Create unique index on share_id for fast lookups
CREATE UNIQUE INDEX idx_projects_share_id ON projects(share_id);

-- Create index for public projects lookups
CREATE INDEX idx_projects_is_public ON projects(is_public) WHERE is_public = true;

-- Update existing projects to have share_id values
UPDATE projects SET share_id = gen_random_uuid() WHERE share_id IS NULL;

-- Make share_id not null after populating existing records
ALTER TABLE projects ALTER COLUMN share_id SET NOT NULL;
