-- Migration to add customizable fact types per project
-- This would be added to your Supabase migrations

CREATE TABLE IF NOT EXISTS project_fact_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type_key VARCHAR(50) NOT NULL, -- Internal identifier (person, place, etc.)
    display_name VARCHAR(100) NOT NULL, -- User-customizable display name
    color_class VARCHAR(100) DEFAULT 'bg-gray-100 text-gray-700', -- Tailwind color classes
    sort_order INTEGER DEFAULT 0, -- For ordering in dropdowns
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(project_id, type_key)
);

-- Create default fact types for existing projects
INSERT INTO project_fact_types (project_id, type_key, display_name, color_class, sort_order)
SELECT 
    p.id as project_id,
    'person' as type_key,
    'person' as display_name,
    'bg-blue-100 text-blue-700' as color_class,
    1 as sort_order
FROM projects p
WHERE NOT EXISTS (
    SELECT 1 FROM project_fact_types pft WHERE pft.project_id = p.id
);

-- Add the other default types for all projects
INSERT INTO project_fact_types (project_id, type_key, display_name, color_class, sort_order)
SELECT p.id, 'place', 'place', 'bg-green-100 text-green-700', 2 FROM projects p;

INSERT INTO project_fact_types (project_id, type_key, display_name, color_class, sort_order)
SELECT p.id, 'process', 'process', 'bg-purple-100 text-purple-700', 3 FROM projects p;

INSERT INTO project_fact_types (project_id, type_key, display_name, color_class, sort_order)
SELECT p.id, 'term', 'term', 'bg-orange-100 text-orange-700', 4 FROM projects p;

INSERT INTO project_fact_types (project_id, type_key, display_name, color_class, sort_order)
SELECT p.id, 'thing', 'thing', 'bg-red-100 text-red-700', 5 FROM projects p;

-- RLS policies
ALTER TABLE project_fact_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fact types for their projects" ON project_fact_types
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can modify fact types for their projects" ON project_fact_types
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );
