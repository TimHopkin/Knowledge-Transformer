-- Enhanced error tracking and granular status updates
-- Migration: 002_enhanced_error_tracking.sql

-- Add new status enum types
DO $$ BEGIN
    CREATE TYPE processing_step AS ENUM (
        'pending',
        'fetching_metadata', 
        'extracting_transcript',
        'ai_processing',
        'saving_data',
        'completed',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add granular status tracking to content_items
ALTER TABLE content_items 
ADD COLUMN IF NOT EXISTS current_step processing_step DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS step_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS error_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS can_retry BOOLEAN DEFAULT TRUE;

-- Update existing processing_status to use new enum where possible
UPDATE content_items 
SET current_step = CASE 
    WHEN processing_status = 'pending' THEN 'pending'::processing_step
    WHEN processing_status = 'completed' THEN 'completed'::processing_step  
    WHEN processing_status = 'failed' THEN 'failed'::processing_step
    ELSE 'pending'::processing_step
END;

-- Add error tracking to AI processing jobs  
ALTER TABLE ai_processing_jobs
ADD COLUMN IF NOT EXISTS error_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS error_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS can_retry BOOLEAN DEFAULT TRUE;

-- Create function to update processing step with details
CREATE OR REPLACE FUNCTION update_processing_step(
    content_item_id UUID,
    new_step processing_step,
    details JSONB DEFAULT '{}',
    error_info JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
    UPDATE content_items 
    SET 
        current_step = new_step,
        step_details = details,
        error_details = CASE 
            WHEN new_step = 'failed' THEN error_info
            ELSE error_details
        END,
        updated_at = NOW()
    WHERE id = content_item_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment retry count
CREATE OR REPLACE FUNCTION increment_retry_count(
    content_item_id UUID,
    max_retries INTEGER DEFAULT 3
) RETURNS BOOLEAN AS $$
DECLARE
    current_retries INTEGER;
BEGIN
    UPDATE content_items 
    SET 
        retry_count = retry_count + 1,
        last_retry_at = NOW(),
        can_retry = (retry_count + 1) < max_retries,
        current_step = 'pending'
    WHERE id = content_item_id
    RETURNING retry_count INTO current_retries;
    
    RETURN current_retries < max_retries;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_content_items_current_step ON content_items(current_step);
CREATE INDEX IF NOT EXISTS idx_content_items_can_retry ON content_items(can_retry);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_error_code ON ai_processing_jobs(error_code);

-- Create view for processing status summary
CREATE OR REPLACE VIEW processing_status_summary AS
SELECT 
    current_step,
    COUNT(*) as count,
    AVG(retry_count) as avg_retries
FROM content_items 
GROUP BY current_step;