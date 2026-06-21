-- ============================================
-- MSP Help Desk — Add Response ID to Attachments
-- ============================================

-- Add response_id column to ticket_attachments
ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS response_id UUID REFERENCES ticket_responses(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_attachments_response ON ticket_attachments(response_id);
