-- Email/password accounts for BehaviorGuard (FastAPI auth, not Supabase Auth UI)

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.users disable row level security;

comment on table public.users is 'Registered users; behavioral_profiles.user_id references users.id::text';
