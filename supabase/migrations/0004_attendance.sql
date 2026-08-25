-- ============================================================================
-- 0004 — QR check-in and streaks
-- ============================================================================
-- The engagement engine. A member scans the gym's QR sticker with their phone
-- camera, which opens https://yourapp.com/checkin?c=<code>, and the app records
-- a check-in. Streaks are computed from those check-ins.
-- ============================================================================


-- ============================================================================
-- gym_qr_codes — what makes "static now, rotating later" free
-- ============================================================================
-- Today every gym has ONE row here: kind = 'static', expires_at = null. That
-- is the code printed on the sticker by the door.
--
-- Later, if you want tamper-proof check-ins, a tablet at the front desk will
-- insert short-lived rows (kind = 'rotating', expires_at = now() + 90 seconds)
-- and display each as a QR that changes before anyone can photograph and share
-- it. THE VALIDATION LOGIC IS IDENTICAL FOR BOTH:
--
--     is_active and (expires_at is null or expires_at > now())
--
-- Writing that one condition now is the entire cost of future-proofing. No
-- migration will be needed.
create table if not exists public.gym_qr_codes (
  id         uuid primary key default gen_random_uuid(),
  gym_id     uuid not null references public.gyms(id) on delete cascade,

  -- Opaque and unguessable. Generate with encode(gen_random_bytes(16),'hex').
  -- Never use the gym's id or slug here — a guessable code means anyone who
  -- knows a gym exists can check in to it.
  code       text not null unique,

  kind       text not null default 'static'
             check (kind in ('static', 'rotating')),

  -- null = never expires (a printed sticker). A timestamp = short-lived.
  expires_at timestamptz,

  -- The owner's "someone photographed our sticker and shared it" recovery:
  -- flip this to false, print a new one.
  is_active  boolean not null default true,

  created_at timestamptz not null default now(),

  -- A rotating code with no expiry would be a permanent code by accident.
  constraint qr_rotating_must_expire check (
    kind = 'static' or expires_at is not null
  )
);

create index if not exists gym_qr_codes_gym_id_idx on public.gym_qr_codes (gym_id);

-- Only one active static code per gym — otherwise revoking a leaked sticker
-- silently leaves an older one working.
create unique index if not exists gym_qr_codes_one_active_static
  on public.gym_qr_codes (gym_id)
  where kind = 'static' and is_active;


-- ============================================================================
-- check_ins — one row per member per day
-- ============================================================================
create table if not exists public.check_ins (
  id            uuid primary key default gen_random_uuid(),

  gym_id        uuid not null references public.gyms(id) on delete cascade,
  member_id     uuid not null references public.profiles(id) on delete cascade,

  -- The calendar date, computed server-side in the GYM's timezone. Storing
  -- this separately from the timestamp is what makes "one per day" enforceable
  -- and makes streak arithmetic simple date subtraction.
  checked_in_on date not null default current_date,
  checked_in_at timestamptz not null default now(),

  source        text not null default 'qr'
                check (source in ('qr', 'manual')),

  -- null for a self check-in; the staff member's id for a manual desk entry.
  recorded_by   uuid references public.profiles(id) on delete set null,

  -- THIS CONSTRAINT IS THE ENTIRE DUPLICATE-PREVENTION SYSTEM.
  -- A second scan on the same day violates it; the API catches that specific
  -- error and returns a friendly "already checked in today" with the current
  -- streak. You never write reconciliation logic, and there is no window in
  -- which two concurrent scans can both succeed.
  constraint check_ins_one_per_member_per_day unique (member_id, checked_in_on)
);

create index if not exists check_ins_gym_date_idx
  on public.check_ins (gym_id, checked_in_on desc);

-- The streak query reads a single member's history in date order.
create index if not exists check_ins_member_date_idx
  on public.check_ins (member_id, checked_in_on);


-- ============================================================================
-- member_streak() — computed on read, never stored
-- ============================================================================
-- Storing current_streak on `profiles` and maintaining it with a trigger looks
-- simpler and is a trap. The moment you fix a check-in by hand, or a trigger
-- fails part-way through a transaction, the stored number is wrong forever and
-- nothing detects it. Computing on read cannot drift.
--
-- ── The streak rule ────────────────────────────────────────────────────────
-- A streak is an unbroken run of check-in days where no gap exceeds the gym's
-- `streak_grace_days` (default 2). Training Mon/Wed/Fri keeps a streak alive.
-- The number returned counts ACTUAL CHECK-IN DAYS, not calendar days — so
-- Mon/Wed/Fri for three weeks is a streak of 9, not 21.
--
-- A strict daily streak would be the wrong product: nobody trains 365 days
-- straight, so streaks would break constantly and the feature would demotivate.
create or replace function public.member_streak(p_member uuid default null)
returns table (
  current_streak  integer,
  longest_streak  integer,
  total_check_ins integer,
  last_check_in   date
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(p_member, auth.uid());
  grace  integer;
begin
  -- ── Authorization ────────────────────────────────────────────────────────
  -- This function is SECURITY DEFINER, so it bypasses RLS. That makes the
  -- p_member parameter a hole unless we check it: without this block, any
  -- member could pass someone else's uuid and read their attendance.
  -- You may read your own streak, or a gym-mate's if you are owner/staff.
  if target is distinct from auth.uid() then
    if not exists (
      select 1
        from public.profiles me
        join public.profiles them on them.gym_id = me.gym_id
       where me.id = auth.uid()
         and them.id = target
         and me.role in ('owner', 'staff')
    ) then
      raise exception 'not authorized to read this member''s streak'
        using errcode = '42501';
    end if;
  end if;

  select coalesce(g.streak_grace_days, 2)
    into grace
    from public.profiles p
    join public.gyms g on g.id = p.gym_id
   where p.id = target;

  -- No gym (or no profile) means no streak, rather than an error.
  grace := coalesce(grace, 2);

  -- ── Gaps and islands ─────────────────────────────────────────────────────
  -- `lag()` gives the previous check-in date. A gap larger than the grace
  -- period marks a break. A running SUM of those breaks assigns every
  -- unbroken run its own id — that running total only increments at a break,
  -- so consecutive days share a number.
  return query
  with marked as (
    select
      c.checked_in_on,
      case
        when c.checked_in_on
             - lag(c.checked_in_on) over (order by c.checked_in_on) > grace
        then 1 else 0
      end as is_break
    from public.check_ins c
    where c.member_id = target
  ),
  islands as (
    select
      m.checked_in_on,
      sum(m.is_break) over (order by m.checked_in_on) as run_id
    from marked m
  ),
  runs as (
    select
      i.run_id,
      count(*)::integer as len,
      max(i.checked_in_on) as last_day
    from islands i
    group by i.run_id
  )
  select
    -- The current streak is the most recent run — but ONLY if it has not
    -- already lapsed. Without this date filter a member who stopped training
    -- six months ago would still show their old streak forever.
    coalesce((
      select r.len from runs r
       where r.last_day >= current_date - grace
       order by r.last_day desc
       limit 1
    ), 0),
    coalesce((select max(r.len) from runs r), 0),
    (select count(*)::integer from public.check_ins c where c.member_id = target),
    (select max(c.checked_in_on) from public.check_ins c where c.member_id = target);
end;
$$;

comment on function public.member_streak(uuid) is
  'Current and longest streak for a member. Defaults to the caller. Owner/staff may pass a gym-mate''s id; anyone else gets a permission error.';


-- ============================================================================
-- Row Level Security
-- ============================================================================
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('gym_qr_codes', 'check_ins')
  loop
    execute format('drop policy if exists %I on %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table public.gym_qr_codes enable row level security;

-- Members are deliberately NOT given read access. They get the code off the
-- sticker on the wall; there is no reason to also hand them the table.
create policy "staff read gym qr codes" on public.gym_qr_codes
  for select using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  );

create policy "owner manages qr codes" on public.gym_qr_codes
  for all using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) = 'owner'
  )
  with check (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) = 'owner'
  );


alter table public.check_ins enable row level security;

create policy "member reads own check ins" on public.check_ins
  for select using (
    gym_id = (select public.current_gym_id())
    and member_id = auth.uid()
  );

create policy "staff read gym check ins" on public.check_ins
  for select using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  );

-- Staff can check someone in manually at the desk.
create policy "staff record check ins" on public.check_ins
  for insert with check (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  );

-- NOTE: members have NO insert policy, and that is the point.
-- If a member could insert directly they would bypass QR validation entirely
-- and could check in from their sofa. Self check-in goes through the server,
-- which validates the scanned code against gym_qr_codes, confirms the gym
-- matches the caller's own gym, checks opening hours, and only then writes
-- the row using the service-role key.

-- Corrections are the owner's call.
create policy "owner deletes check ins" on public.check_ins
  for delete using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) = 'owner'
  );
