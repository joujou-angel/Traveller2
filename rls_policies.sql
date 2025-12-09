-- Enable RLS on tables
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_config ENABLE ROW LEVEL SECURITY;

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

-- Policy: Users can leave trips (delete themselves)
DROP POLICY IF EXISTS "Users can leave trips" ON trip_members;
CREATE POLICY "Users can leave trips" 
ON trip_members 
FOR DELETE 
USING (
  auth.uid() = user_id
);

-- ==========================================
-- 3. Policies for 'trip_config' table
-- ==========================================
-- Logic: 
-- Read: Owners and Members
-- Write: Owners ONLY

-- Policy: Owners can do everything
DROP POLICY IF EXISTS "Owners can manage trip_config" ON trip_config;
CREATE POLICY "Owners can manage trip_config" 
ON trip_config 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = trip_config.trip_id 
    AND trips.user_id = auth.uid()
  )
);

-- Policy: Members can view trip_config
DROP POLICY IF EXISTS "Members can view trip_config" ON trip_config;
CREATE POLICY "Members can view trip_config" 
ON trip_config 
FOR SELECT
USING (
  is_member_of_trip(trip_id)
);

-- ==========================================
-- 4. Policies for 'itineraries' table
-- ==========================================
-- Logic:
-- Read: Owners and Members
-- Write: Owners ONLY

-- Policy: Owners can do everything
DROP POLICY IF EXISTS "Owners can manage itineraries" ON itineraries;
CREATE POLICY "Owners can manage itineraries" 
ON itineraries 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = itineraries.trip_id 
    AND trips.user_id = auth.uid()
  )
);

-- Policy: Members can view itineraries
DROP POLICY IF EXISTS "Members can view itineraries" ON itineraries;
CREATE POLICY "Members can view itineraries" 
ON itineraries 
FOR SELECT
USING (
  is_member_of_trip(trip_id)
);

-- ==========================================
-- 5. Policies for 'expenses' table
-- ==========================================
-- Logic:
-- Read: Owners and Members
-- Write: Owners and Members (Collaborative)

-- Policy: Owners can do everything
DROP POLICY IF EXISTS "Owners can manage expenses" ON expenses;
CREATE POLICY "Owners can manage expenses" 
ON expenses 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = expenses.trip_id 
    AND trips.user_id = auth.uid()
  )
);

-- Policy: Members can view and manage expenses
DROP POLICY IF EXISTS "Members can manage expenses" ON expenses;
CREATE POLICY "Members can manage expenses" 
ON expenses 
FOR ALL
USING (
  is_member_of_trip(trip_id)
);
