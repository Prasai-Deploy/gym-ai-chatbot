-- ============================================================================
-- 0005 — Events, challenges, and notifications
-- ============================================================================


-- ============================================================================
-- events — one-off sessions the owner organises
-- ============================================================================
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references public.gyms(id) on delete cascade,

  title       text not null,
  description text,

  starts_at   timestamptz not null,
  ends_at     timestamptz,

  -- null means unlimited spots.
  capacity    integer check (capacity is null or capacity > 0),

  image_url   text,

  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint events_end_after_start check (ends_at is null or ends_at >= starts_at)
);

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

create index if not exists events_gym_starts_idx
  on public.events (gym_id, starts_at desc);


-- ============================================================================
-- event_rsvps
-- ============================================================================
create table if not exists public.event_rsvps (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  member_id  uuid not null references public.profiles(id) on delete cascade,

  status     text not null default 'going'
             check (status in ('going', 'cancelled')),

  created_at timestamptz not null default now(),

  constraint event_rsvps_one_per_member unique (event_id, member_id)
);

create index if not exists event_rsvps_event_idx on public.event_rsvps (event_id);
create index if not exists event_rsvps_member_idx on public.event_rsvps (member_id);


-- ── Capacity must be enforced in the database, not the UI ──────────────────
-- Two members tapping "RSVP" at the same instant on the last remaining spot
-- will BOTH pass a client-side check, and both pass a naive server-side count
-- too — each reads "19 of 20 taken" before either writes.
--
-- `select ... for update` on the event row is the fix: the second transaction
-- blocks until the first commits, then re-counts and sees the true total. This
-- is the only reliable way to do it short of a full table lock.
create or replace function public.enforce_event_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap   integer;
  taken integer;
begin
  -- Cancelling never needs a capacity check.
  if new.status <> 'going' then
    return new;
  end if;

  -- Lock the event row. Concurrent RSVPs for the same event now serialize here.
  select e.capacity into cap
    from public.events e
   where e.id = new.event_id
   for update;

  -- Unlimited capacity, nothing to enforce.
  if cap is null then
    return new;
  end if;

  select count(*) into taken
    from public.event_rsvps r
   where r.event_id = new.event_id
     and r.status = 'going'
     and r.id is distinct from new.id;   -- exclude this row on UPDATE

  if taken >= cap then
    raise exception 'This event is full (% of % spots taken).', taken, cap
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists event_rsvps_capacity on public.event_rsvps;
create trigger event_rsvps_capacity
  before insert or update on public.event_rsvps
  for each row execute function public.enforce_event_capacity();


-- ============================================================================
-- challenges — attendance competitions
-- ============================================================================
-- There is deliberately NO challenge_participants table and no stored score.
-- Rankings are computed from check_ins inside the date range (see the
-- gym_leaderboard function in 0006). A denormalised score table would need
-- updating on every check-in and would drift the first time you corrected a
-- bad row by hand.
create table if not exists public.challenges (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references public.gyms(id) on delete cascade,

  title       text not null,
  description text,

  metric      text not null default 'check_in_count'
              check (metric in ('check_in_count', 'streak_length')),

  starts_on   date not null,
  ends_on     date not null,

  prize       text,

  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),

  constraint challenges_end_after_start check (ends_on >= starts_on)
);

create index if not exists challenges_gym_dates_idx
  on public.challenges (gym_id, starts_on, ends_on);


-- ============================================================================
-- notifications — the owner's broadcast channel
-- ============================================================================
-- ONE ROW PER GYM, not per member. A 200-member gym sending 50 announcements
-- is 50 rows here plus read-receipts, rather than 10,000 rows.
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  gym_id     uuid not null references public.gyms(id) on delete cascade,

  title      text not null,
  body       text not null default '',

  kind       text not null default 'announcement'
             check (kind in ('announcement', 'event', 'challenge')),

  -- Optional deep link, e.g. /events/<id>
  url        text,

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists notifications_gym_created_idx
  on public.notifications (gym_id, created_at desc);


create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  member_id       uuid not null references public.profiles(id) on delete cascade,
  read_at         timestamptz not null default now(),

  primary key (notification_id, member_id)
);

create index if not exists notification_reads_member_idx
  on public.notification_reads (member_id);


-- ── my_notifications — the feed, with unread state already resolved ─────────
-- security_invoker = true so the RLS policies below actually apply. Without
-- it, this view would run as its owner and expose every gym's announcements.
create or replace view public.my_notifications
with (security_invoker = true) as
  select
    n.id,
    n.gym_id,
    n.title,
    n.body,
    n.kind,
    n.url,
    n.created_at,
    (r.member_id is not null) as is_read,
    r.read_at
  from public.notifications n
  left join public.notification_reads r
         on r.notification_id = n.id
        and r.member_id = auth.uid()
  order by n.created_at desc;

comment on view public.my_notifications is
  'Notification feed for the current user with read state. Unread badge = count where is_read is false.';


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
       and tablename in (
         'events', 'event_rsvps', 'challenges',
         'notifications', 'notification_reads'
       )
  loop
    execute format('drop policy if exists %I on %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;


-- ── events ─────────────────────────────────────────────────────────────────
alter table public.events enable row level security;

create policy "read gym events" on public.events
  for select using (gym_id = (select public.current_gym_id()));

create policy "staff manage events" on public.events
  for all using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  )
  with check (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  );


-- ── event_rsvps ────────────────────────────────────────────────────────────
alter table public.event_rsvps enable row level security;

create policy "member manages own rsvp" on public.event_rsvps
  for all using (member_id = auth.uid())
  with check (
    member_id = auth.uid()
    -- You may only RSVP to an event at your own gym. Without this, a member
    -- who learned another gym's event id could RSVP to it.
    and exists (
      select 1 from public.events e
       where e.id = event_id
         and e.gym_id = (select public.current_gym_id())
    )
  );

create policy "staff read gym rsvps" on public.event_rsvps
  for select using (
    exists (
      select 1 from public.events e
       where e.id = event_id
         and e.gym_id = (select public.current_gym_id())
    )
    and (select public.current_role()) in ('owner', 'staff')
  );


-- ── challenges ─────────────────────────────────────────────────────────────
alter table public.challenges enable row level security;

create policy "read gym challenges" on public.challenges
  for select using (gym_id = (select public.current_gym_id()));

create policy "owner manages challenges" on public.challenges
  for all using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) = 'owner'
  )
  with check (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) = 'owner'
  );


-- ── notifications ──────────────────────────────────────────────────────────
alter table public.notifications enable row level security;

create policy "read gym notifications" on public.notifications
  for select using (gym_id = (select public.current_gym_id()));

create policy "staff send notifications" on public.notifications
  for insert with check (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) in ('owner', 'staff')
  );

create policy "owner deletes notifications" on public.notifications
  for delete using (
    gym_id = (select public.current_gym_id())
    and (select public.current_role()) = 'owner'
  );


-- ── notification_reads ─────────────────────────────────────────────────────
alter table public.notification_reads enable row level security;

-- A member marks their own notifications read. Nobody reads anyone else's
-- read-receipts — that would leak who has opened what.
create policy "member manages own reads" on public.notification_reads
  for all using (member_id = auth.uid())
  with check (member_id = auth.uid());
