-- Function to search facts by partial tag matches
CREATE OR REPLACE FUNCTION search_facts_by_tags(
  p_project_id UUID,
  p_query TEXT
)
RETURNS TABLE(
  id UUID,
  project_id UUID,
  type TEXT,
  key TEXT,
  value TEXT,
  tags TEXT[],
  pinned BOOLEAN,
  created_at TIMESTAMPTZ,
  embedding VECTOR(1536)
)
LANGUAGE SQL
AS $$
  SELECT 
    f.id,
    f.project_id,
    f.type,
    f.key,
    f.value,
    f.tags,
    f.pinned,
    f.created_at,
    f.embedding
  FROM facts f
  WHERE f.project_id = p_project_id
    AND array_to_string(f.tags, ' ') ILIKE '%' || p_query || '%'
  ORDER BY f.created_at DESC;
$$;

-- Function to search docs by partial tag matches  
CREATE OR REPLACE FUNCTION search_docs_by_tags(
  p_project_id UUID,
  p_query TEXT
)
RETURNS TABLE(
  id UUID,
  project_id UUID,
  title TEXT,
  content TEXT,
  tags TEXT[],
  pinned BOOLEAN,
  created_at TIMESTAMPTZ,
  embedding VECTOR(1536)
)
LANGUAGE SQL
AS $$
  SELECT 
    d.id,
    d.project_id,
    d.title,
    d.content,
    d.tags,
    d.pinned,
    d.created_at,
    d.embedding
  FROM docs d
  WHERE d.project_id = p_project_id
    AND array_to_string(d.tags, ' ') ILIKE '%' || p_query || '%'
  ORDER BY d.created_at DESC;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION search_facts_by_tags TO authenticated;
GRANT EXECUTE ON FUNCTION search_docs_by_tags TO authenticated;
