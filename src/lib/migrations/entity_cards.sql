-- Entity Cards Migration
-- Creates system for automatically generating cached summaries of entities (characters, places, events)

-- Entity Cards table - stores AI-generated summaries of entities
CREATE TABLE IF NOT EXISTS entity_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Entity identification
    entity_name VARCHAR(200) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- character, place, event, organization, concept, etc.
    
    -- AI-generated summary
    summary TEXT NOT NULL,
    summary_tokens INTEGER DEFAULT 0,
    
    -- Metadata
    fact_count INTEGER DEFAULT 0, -- number of facts that contributed to this card
    confidence_score FLOAT DEFAULT 0.0, -- AI confidence in entity detection (0-1)
    
    -- Vector embedding for the summary (for similarity search)
    embedding VECTOR(1536),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_facts_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(project_id, entity_name, entity_type)
);

-- Junction table linking entity cards to the facts that created them
CREATE TABLE IF NOT EXISTS entity_card_facts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_card_id UUID NOT NULL REFERENCES entity_cards(id) ON DELETE CASCADE,
    fact_id UUID NOT NULL REFERENCES facts(id) ON DELETE CASCADE,
    
    -- Relevance score (how relevant this fact is to the entity)
    relevance_score FLOAT DEFAULT 1.0,
    
    -- When this relationship was detected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate relationships
    UNIQUE(entity_card_id, fact_id)
);

-- Entity relationships table (optional - for future features)
CREATE TABLE IF NOT EXISTS entity_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    from_entity_id UUID NOT NULL REFERENCES entity_cards(id) ON DELETE CASCADE,
    to_entity_id UUID NOT NULL REFERENCES entity_cards(id) ON DELETE CASCADE,
    
    relationship_type VARCHAR(100) NOT NULL, -- "knows", "located_in", "part_of", "caused_by", etc.
    relationship_description TEXT,
    confidence_score FLOAT DEFAULT 0.0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate relationships
    UNIQUE(from_entity_id, to_entity_id, relationship_type)
);

-- Indexes for performance
CREATE INDEX idx_entity_cards_project_id ON entity_cards(project_id);
CREATE INDEX idx_entity_cards_type ON entity_cards(entity_type);
CREATE INDEX idx_entity_cards_name ON entity_cards(entity_name);
CREATE INDEX idx_entity_cards_updated_at ON entity_cards(updated_at);

CREATE INDEX idx_entity_card_facts_card_id ON entity_card_facts(entity_card_id);
CREATE INDEX idx_entity_card_facts_fact_id ON entity_card_facts(fact_id);

CREATE INDEX idx_entity_relationships_from_entity ON entity_relationships(from_entity_id);
CREATE INDEX idx_entity_relationships_to_entity ON entity_relationships(to_entity_id);
CREATE INDEX idx_entity_relationships_project_id ON entity_relationships(project_id);

-- RLS (Row Level Security) policies
ALTER TABLE entity_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_card_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relationships ENABLE ROW LEVEL SECURITY;

-- Users can only access entity cards for their projects
CREATE POLICY "Users can view entity cards for their projects" ON entity_cards
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can modify entity cards for their projects" ON entity_cards
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

-- Users can only access entity-fact relationships for their projects
CREATE POLICY "Users can view entity card facts for their projects" ON entity_card_facts
    FOR SELECT USING (
        entity_card_id IN (
            SELECT id FROM entity_cards WHERE project_id IN (
                SELECT id FROM projects WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can modify entity card facts for their projects" ON entity_card_facts
    FOR ALL USING (
        entity_card_id IN (
            SELECT id FROM entity_cards WHERE project_id IN (
                SELECT id FROM projects WHERE user_id = auth.uid()
            )
        )
    );

-- Users can only access entity relationships for their projects
CREATE POLICY "Users can view entity relationships for their projects" ON entity_relationships
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can modify entity relationships for their projects" ON entity_relationships
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

-- Function to update entity card timestamps
CREATE OR REPLACE FUNCTION update_entity_card_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamps
CREATE TRIGGER trigger_update_entity_card_updated_at
    BEFORE UPDATE ON entity_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_card_updated_at();
