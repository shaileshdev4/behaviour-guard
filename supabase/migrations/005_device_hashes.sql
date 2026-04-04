-- Known device SHA-256 fingerprints per user (capped in app at 5)
alter table public.behavioral_profiles
  add column if not exists known_device_hashes jsonb not null default '[]'::jsonb;

comment on column public.behavioral_profiles.known_device_hashes is
  'Ordered list of device fingerprint hashes; max 5 enforced in application code.';
