-- Enable the pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- RPC function to match facts by vector similarity
CREATE OR REPLACE FUNCTION match_facts(
  p_project_id UUID,
  p_query VECTOR(1536),
  p_limit INT DEFAULT 8
)
RETURNS TABLE(
  id UUID,
  type TEXT,
  key TEXT,
  value TEXT,
  tags TEXT[],
  pinned BOOLEAN,
  similarity FLOAT
)
LANGUAGE SQL
AS $$
  SELECT 
    f.id,
    f.type,
    f.key,
    f.value,
    f.tags,
    f.pinned,
    1 - (f.embedding <=> p_query) AS similarity
  FROM facts f
  WHERE f.project_id = p_project_id
    AND f.embedding IS NOT NULL
    AND NOT f.pinned  -- exclude pinned facts as they're already included separately
  ORDER BY f.embedding <=> p_query
  LIMIT p_limit;
$$;

-- RPC function to match docs by vector similarity
CREATE OR REPLACE FUNCTION match_docs(
  p_project_id UUID,
  p_query VECTOR(1536),
  p_limit INT DEFAULT 4
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  content TEXT,
  tags TEXT[],
  pinned BOOLEAN,
  similarity FLOAT
)
LANGUAGE SQL
AS $$
  SELECT 
    d.id,
    d.title,
    d.content,
    d.tags,
    d.pinned,
    1 - (d.embedding <=> p_query) AS similarity
  FROM docs d
  WHERE d.project_id = p_project_id
    AND d.embedding IS NOT NULL
    AND NOT d.pinned  -- exclude pinned docs as they're already included separately
  ORDER BY d.embedding <=> p_query
  LIMIT p_limit;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION match_facts TO authenticated;
GRANT EXECUTE ON FUNCTION match_docs TO authenticated;
