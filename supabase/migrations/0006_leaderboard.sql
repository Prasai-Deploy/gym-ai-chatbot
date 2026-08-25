-- ============================================================================
-- 0006 — The opt-in leaderboard
-- ============================================================================
-- `profiles.leaderboard_opt_in` already exists (0001), defaulting to false.
-- This file adds the two functions that read it.
--
-- ── Why a function and not an RLS policy ───────────────────────────────────
-- The obvious implementation is a policy on `profiles` like:
--
--     for select using (gym_id = current_gym_id() and leaderboard_opt_in)
--
-- DO NOT DO THAT. An RLS policy controls which ROWS are visible, never which
-- COLUMNS. That policy would expose the opted-in member's phone number, email,
-- and every other profile column to all their gym-mates.
--
-- A SECURITY DEFINER function returning exactly two fields is airtight: the
-- caller receives what the function selects and nothing else.
-- ============================================================================


-- ============================================================================
-- gym_leaderboard — ranked check-in counts for opted-in members
-- ============================================================================
-- Pass a date range. For a challenge, pass its starts_on / ends_on — that is
-- the whole "challenge leaderboard" feature, with no extra query and no extra
-- security surface.
create or replace function public.gym_leaderboard(
  p_from date default (current_date - 30),
  p_to   date default current_date
)
returns table (
  rank         integer,
  display_name text,
  check_ins    integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    rank() over (order by count(c.id) desc)::integer,
    -- First name only. split_part on a space gives "Priya" from
    -- "Priya Sharma"; a single-word name is returned unchanged.
    split_part(p.full_name, ' ', 1) as display_name,
    count(c.id)::integer
  from public.profiles p
  join public.check_ins c
    on c.member_id = p.id
   and c.checked_in_on between p_from and p_to
  where
    -- The caller's own gym, taken from THEIR session. There is no gym
    -- parameter, so asking for another gym's board is not expressible.
    p.gym_id = (select public.current_gym_id())
    -- Opted in only. Default is false, so silence means private.
    and p.leaderboard_opt_in = true
  group by p.id, p.full_name
  order by 3 desc
  limit 50;
$$;

comment on function public.gym_leaderboard(date, date) is
  'Ranked check-in counts for opted-in members of the caller''s own gym. Returns first names only.';


-- ============================================================================
-- my_rank — so opting out costs you visibility, not the feature
-- ============================================================================
-- A member who has NOT opted in still deserves to know how they are doing.
-- This returns only the caller's own position and count — no other names, no
-- other numbers — so it is safe to rank them against everyone in the gym
-- rather than only against the opted-in subset. That also makes the number
-- meaningful: "12th of 84" rather than "3rd of the 5 people who opted in".
create or replace function public.my_rank(
  p_from date default (current_date - 30),
  p_to   date default current_date
)
returns table (
  rank         integer,
  check_ins    integer,
  total_ranked integer
)
language sql
stable
security definer
set search_path = public
as $$
  with counts as (
    select
      p.id,
      count(c.id) as n
    from public.profiles p
    left join public.check_ins c
      on c.member_id = p.id
     and c.checked_in_on between p_from and p_to
    where p.gym_id = (select public.current_gym_id())
      and p.role = 'member'
    group by p.id
  ),
  ranked as (
    select id, n, rank() over (order by n desc) as r
    from counts
  )
  select
    r.r::integer,
    r.n::integer,
    (select count(*)::integer from counts)
  from ranked r
  where r.id = auth.uid();
$$;

comment on function public.my_rank(date, date) is
  'The calling member''s own rank within their gym. Exposes no other member''s name or count, so it works regardless of opt-in status.';


-- ============================================================================
-- Who may call these
-- ============================================================================
-- Both are SECURITY DEFINER, so they bypass RLS by design. Restrict execution
-- to logged-in users — an anonymous caller has no auth.uid() and would get an
-- empty gym anyway, but being explicit costs nothing.
revoke execute on function public.gym_leaderboard(date, date) from public, anon;
revoke execute on function public.my_rank(date, date) from public, anon;
grant  execute on function public.gym_leaderboard(date, date) to authenticated;
grant  execute on function public.my_rank(date, date) to authenticated;
