-- ActivitaHub Phase 1 Migration
-- Run this in your Supabase SQL Editor

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('guest', 'student', 'organizer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type onboarding_status as enum (
    'not_started', 'profile_created', 'first_activity_added', 'venue_added', 'completed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type organizer_status as enum ('draft', 'published', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type location_type as enum ('indoor', 'outdoor', 'both');
exception when duplicate_object then null; end $$;

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id                uuid        primary key references auth.users(id) on delete cascade,
  full_name         text,
  email             text,
  avatar_url        text,
  role              user_role   not null default 'student',
  onboarding_status onboarding_status not null default 'not_started',
  preferred_locale  text        not null default 'en',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Auto-create profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email      = excluded.email,
    full_name  = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

-- RLS for profiles
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Admins can view all profiles"
  on profiles for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Service role can insert profiles"
  on profiles for insert with check (true);

-- ─── Organizer Profiles ───────────────────────────────────────────────────────
create table if not exists organizer_profiles (
  id           uuid             primary key default uuid_generate_v4(),
  user_id      uuid             not null references profiles(id) on delete cascade,
  display_name text,
  bio          text,
  city         text,
  country      text,
  languages    text[],
  phone        text,
  website      text,
  status       organizer_status not null default 'draft',
  created_at   timestamptz      not null default now(),
  updated_at   timestamptz      not null default now(),
  unique (user_id)
);

create trigger organizer_profiles_updated_at before update on organizer_profiles
  for each row execute function update_updated_at();

alter table organizer_profiles enable row level security;

create policy "Users can view own organizer profile"
  on organizer_profiles for select using (auth.uid() = user_id);

create policy "Users can insert own organizer profile"
  on organizer_profiles for insert with check (auth.uid() = user_id);

create policy "Users can update own organizer profile"
  on organizer_profiles for update using (auth.uid() = user_id);

create policy "Users can delete own organizer profile"
  on organizer_profiles for delete using (auth.uid() = user_id);

create policy "Admins can view all organizer profiles"
  on organizer_profiles for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ─── Activities ──────────────────────────────────────────────────────────────
create table if not exists activities (
  id           uuid            primary key default uuid_generate_v4(),
  organizer_id uuid            not null references profiles(id) on delete cascade,
  title        text            not null,
  description  text,
  status       activity_status not null default 'draft',
  created_at   timestamptz     not null default now(),
  updated_at   timestamptz     not null default now()
);

create index if not exists activities_organizer_id_idx on activities(organizer_id);
create index if not exists activities_status_idx on activities(status);

create trigger activities_updated_at before update on activities
  for each row execute function update_updated_at();

alter table activities enable row level security;

create policy "Organizers can view own activities"
  on activities for select using (auth.uid() = organizer_id);

create policy "Organizers can create activities"
  on activities for insert with check (auth.uid() = organizer_id);

create policy "Organizers can update own activities"
  on activities for update using (auth.uid() = organizer_id);

create policy "Organizers can delete own activities"
  on activities for delete using (auth.uid() = organizer_id);

create policy "Admins can manage all activities"
  on activities for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ─── Venues ──────────────────────────────────────────────────────────────────
create table if not exists venues (
  id             uuid          primary key default uuid_generate_v4(),
  organizer_id   uuid          not null references profiles(id) on delete cascade,
  name           text          not null,
  address        text,
  city           text,
  country        text,
  capacity       integer,
  indoor_outdoor location_type,
  notes          text,
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now()
);

create index if not exists venues_organizer_id_idx on venues(organizer_id);

create trigger venues_updated_at before update on venues
  for each row execute function update_updated_at();

alter table venues enable row level security;

create policy "Organizers can view own venues"
  on venues for select using (auth.uid() = organizer_id);

create policy "Organizers can create venues"
  on venues for insert with check (auth.uid() = organizer_id);

create policy "Organizers can update own venues"
  on venues for update using (auth.uid() = organizer_id);

create policy "Organizers can delete own venues"
  on venues for delete using (auth.uid() = organizer_id);

create policy "Admins can manage all venues"
  on venues for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ─── Clients ─────────────────────────────────────────────────────────────────
create table if not exists clients (
  id           uuid        primary key default uuid_generate_v4(),
  organizer_id uuid        not null references profiles(id) on delete cascade,
  full_name    text        not null,
  email        text,
  phone        text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists clients_organizer_id_idx on clients(organizer_id);

create trigger clients_updated_at before update on clients
  for each row execute function update_updated_at();

alter table clients enable row level security;

create policy "Organizers can view own clients"
  on clients for select using (auth.uid() = organizer_id);

create policy "Organizers can create clients"
  on clients for insert with check (auth.uid() = organizer_id);

create policy "Organizers can update own clients"
  on clients for update using (auth.uid() = organizer_id);

create policy "Organizers can delete own clients"
  on clients for delete using (auth.uid() = organizer_id);

create policy "Admins can manage all clients"
  on clients for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ─── Calendar Events ──────────────────────────────────────────────────────────
create table if not exists calendar_events (
  id           uuid        primary key default uuid_generate_v4(),
  organizer_id uuid        not null references profiles(id) on delete cascade,
  title        text        not null,
  date         date        not null,
  start_time   time,
  end_time     time,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists calendar_events_organizer_id_idx on calendar_events(organizer_id);
create index if not exists calendar_events_date_idx on calendar_events(date);

create trigger calendar_events_updated_at before update on calendar_events
  for each row execute function update_updated_at();

alter table calendar_events enable row level security;

create policy "Organizers can view own events"
  on calendar_events for select using (auth.uid() = organizer_id);

create policy "Organizers can create events"
  on calendar_events for insert with check (auth.uid() = organizer_id);

create policy "Organizers can update own events"
  on calendar_events for update using (auth.uid() = organizer_id);

create policy "Organizers can delete own events"
  on calendar_events for delete using (auth.uid() = organizer_id);

create policy "Admins can manage all events"
  on calendar_events for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
