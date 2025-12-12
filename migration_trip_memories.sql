-- Create trip_memories table
create table if not exists public.trip_memories (
  id uuid default gen_random_uuid() primary key,
  trip_item_id bigint references public.itineraries(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text check (char_length(content) <= 500),
  mood_emoji text,
  external_link text,
  is_private boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.trip_memories enable row level security;

-- Policy: Users can only see their own memories
create policy "Users can view their own memories"
  on public.trip_memories for select
  using (auth.uid() = user_id);

-- Policy: Users can insert their own memories
create policy "Users can insert their own memories"
  on public.trip_memories for insert
  with check (auth.uid() = user_id);

-- Policy: Users can update their own memories
create policy "Users can update their own memories"
  on public.trip_memories for update
  using (auth.uid() = user_id);

-- Policy: Users can delete their own memories
create policy "Users can delete their own memories"
  on public.trip_memories for delete
  using (auth.uid() = user_id);
