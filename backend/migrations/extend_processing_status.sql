-- Extend processing_status column from VARCHAR(20) to VARCHAR(30)
-- This is needed because 'generating_similar_questions' is 25 characters

ALTER TABLE exam_uploads 
ALTER COLUMN processing_status TYPE VARCHAR(30);

-- Update any existing data if needed (should be safe as we're only extending) 