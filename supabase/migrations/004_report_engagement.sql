-- Report Engagement: Highlights and Comments for Synthesis Reports

-- Highlights table for text selections and annotations
CREATE TABLE report_highlights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL, -- Links to synthesis reports (stored in ai_processing_jobs for now)
    user_id UUID NOT NULL,
    content_section VARCHAR(50) NOT NULL, -- 'overview', 'keyThemes', 'insights', 'patterns', 'recommendations', 'furtherResearch'
    start_offset INT NOT NULL, -- Character position start in the section
    end_offset INT NOT NULL, -- Character position end in the section
    highlighted_text TEXT NOT NULL, -- The actual text that was highlighted
    highlight_color VARCHAR(20) DEFAULT 'yellow', -- 'yellow', 'green', 'blue', 'red', 'purple'
    note TEXT, -- Optional note attached to the highlight
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Comments table for user annotations and discussions
CREATE TABLE report_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL, -- Links to synthesis reports
    user_id UUID NOT NULL,
    parent_comment_id UUID REFERENCES report_comments(id) ON DELETE CASCADE, -- For threading
    highlight_id UUID REFERENCES report_highlights(id) ON DELETE CASCADE, -- Optional: comment on specific highlight
    content_section VARCHAR(50), -- Which section the comment relates to (if not on a highlight)
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(20) DEFAULT 'general', -- 'general', 'question', 'insight', 'action', 'important'
    is_resolved BOOLEAN DEFAULT FALSE, -- For tracking action items or questions
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_report_highlights_report_id ON report_highlights(report_id);
CREATE INDEX idx_report_highlights_user_id ON report_highlights(user_id);
CREATE INDEX idx_report_highlights_section ON report_highlights(content_section);
CREATE INDEX idx_report_comments_report_id ON report_comments(report_id);
CREATE INDEX idx_report_comments_user_id ON report_comments(user_id);
CREATE INDEX idx_report_comments_parent ON report_comments(parent_comment_id);
CREATE INDEX idx_report_comments_highlight ON report_comments(highlight_id);

-- Row Level Security
ALTER TABLE report_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Users own report_highlights" ON report_highlights
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users own report_comments" ON report_comments
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Allow anonymous access for development (TODO: Remove when auth is implemented)
CREATE POLICY "Allow anonymous report_highlights access" ON report_highlights
    FOR ALL TO anon
    USING (true);

CREATE POLICY "Allow anonymous report_comments access" ON report_comments
    FOR ALL TO anon
    USING (true);