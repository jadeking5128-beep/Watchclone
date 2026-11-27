create table if not exists public.afterframe_user_state (
  id text primary key check (id = 'primary'),
  saved_title_ids bigint[] not null default '{}',
  addons jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.afterframe_user_state enable row level security;

-- The app accesses this private single-user row only through its server-side
-- Supabase service-role key after verifying the AFTERFRAME admin session.
-- Do not add anon/authenticated policies for this table.
