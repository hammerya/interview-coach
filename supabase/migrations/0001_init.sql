-- Interview Coach initial schema
-- Run this in your Supabase project: SQL Editor → New Query → paste → Run.

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- PROFILES: one row per user, populated by the intake survey
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  full_name text,
  pronouns text,
  current_role_title text,
  years_experience int,
  strengths text[],
  growth_areas text[],
  energizers text,
  drainers text,
  short_term_goals text,
  long_term_goals text,
  work_environment text,
  proudest_accomplishment text,
  challenge_overcome text,
  skills_to_probe text,
  background_gaps text,
  feedback_style text,
  resume_text text,
  resume_filename text,
  intake_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- INTERVIEW TARGETS: one per company/role the user is prepping for
create table if not exists public.interview_targets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  company_location text,
  company_notes text,
  job_title text not null,
  job_details text,
  interviewer_name text,
  interviewer_details text,
  interview_date date,
  questions jsonb,
  research_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interview_targets_user_idx on public.interview_targets(user_id);

-- MOCK INTERVIEWS: every attempt, stored for history and recall
create table if not exists public.mock_interviews (
  id uuid primary key default uuid_generate_v4(),
  target_id uuid not null references public.interview_targets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('single','five','full')),
  personality text not null check (personality in ('warm','analytical','challenging')),
  answers jsonb not null default '[]'::jsonb,
  score jsonb,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists mock_interviews_target_idx on public.mock_interviews(target_id);
create index if not exists mock_interviews_user_idx on public.mock_interviews(user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists interview_targets_set_updated_at on public.interview_targets;
create trigger interview_targets_set_updated_at before update on public.interview_targets
  for each row execute function public.set_updated_at();

-- Row-Level Security
alter table public.profiles enable row level security;
alter table public.interview_targets enable row level security;
alter table public.mock_interviews enable row level security;

drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "targets_owner" on public.interview_targets;
create policy "targets_owner" on public.interview_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mocks_owner" on public.mock_interviews;
create policy "mocks_owner" on public.mock_interviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create an empty profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
