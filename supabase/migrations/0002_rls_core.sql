-- ============================================================================
-- 0002 — Row Level Security for the core tables
-- ============================================================================
-- This file is the actual security boundary of the product. Everything else
-- is convenience.
--
-- Row Level Security (RLS) is a Postgres feature that attaches a WHERE clause
-- to every query against a table, automatically, at the database level. Once
-- it is on, a query that forgets to filter by gym simply returns nothing —
-- there is no way for application code to leak another gym's data by mistake.
--
-- Read this rule of thumb: RLS is ON by default and DENIES by default. A table
-- with RLS enabled and no policies returns zero rows to everyone. You then add
-- policies to open up exactly what should be visible.
-- ============================================================================


-- ============================================================================
-- Helper functions
-- ============================================================================
-- Every policy below is written in terms of these two. Write them once, get
-- them right once.
--
-- Three details matter, and all three are load-bearing:
--
--  1. SECURITY DEFINER — the function runs with its OWNER's privileges, which
--     bypasses RLS. Without this, a policy on `profiles` that queries
--     `profiles` would trigger itself and recurse forever.
--
--  2. set search_path = public — without it, someone who can set their own
--     search_path could point `profiles` at a table they control and make the
--     function return whatever they like. This is a real, exploited attack on
--     SECURITY DEFINER functions, not a theoretical one.
--
--  3. stable — tells Postgres the result cannot change within a single
--     statement, so it can evaluate it once instead of once per row.

create or replace function public.current_gym_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select gym_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

comment on function public.current_gym_id() is
  'The gym of the currently authenticated user. Derived from their signed JWT — never from a request header.';


-- ============================================================================
-- Make this file safe to re-run
-- ============================================================================
-- `create policy` has no IF NOT EXISTS, so re-running this file would fail on
-- the first policy that already exists. This block clears every policy on the
-- six core tables first.
--
-- It also handles a subtler case: if you RENAME a policy while editing this
-- file, a plain list of DROP statements would leave the old one behind, still
-- granting access under its old rule. Reading the live list from `pg_policies`
-- means nothing can be orphaned.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in (
         'gyms', 'profiles', 'invitations',
         'membership_plans', 'memberships', 'payments'
       )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      r.policyname, r.schemaname, r.tablename
    );
  end loop;
end $$;


-- ============================================================================
-- gyms
-- ============================================================================
alter table public.gyms enable row level security;

-- Everyone in a gym can read their own gym row. Members need this for
-- branding (logo, colour, business name); staff need it for settings.
create policy "read own gym" on public.gyms
  for select using (
    id = (select public.current_gym_id())
  );

-- Only the owner can change branding, hours, or streak settings.
create policy "owner updates own gym" on public.gyms
  for update using (
    id = (select public.current_gym_id())
    and (select public.current_role()) = 'owner'
  );

-- NOTE: there is deliberately no INSERT policy.
-- Creating a gym happens during owner signup, server-side, inside a single
-- transaction that also promotes the signing-up user to 'owner'. That runs
-- with the service-role key. Leaving INSERT closed here means a logged-in
-- member cannot spam new gyms into existence.


-- ============================================================================
-- profiles
-- ============================================================================
alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles
  for select using (id = auth.uid());

create policy "staff read gym profiles" on public.profiles
  for select using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  );

create policy "update own profile" on public.profiles
  for update using (id = auth.uid());

-- Owners and staff fix member details from the admin panel — a misspelled
-- name, an out-of-date phone number. The column grants below still apply to
-- them, so this cannot be used to promote anyone: `role` and `gym_id` remain
-- unwritable by every non-service-role caller.
create policy "staff update gym profiles" on public.profiles
  for update using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  )
  with check (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  );

-- ── Column-level lockdown: the privilege-escalation guard ──────────────────
-- The UPDATE policy above lets a member edit their own row. On its own, that
-- would also let them run:
--
--     update profiles set role = 'owner' where id = auth.uid();
--
-- An RLS policy controls WHICH ROWS you may touch, not WHICH COLUMNS. So we
-- use Postgres column privileges for the column half: revoke UPDATE entirely,
-- then grant it back on exactly the four fields a member may edit.
--
-- `role` and `gym_id` are now unwritable by any normal user. Changing them is
-- a server-side operation using the service-role key (owner signup, invitation
-- claim, staff promotion).
revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url, leaderboard_opt_in)
  on public.profiles to authenticated;


-- ============================================================================
-- invitations
-- ============================================================================
alter table public.invitations enable row level security;

-- Owners and staff manage invitations for their own gym.
create policy "staff manage invitations" on public.invitations
  for all using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  )
  with check (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  );

-- NOTE: the person CLAIMING an invitation is not logged in yet, so they can't
-- satisfy any policy. Claiming is handled server-side: the endpoint looks the
-- token up with the service-role key, checks it is unexpired and unclaimed,
-- then creates the auth user and stamps claimed_at.


-- ============================================================================
-- membership_plans
-- ============================================================================
alter table public.membership_plans enable row level security;

-- Members need to see what their gym sells.
create policy "read gym plans" on public.membership_plans
  for select using (
    gym_id = (select public.current_gym_id())
  );

create policy "owner manages plans" on public.membership_plans
  for all using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) = 'owner'
  )
  with check (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) = 'owner'
  );


-- ============================================================================
-- memberships
-- ============================================================================
alter table public.memberships enable row level security;

create policy "member reads own membership" on public.memberships
  for select using (
    gym_id = (select public.current_gym_id())
    and member_id = auth.uid()
  );

create policy "staff read gym memberships" on public.memberships
  for select using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  );

create policy "staff manage memberships" on public.memberships
  for all using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  )
  with check (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  );


-- ============================================================================
-- payments
-- ============================================================================
alter table public.payments enable row level security;

-- A member sees their own payment history — and nobody else's.
create policy "member reads own payments" on public.payments
  for select using (
    gym_id = (select public.current_gym_id())
    and member_id = auth.uid()
  );

create policy "staff read gym payments" on public.payments
  for select using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  );

-- Only owners and staff record payments. A member cannot mark themselves paid.
create policy "staff record payments" on public.payments
  for insert with check (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  );

-- Corrections to the ledger are the owner's call alone.
create policy "owner corrects payments" on public.payments
  for update using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) = 'owner'
  );

create policy "owner deletes payments" on public.payments
  for delete using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) = 'owner'
  );


-- ============================================================================
-- Why every policy says `(select public.current_gym_id())` and not
-- `public.current_gym_id()`
-- ============================================================================
-- Wrapped in a sub-select, Postgres treats the call as a constant and
-- evaluates it ONCE per statement. Called bare, it is evaluated once PER ROW.
--
-- On a table with 5,000 payments that is the difference between one function
-- call and five thousand — the difference between a fast page and a timeout.
-- The parentheses are not stylistic.
-- ============================================================================
