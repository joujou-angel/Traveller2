-- Add duration column to itineraries table
ALTER TABLE itineraries 
ADD COLUMN duration INTEGER DEFAULT 60; -- Default duration 60 minutes

COMMENT ON COLUMN itineraries.duration IS 'Stay duration in minutes';
