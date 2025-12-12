-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  subscription_status text default 'free', -- 'free', 'pro'
  lifetime_trip_count int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Users can view own profile"
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Auto-create profile on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Add columns to trips table
alter table public.trips 
add column if not exists status text default 'active', -- 'active', 'archived'
add column if not exists is_unlocked boolean default false;

comment on column public.trips.status is 'Status: active or archived (for free usage limits)';
comment on column public.trips.is_unlocked is 'True if this trip has been paid for (Trip Pass)';
