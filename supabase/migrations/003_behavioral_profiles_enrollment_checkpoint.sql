-- Allow partial enrollment rows + checkpoint JSON (resume after logout).
alter table public.behavioral_profiles
  alter column model_blob drop not null,
  alter column scaler_blob drop not null;

alter table public.behavioral_profiles
  add column if not exists enrollment_checkpoint jsonb;

comment on column public.behavioral_profiles.enrollment_checkpoint is
  'In-progress enrollment vectors + metadata; cleared when full model is saved.';
