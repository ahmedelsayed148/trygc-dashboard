create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.app_configuration (
  id text primary key default 'singleton',
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.config_audit_logs (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('system', 'campaign', 'team', 'notification', 'workspace', 'task', 'analytics', 'data', 'feature')),
  action text not null,
  changed_by text not null,
  changed_at timestamptz not null default timezone('utc', now()),
  before jsonb not null default '{}'::jsonb,
  after jsonb not null default '{}'::jsonb
);

create table if not exists public.config_backups (
  id uuid primary key default gen_random_uuid(),
  configuration jsonb not null,
  created_by text not null,
  created_at timestamptz not null default timezone('utc', now()),
  description text not null default '',
  automatic boolean not null default false
);

drop trigger if exists set_app_configuration_updated_at on public.app_configuration;
create trigger set_app_configuration_updated_at
before update on public.app_configuration
for each row
execute function public.set_updated_at();

alter table public.app_configuration enable row level security;
alter table public.config_audit_logs enable row level security;
alter table public.config_backups enable row level security;

drop policy if exists "authenticated users can read app configuration" on public.app_configuration;
create policy "authenticated users can read app configuration"
on public.app_configuration
for select
to authenticated
using (true);

drop policy if exists "authenticated users can manage app configuration" on public.app_configuration;
create policy "authenticated users can manage app configuration"
on public.app_configuration
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can read configuration audit logs" on public.config_audit_logs;
create policy "authenticated users can read configuration audit logs"
on public.config_audit_logs
for select
to authenticated
using (true);

drop policy if exists "authenticated users can create configuration audit logs" on public.config_audit_logs;
create policy "authenticated users can create configuration audit logs"
on public.config_audit_logs
for insert
to authenticated
with check (true);

drop policy if exists "authenticated users can read configuration backups" on public.config_backups;
create policy "authenticated users can read configuration backups"
on public.config_backups
for select
to authenticated
using (true);

drop policy if exists "authenticated users can manage configuration backups" on public.config_backups;
create policy "authenticated users can manage configuration backups"
on public.config_backups
for all
to authenticated
using (true)
with check (true);

insert into public.app_configuration (id, configuration)
values ('singleton', '{}'::jsonb)
on conflict (id) do nothing;
