-- Feedback System Migration
-- This creates tables for tracking user feedback on AI messages and Mr Wiskr

-- Table for individual message feedback (thumbs up/down on specific AI responses)
CREATE TABLE IF NOT EXISTS message_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating IN (-1, 1)), -- -1 for thumbs down, 1 for thumbs up
  comment TEXT, -- Optional user comment
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one feedback per user per message
  UNIQUE(user_id, message_id)
);

-- Table for overall Mr Wiskr feedback (general satisfaction with the AI helper over time)
CREATE TABLE IF NOT EXISTS mr_wiskr_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- Can be null for general feedback
  rating INTEGER NOT NULL CHECK (rating IN (-1, 1)), -- -1 for thumbs down, 1 for thumbs up
  comment TEXT, -- Optional user comment about Mr Wiskr's helpfulness
  context TEXT, -- What was Mr Wiskr helping with when rated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_feedback_user_id ON message_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_message_id ON message_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_project_id ON message_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_rating ON message_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_message_feedback_created_at ON message_feedback(created_at);

CREATE INDEX IF NOT EXISTS idx_mr_wiskr_feedback_user_id ON mr_wiskr_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_mr_wiskr_feedback_project_id ON mr_wiskr_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_mr_wiskr_feedback_rating ON mr_wiskr_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_mr_wiskr_feedback_created_at ON mr_wiskr_feedback(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE mr_wiskr_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_feedback
CREATE POLICY "Users can view their own message feedback" ON message_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own message feedback" ON message_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own message feedback" ON message_feedback
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own message feedback" ON message_feedback
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for mr_wiskr_feedback
CREATE POLICY "Users can view their own Mr Wiskr feedback" ON mr_wiskr_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Mr Wiskr feedback" ON mr_wiskr_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Mr Wiskr feedback" ON mr_wiskr_feedback
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Mr Wiskr feedback" ON mr_wiskr_feedback
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_message_feedback_updated_at
  BEFORE UPDATE ON message_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mr_wiskr_feedback_updated_at
  BEFORE UPDATE ON mr_wiskr_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
