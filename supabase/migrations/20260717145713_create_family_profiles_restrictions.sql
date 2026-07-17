create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  birth_date date,
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_restrictions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (
    category in ('medical', 'injury', 'equipment', 'preference', 'other')
  ),
  severity text not null default 'info' check (
    severity in ('info', 'avoid', 'contraindication')
  ),
  description text not null check (char_length(trim(description)) between 1 and 1000),
  starts_on date,
  ends_on date,
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_restrictions_date_range check (
    ends_on is null or starts_on is null or ends_on >= starts_on
  )
);

create index family_members_user_id_idx
  on public.family_members (user_id, family_id);

create index profiles_family_id_idx
  on public.profiles (family_id);

create unique index profiles_family_linked_user_unique_idx
  on public.profiles (family_id, linked_user_id)
  where linked_user_id is not null;

create index profile_restrictions_profile_id_idx
  on public.profile_restrictions (profile_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.preserve_created_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id = old.id;
  new.created_by = old.created_by;
  return new;
end;
$$;

create or replace function private.preserve_membership_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.family_id = old.family_id;
  new.user_id = old.user_id;
  new.created_by = old.created_by;
  return new;
end;
$$;

create or replace function private.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.family_members as member
      where member.family_id = target_family_id
        and member.user_id = (select auth.uid())
    );
$$;

create or replace function private.has_family_role(
  target_family_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.family_members as member
      where member.family_id = target_family_id
        and member.user_id = (select auth.uid())
        and member.role = any (allowed_roles)
    );
$$;

create or replace function private.can_bootstrap_family_owner(
  target_family_id uuid,
  target_user_id uuid,
  target_role text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and target_user_id = (select auth.uid())
    and target_role = 'owner'
    and exists (
      select 1
      from public.families as family
      where family.id = target_family_id
        and family.created_by = (select auth.uid())
    )
    and not exists (
      select 1
      from public.family_members as member
      where member.family_id = target_family_id
    );
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.preserve_created_record() from public, anon, authenticated;
revoke all on function private.preserve_membership_identity() from public, anon, authenticated;
revoke all on function private.is_family_member(uuid) from public, anon;
revoke all on function private.has_family_role(uuid, text[]) from public, anon;
revoke all on function private.can_bootstrap_family_owner(uuid, uuid, text) from public, anon;

grant execute on function private.is_family_member(uuid) to authenticated;
grant execute on function private.has_family_role(uuid, text[]) to authenticated;
grant execute on function private.can_bootstrap_family_owner(uuid, uuid, text) to authenticated;

create trigger families_set_updated_at
before update on public.families
for each row execute function private.set_updated_at();

create trigger families_preserve_created_record
before update on public.families
for each row execute function private.preserve_created_record();

create trigger family_members_set_updated_at
before update on public.family_members
for each row execute function private.set_updated_at();

create trigger family_members_preserve_identity
before update on public.family_members
for each row execute function private.preserve_membership_identity();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger profiles_preserve_created_record
before update on public.profiles
for each row execute function private.preserve_created_record();

create trigger profile_restrictions_set_updated_at
before update on public.profile_restrictions
for each row execute function private.set_updated_at();

create trigger profile_restrictions_preserve_created_record
before update on public.profile_restrictions
for each row execute function private.preserve_created_record();

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_restrictions enable row level security;

grant select, insert, update, delete on public.families to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.profile_restrictions to authenticated;

create policy "family members can view families"
on public.families
for select
to authenticated
using (
  created_by = (select auth.uid())
  or (select private.is_family_member(id))
);

create policy "authenticated users can create families"
on public.families
for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy "family managers can update families"
on public.families
for update
to authenticated
using ((select private.has_family_role(id, array['owner', 'admin'])))
with check ((select private.has_family_role(id, array['owner', 'admin'])));

create policy "family owners can delete families"
on public.families
for delete
to authenticated
using ((select private.has_family_role(id, array['owner'])));

create policy "family members can view memberships"
on public.family_members
for select
to authenticated
using ((select private.is_family_member(family_id)));

create policy "family managers can add memberships"
on public.family_members
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    (select private.can_bootstrap_family_owner(family_id, user_id, role))
    or (
      (select private.has_family_role(family_id, array['owner', 'admin']))
      and (
        (select private.has_family_role(family_id, array['owner']))
        or role = 'member'
      )
    )
  )
);

create policy "family managers can update non-owner memberships"
on public.family_members
for update
to authenticated
using (
  role <> 'owner'
  and (
    (select private.has_family_role(family_id, array['owner']))
    or (
      role = 'member'
      and (select private.has_family_role(family_id, array['admin']))
    )
  )
)
with check (
  role <> 'owner'
  and (
    (select private.has_family_role(family_id, array['owner']))
    or (
      role = 'member'
      and (select private.has_family_role(family_id, array['admin']))
    )
  )
);

create policy "family managers can delete non-owner memberships"
on public.family_members
for delete
to authenticated
using (
  role <> 'owner'
  and (
    (select private.has_family_role(family_id, array['owner']))
    or (
      role = 'member'
      and (select private.has_family_role(family_id, array['admin']))
    )
  )
);

create policy "family members can view profiles"
on public.profiles
for select
to authenticated
using ((select private.is_family_member(family_id)));

create policy "family managers can create profiles"
on public.profiles
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.has_family_role(family_id, array['owner', 'admin']))
);

create policy "family managers can update profiles"
on public.profiles
for update
to authenticated
using ((select private.has_family_role(family_id, array['owner', 'admin'])))
with check ((select private.has_family_role(family_id, array['owner', 'admin'])));

create policy "family managers can delete profiles"
on public.profiles
for delete
to authenticated
using ((select private.has_family_role(family_id, array['owner', 'admin'])));

create policy "family members can view restrictions"
on public.profile_restrictions
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles as profile
    where profile.id = profile_restrictions.profile_id
      and (select private.is_family_member(profile.family_id))
  )
);

create policy "family managers can create restrictions"
on public.profile_restrictions
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.profiles as profile
    where profile.id = profile_restrictions.profile_id
      and (select private.has_family_role(profile.family_id, array['owner', 'admin']))
  )
);

create policy "family managers can update restrictions"
on public.profile_restrictions
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles as profile
    where profile.id = profile_restrictions.profile_id
      and (select private.has_family_role(profile.family_id, array['owner', 'admin']))
  )
)
with check (
  exists (
    select 1
    from public.profiles as profile
    where profile.id = profile_restrictions.profile_id
      and (select private.has_family_role(profile.family_id, array['owner', 'admin']))
  )
);

create policy "family managers can delete restrictions"
on public.profile_restrictions
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles as profile
    where profile.id = profile_restrictions.profile_id
      and (select private.has_family_role(profile.family_id, array['owner', 'admin']))
  )
);
