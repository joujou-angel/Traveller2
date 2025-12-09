-- Enable RLS on tables
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 1. Policies for 'trips' table
-- ==========================================

-- Policy: Owners can do everything
DROP POLICY IF EXISTS "Owners can do everything" ON trips;
CREATE POLICY "Owners can do everything" 
ON trips 
FOR ALL 
USING (auth.uid() = user_id);

-- Policy: Members can view trips
DROP POLICY IF EXISTS "Members can view trips" ON trips;
CREATE POLICY "Members can view trips" 
ON trips 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM trip_members 
    WHERE trip_members.trip_id = trips.id 
    AND trip_members.user_id = auth.uid()
  )
);

-- ==========================================
-- 2. Policies for 'trip_members' table
-- ==========================================

-- Fix: Infinite recursion happens because the policy queries the table itself while checking permissions.
-- Solution: Create a "Security Definer" function that bypasses RLS to check membership.

CREATE OR REPLACE FUNCTION is_member_of_trip(_trip_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM trip_members 
    WHERE trip_id = _trip_id 
    AND user_id = auth.uid()
  );
$$;

-- Policy: Users can view members of trips they belong to
DROP POLICY IF EXISTS "Users can view members of their trips" ON trip_members;
CREATE POLICY "Users can view members of their trips" 
ON trip_members 
FOR SELECT 
USING (
  -- User can see themselves
  user_id = auth.uid() 
  OR 
  -- OR user can see others if they are in the same trip (checked via secure function)
  is_member_of_trip(trip_id)
);

-- Policy: Users can join trips (insert themselves)
DROP POLICY IF EXISTS "Users can join trips" ON trip_members;
CREATE POLICY "Users can join trips" 
ON trip_members 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
);
