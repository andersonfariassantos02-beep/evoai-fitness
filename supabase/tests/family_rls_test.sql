begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

select has_table('public', 'families', 'families table exists');
select has_table('public', 'family_members', 'family_members table exists');
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'profile_restrictions', 'profile_restrictions table exists');

select is(
  (
    select count(*)::integer
    from pg_class
    where oid in (
      'public.families'::regclass,
      'public.family_members'::regclass,
      'public.profiles'::regclass,
      'public.profile_restrictions'::regclass
    )
      and relrowsecurity
  ),
  4,
  'RLS is enabled on every exposed table'
);

insert into auth.users (id, email, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'outsider@example.test', now(), now());

insert into public.families (id, name, created_by)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Family A',
  '11111111-1111-1111-1111-111111111111'
);

insert into public.family_members (family_id, user_id, role, created_by)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'owner',
  '11111111-1111-1111-1111-111111111111'
);

insert into public.profiles (id, family_id, display_name, created_by)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Owner profile',
  '11111111-1111-1111-1111-111111111111'
);

insert into public.profile_restrictions (
  id,
  profile_id,
  category,
  description,
  created_by
)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'injury',
  'Avoid impact',
  '11111111-1111-1111-1111-111111111111'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-1111-1111-111111111111',
  true
);

select results_eq(
  $$select count(*)::bigint from public.families$$,
  array[1::bigint],
  'family owner can view the family'
);

select results_eq(
  $$select count(*)::bigint from public.profiles$$,
  array[1::bigint],
  'family owner can view profiles'
);

select results_eq(
  $$select count(*)::bigint from public.profile_restrictions$$,
  array[1::bigint],
  'family owner can view restrictions'
);

select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-2222-2222-222222222222',
  true
);

select results_eq(
  $$select count(*)::bigint from public.families$$,
  array[0::bigint],
  'an unrelated account cannot view another family'
);

select results_eq(
  $$select count(*)::bigint from public.profiles$$,
  array[0::bigint],
  'an unrelated account cannot view another family profile'
);

select * from finish();

rollback;
