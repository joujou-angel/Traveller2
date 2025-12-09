-- Enable anonymous access for the expenses table
-- Run this in your Supabase SQL Editor

-- 1. Drop existing policies if they conflict (optional, but safer)
drop policy if exists "Authenticated Write Access expenses" on public.expenses;
drop policy if exists "Enable insert for anon" on public.expenses;
drop policy if exists "Enable update for anon" on public.expenses;
drop policy if exists "Enable delete for anon" on public.expenses;

-- 2. Allow Anonymous Insert
create policy "Enable insert for anon"
on public.expenses for insert
with check (true);

-- 3. Allow Anonymous Update
create policy "Enable update for anon"
on public.expenses for update
using (true);

-- 4. Allow Anonymous Delete
create policy "Enable delete for anon"
on public.expenses for delete
using (true);

-- 5. Ensure Select is open (already should be, but just in case)
drop policy if exists "Public Read Access expenses" on public.expenses;
create policy "Public Read Access expenses"
on public.expenses for select
using (true);
