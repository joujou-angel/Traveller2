-- Add coordinates to itineraries table
ALTER TABLE itineraries 
ADD COLUMN lat double precision,
ADD COLUMN lng double precision;

-- Optional: Add a check constraint to ensure valid coordinates if needed
-- ALTER TABLE itineraries ADD CONSTRAINT valid_lat CHECK (lat >= -90 AND lat <= 90);
-- ALTER TABLE itineraries ADD CONSTRAINT valid_lng CHECK (lng >= -180 AND lng <= 180);
