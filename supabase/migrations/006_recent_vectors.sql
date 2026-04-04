-- Active-phase vectors for cross-session retraining (JSON array of 18-D rows; cap in app)
alter table public.behavioral_profiles
  add column if not exists recent_vectors jsonb not null default '[]'::jsonb;

comment on column public.behavioral_profiles.recent_vectors is
  'Recent active scoring windows as JSON arrays; used for optional retraining.';
