-- ============================================================================
-- 0003 — Signup trigger and the overdue-members view
-- ============================================================================


-- ============================================================================
-- Auto-create a profile whenever an auth user is created
-- ============================================================================
-- Supabase owns the `auth.users` table. You never write to it directly. This
-- trigger mirrors each new auth user into `public.profiles` so the rest of the
-- schema has something to point a foreign key at.
--
-- Two deliberate choices:
--
--  * role defaults to 'member' — the LEAST privileged role. Nobody becomes an
--    owner or staff member by signing up. Promotion is an explicit,
--    server-side act (owner signup, or an owner promoting a staff member).
--
--  * gym_id is left NULL. It gets filled in by whichever flow created this
--    user: the invitation-claim endpoint sets it from the invitation, and the
--    owner-signup transaction sets it to the gym it just created. Guessing
--    here would attach people to the wrong gym.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    ),
    'member'
  )
  -- If a profile somehow already exists, do not explode. An exception raised
  -- in this trigger would abort the entire signup and leave the user unable
  -- to register at all, with a confusing error.
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- overdue_members — the payment-reminder engine, in one view
-- ============================================================================
-- You do not need a background job or a cron system to know who owes money.
-- An overdue member is simply an active membership whose end_date has passed.
-- The owner dashboard selects from this view; that is the whole feature.
--
-- ── The `security_invoker = true` is the important part ────────────────────
-- By default, a Postgres view runs with the privileges of the user who OWNS
-- it, not the user querying it. That means a normal view would happily bypass
-- the RLS policies on `memberships` and `profiles` and show EVERY gym's
-- overdue members to anyone who could select from it.
--
-- `security_invoker = true` (Postgres 15+) flips that: the view runs as the
-- caller, so the underlying RLS policies from 0002 apply normally. An owner
-- sees their own gym's overdue members; nobody sees anyone else's.
--
-- This is one of the easiest ways to accidentally punch a hole through RLS.
create or replace view public.overdue_members
with (security_invoker = true) as
  select
    m.id            as membership_id,
    m.gym_id,
    m.member_id,
    m.plan_id,
    m.start_date,
    m.end_date,
    (current_date - m.end_date) as days_overdue,
    p.full_name,
    p.phone,
    p.email,
    pl.name         as plan_name,
    pl.price_paise
  from public.memberships m
  join public.profiles p          on p.id = m.member_id
  left join public.membership_plans pl on pl.id = m.plan_id
  where m.status = 'active'
    and m.end_date < current_date;

comment on view public.overdue_members is
  'Active memberships past their end date. Respects RLS via security_invoker, so each gym sees only its own.';


-- ============================================================================
-- expiring_soon — the gentler version, for reminders before the due date
-- ============================================================================
-- Chasing people AFTER they lapse is how gyms lose members. This view finds
-- memberships expiring in the next 7 days so the owner can nudge first.
create or replace view public.expiring_soon
with (security_invoker = true) as
  select
    m.id            as membership_id,
    m.gym_id,
    m.member_id,
    m.end_date,
    (m.end_date - current_date) as days_remaining,
    p.full_name,
    p.phone,
    p.email,
    pl.name         as plan_name,
    pl.price_paise
  from public.memberships m
  join public.profiles p          on p.id = m.member_id
  left join public.membership_plans pl on pl.id = m.plan_id
  where m.status = 'active'
    and m.end_date >= current_date
    and m.end_date < current_date + 7;


-- ============================================================================
-- Housekeeping: mark lapsed memberships as expired
-- ============================================================================
-- The views above work off end_date directly, so this is not required for
-- correctness — it just keeps the `status` column honest for reporting.
--
-- Call it from a scheduled job later (Supabase supports pg_cron), or simply
-- run it by hand now and then. It is safe to run repeatedly.
create or replace function public.expire_lapsed_memberships()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.memberships
     set status = 'expired'
   where status = 'active'
     and end_date < current_date;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Only the service role should run this — it writes across every gym.
revoke execute on function public.expire_lapsed_memberships() from public, anon, authenticated;
