
-- Add lead_id to artist_work_events to link with leads
ALTER TABLE artist_work_events 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_artist_work_events_lead_id ON artist_work_events(lead_id);
