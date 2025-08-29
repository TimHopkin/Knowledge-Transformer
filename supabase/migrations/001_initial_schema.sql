-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Content sources (YouTube channels, playlists)
CREATE TABLE content_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'youtube_channel', 'youtube_playlist'
    source_url TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    processing_config JSONB DEFAULT '{}',
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'error'
    sync_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual videos, episodes, articles
CREATE TABLE content_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES content_sources(id),
    user_id UUID NOT NULL,
    external_id VARCHAR(255), -- YouTube video ID, etc.
    title TEXT NOT NULL,
    description TEXT,
    duration_seconds INTEGER,
    published_at TIMESTAMP,
    raw_metadata JSONB DEFAULT '{}',
    processing_status VARCHAR(50) DEFAULT 'pending',
    processing_error TEXT,
    content_hash VARCHAR(64), -- For change detection
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_id, external_id)
);

-- Transcripts and processed text
CREATE TABLE content_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    transcript_type VARCHAR(50), -- 'auto', 'enhanced', 'manual'
    raw_text TEXT NOT NULL,
    processed_text TEXT,
    segments JSONB DEFAULT '[]', -- Timestamped segments
    processing_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI-generated summaries from content
CREATE TABLE generated_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    key_points TEXT[] DEFAULT '{}',
    ai_model VARCHAR(100),
    generation_metadata JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1,
    is_current_version BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Topic clusters identified across content
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_topic_id UUID REFERENCES topics(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Job tracking for AI processing and cost management
CREATE TABLE ai_processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    input_data JSONB NOT NULL,
    ai_model VARCHAR(100),
    tokens_input INTEGER,
    tokens_output INTEGER,
    cost_estimate DECIMAL(10,4),
    processing_time_seconds INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Many-to-many relationship between topics and content
CREATE TABLE content_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    relevance_score DECIMAL(3,2), -- 0.0 to 1.0
    extraction_method VARCHAR(50), -- 'ai', 'manual', 'keyword'
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(content_item_id, topic_id)
);

-- Create indexes for better performance
CREATE INDEX idx_content_sources_user_id ON content_sources(user_id);
CREATE INDEX idx_content_items_user_id ON content_items(user_id);
CREATE INDEX idx_content_items_source_id ON content_items(source_id);
CREATE INDEX idx_content_items_processing_status ON content_items(processing_status);
CREATE INDEX idx_content_transcripts_content_item_id ON content_transcripts(content_item_id);
CREATE INDEX idx_generated_summaries_content_item_id ON generated_summaries(content_item_id);
CREATE INDEX idx_generated_summaries_user_id ON generated_summaries(user_id);
CREATE INDEX idx_topics_user_id ON topics(user_id);
CREATE INDEX idx_topics_parent_topic_id ON topics(parent_topic_id);
CREATE INDEX idx_ai_processing_jobs_user_id ON ai_processing_jobs(user_id);
CREATE INDEX idx_ai_processing_jobs_status ON ai_processing_jobs(status);
CREATE INDEX idx_content_topics_content_item_id ON content_topics(content_item_id);
CREATE INDEX idx_content_topics_topic_id ON content_topics(topic_id);

-- Enable Row Level Security (RLS)
ALTER TABLE content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_topics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only access their own data)
CREATE POLICY "Users own content_sources" ON content_sources
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own content_items" ON content_items
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own content_transcripts" ON content_transcripts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own generated_summaries" ON generated_summaries
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own topics" ON topics
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own ai_processing_jobs" ON ai_processing_jobs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own content_topics" ON content_topics
    FOR ALL USING (auth.uid() = user_id);

-- Create functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_content_sources_updated_at 
    BEFORE UPDATE ON content_sources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_items_updated_at 
    BEFORE UPDATE ON content_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at 
    BEFORE UPDATE ON topics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();