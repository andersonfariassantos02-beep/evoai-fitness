create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(5,2) check (weight_kg between 20 and 400),
  body_fat_percentage numeric(4,1) check (body_fat_percentage between 2 and 70),
  waist_cm numeric(5,1) check (waist_cm between 30 and 300),
  chest_cm numeric(5,1) check (chest_cm between 30 and 300),
  hips_cm numeric(5,1) check (hips_cm between 30 and 300),
  arm_cm numeric(4,1) check (arm_cm between 10 and 100),
  thigh_cm numeric(4,1) check (thigh_cm between 20 and 150),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint body_measurements_has_value check (
    num_nonnulls(
      weight_kg,
      body_fat_percentage,
      waist_cm,
      chest_cm,
      hips_cm,
      arm_cm,
      thigh_cm
    ) > 0
  ),
  unique (user_id, measured_on)
);

create index if not exists body_measurements_user_date_idx
  on public.body_measurements (user_id, measured_on desc);

alter table public.body_measurements enable row level security;

revoke all on table public.body_measurements from anon;
revoke all on table public.body_measurements from authenticated;
grant select, insert, update, delete on table public.body_measurements to authenticated;

create policy "Users can read their own body measurements"
  on public.body_measurements for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own body measurements"
  on public.body_measurements for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own body measurements"
  on public.body_measurements for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own body measurements"
  on public.body_measurements for delete to authenticated
  using ((select auth.uid()) = user_id);
