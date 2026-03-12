create extension if not exists pgcrypto;

create table if not exists public.user_sectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists user_sectors_user_id_name_unique
  on public.user_sectors (user_id, lower(name));

alter table public.user_sectors enable row level security;

drop policy if exists "user_sectors_select_own" on public.user_sectors;
create policy "user_sectors_select_own"
on public.user_sectors
for select
using (auth.uid() = user_id);

drop policy if exists "user_sectors_insert_own" on public.user_sectors;
create policy "user_sectors_insert_own"
on public.user_sectors
for insert
with check (auth.uid() = user_id);

drop policy if exists "user_sectors_delete_own" on public.user_sectors;
create policy "user_sectors_delete_own"
on public.user_sectors
for delete
using (auth.uid() = user_id);
