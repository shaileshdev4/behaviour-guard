-- BehaviorGuard: persistent behavioral profiles (Postgres / Supabase)
-- Run in Supabase → SQL Editor.

create table if not exists public.behavioral_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  model_blob bytea not null,
  scaler_blob bytea not null,
  baseline_means jsonb not null default '[]'::jsonb,
  cohort_id text,
  lifetime_active_windows integer not null default 0,
  feedback_confirmations integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_behavioral_profiles_user_id
  on public.behavioral_profiles (user_id);

comment on table public.behavioral_profiles is
  'Serialized sklearn IsolationForest + scaler per user_id; written by FastAPI backend.';

-- Backend should use the Postgres connection string (service role / direct), not anon JWT.
alter table public.behavioral_profiles disable row level security;
