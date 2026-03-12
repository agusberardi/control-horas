alter table public.profiles
  add column if not exists hourly_rate_night numeric;

alter table public.hours
  add column if not exists worked_hours_total numeric,
  add column if not exists worked_hours_normal numeric,
  add column if not exists worked_hours_night numeric,
  add column if not exists hourly_rate_snapshot numeric,
  add column if not exists hourly_rate_night_snapshot numeric;

update public.profiles
set hourly_rate_night = hourly_rate
where hourly_rate_night is null
  and hourly_rate is not null;
