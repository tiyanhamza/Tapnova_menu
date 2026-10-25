create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  active boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.menus enable row level security;
insert into storage.buckets (id, name, public) values ('menu-images', 'menu-images', true) on conflict (id) do nothing;
