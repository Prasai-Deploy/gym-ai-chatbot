-- ============================================================================
-- 0001 — Tenancy and Money
-- ============================================================================
-- Creates the six tables that make the product work at all:
--   gyms, profiles, invitations, membership_plans, memberships, payments
--
-- The one idea to hold on to: every row that belongs to a gym carries a
-- `gym_id` column. Migration 0002 then adds a database-level rule saying
-- "you may only see rows where gym_id matches your own gym". Because that
-- rule lives in the database, application code cannot forget it.
--
-- Run this FIRST. Nothing else works without it.
-- ============================================================================


-- ── Shared helper: keep `updated_at` honest ─────────────────────────────────
-- Attached as a trigger to tables that have an updated_at column. Without
-- this, updated_at only changes when someone remembers to set it, which
-- means it is wrong roughly half the time.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================================
-- 1. gyms — one row per paying customer
-- ============================================================================
-- This deliberately merges what a more "enterprise" design would split into
-- organizations + organization_branding + organization_settings. Three tables
-- that are always joined one-to-one should be one table. You can always split
-- later; you cannot easily un-split a schema you find confusing.
create table if not exists public.gyms (
  id                uuid primary key default gen_random_uuid(),

  -- Identity
  name              text not null,
  slug              text not null unique,

  -- White-label branding. `primary_color` is read by the frontend and injected
  -- as a CSS variable, so a malformed value would break the whole UI — hence
  -- the regex CHECK. The database is the last line of defence, not the first.
  logo_url          text,
  primary_color     text not null default '#F97316'
                    check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),

  -- Contact
  phone             text,
  address           text,
  city              text,

  -- Operating configuration.
  -- timezone matters more than it looks: check-ins are stamped with a calendar
  -- date, and a 6am IST check-in evaluated in a US timezone lands on the
  -- PREVIOUS day, silently corrupting streaks.
  timezone          text not null default 'Asia/Kolkata',
  opens_at          time not null default '05:00',
  closes_at         time not null default '23:00',

  -- How many days a member may miss before their streak breaks.
  -- 2 means training Mon/Wed/Fri keeps a streak alive. See 0004.
  streak_grace_days integer not null default 2
                    check (streak_grace_days between 0 and 7),

  status            text not null default 'active'
                    check (status in ('active', 'suspended')),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- `create trigger` has no IF NOT EXISTS, so drop-then-create keeps this file
-- safe to run more than once. You will re-run these while learning.
drop trigger if exists gyms_touch_updated_at on public.gyms;
create trigger gyms_touch_updated_at
  before update on public.gyms
  for each row execute function public.touch_updated_at();


-- ============================================================================
-- 2. profiles — one row per human
-- ============================================================================
-- This is the bridge between Supabase Auth (which owns `auth.users`) and your
-- data. The primary key is the SAME uuid as the auth user, which is what makes
-- `auth.uid() = id` work in the security rules.
--
-- A profile row is created automatically by a trigger — see 0003.
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,

  -- The one gym this person belongs to.
  -- Nullable ONLY for the brief window during owner signup, between the auth
  -- user existing and their gym being created.
  gym_id             uuid references public.gyms(id) on delete cascade,

  -- Roles are a fixed list, enforced here. A typo'd role in application code
  -- would otherwise become a silent security hole — 'Owner' != 'owner' would
  -- quietly fail every permission check.
  role               text not null default 'member'
                     check (role in ('owner', 'staff', 'member')),

  full_name          text not null default '',
  phone              text,
  email              text,
  avatar_url         text,

  -- Governs whether gym-mates can see this member's first name and streak.
  -- Defaults to FALSE. Under India's DPDP Act, opt-in is the defensible
  -- position for this kind of visibility.
  leaderboard_opt_in boolean not null default false,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Nearly every security rule filters on gym_id, so this index earns its keep.
create index if not exists profiles_gym_id_idx on public.profiles (gym_id);
create index if not exists profiles_gym_role_idx on public.profiles (gym_id, role);


-- ============================================================================
-- 3. invitations — owner adds a member, member claims the account
-- ============================================================================
-- Members never self-register. The owner (who already collects name and phone
-- at the front desk) creates the invitation; the member claims it via a link.
-- This is what stops people joining a gym they never paid for.
create table if not exists public.invitations (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references public.gyms(id) on delete cascade,

  email       text,
  phone       text,
  full_name   text not null default '',

  role        text not null default 'member'
              check (role in ('owner', 'staff', 'member')),

  -- Cryptographically random and unguessable. Generated with
  -- encode(gen_random_bytes(24), 'hex') — never a sequential id, never a uuid
  -- that appears elsewhere in the system.
  token       text not null unique,

  expires_at  timestamptz not null default (now() + interval '7 days'),

  -- Non-null means already used. Single-use is enforced in application code
  -- by checking this is null; see the claim endpoint.
  claimed_at  timestamptz,
  claimed_by  uuid references public.profiles(id) on delete set null,

  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),

  -- An invitation needs at least one way to reach the person.
  constraint invitations_need_a_contact check (
    email is not null or phone is not null
  )
);

create index if not exists invitations_gym_id_idx on public.invitations (gym_id);
-- Lookup by token happens on every claim attempt; `unique` already indexes it.
create index if not exists invitations_open_idx
  on public.invitations (gym_id) where claimed_at is null;


-- ============================================================================
-- 4. membership_plans — what a gym sells
-- ============================================================================
create table if not exists public.membership_plans (
  id            uuid primary key default gen_random_uuid(),
  gym_id        uuid not null references public.gyms(id) on delete cascade,

  name          text not null,                       -- "Monthly", "Quarterly"
  description   text,

  -- MONEY IS AN INTEGER OF PAISE. Never a float.
  -- ₹1,499 is stored as 149900. Floating-point cannot represent 0.1 exactly,
  -- so 0.1 + 0.2 != 0.3 — and money that is off by a fraction of a paisa
  -- compounds into real disputes. Divide by 100 only when displaying.
  price_paise   integer not null check (price_paise >= 0),

  duration_days integer not null check (duration_days > 0),

  is_active     boolean not null default true,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists membership_plans_touch_updated_at on public.membership_plans;
create trigger membership_plans_touch_updated_at
  before update on public.membership_plans
  for each row execute function public.touch_updated_at();

create index if not exists membership_plans_gym_id_idx
  on public.membership_plans (gym_id);


-- ============================================================================
-- 5. memberships — which plan a member is on, and when it lapses
-- ============================================================================
-- `end_date` is what drives the overdue alerts in 0003.
create table if not exists public.memberships (
  id         uuid primary key default gen_random_uuid(),

  -- gym_id is stored here even though it could be reached through member_id.
  -- That redundancy is deliberate: it turns every security rule into a single
  -- column comparison instead of a join. Faster, and much harder to get wrong.
  gym_id     uuid not null references public.gyms(id) on delete cascade,
  member_id  uuid not null references public.profiles(id) on delete cascade,
  plan_id    uuid references public.membership_plans(id) on delete set null,

  start_date date not null default current_date,
  end_date   date not null,

  status     text not null default 'active'
             check (status in ('active', 'expired', 'cancelled')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint memberships_end_after_start check (end_date >= start_date)
);

drop trigger if exists memberships_touch_updated_at on public.memberships;
create trigger memberships_touch_updated_at
  before update on public.memberships
  for each row execute function public.touch_updated_at();

create index if not exists memberships_gym_id_idx on public.memberships (gym_id);
create index if not exists memberships_member_id_idx on public.memberships (member_id);

-- The overdue_members view (0003) scans for active memberships past their
-- end date. This partial index makes that lookup cheap.
create index if not exists memberships_active_expiry_idx
  on public.memberships (gym_id, end_date) where status = 'active';

-- A member may have a history of memberships, but only one active at a time.
create unique index if not exists memberships_one_active_per_member
  on public.memberships (member_id) where status = 'active';


-- ============================================================================
-- 6. payments — the ledger
-- ============================================================================
-- RECORD-ONLY. Members pay the gym directly (cash, UPI to the owner's own QR,
-- card at the desk). This table records that it happened. No payment gateway
-- is involved and no money moves through the platform.
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),

  gym_id        uuid not null references public.gyms(id) on delete cascade,
  member_id     uuid not null references public.profiles(id) on delete cascade,
  membership_id uuid references public.memberships(id) on delete set null,

  amount_paise  integer not null check (amount_paise > 0),
  paid_on       date not null default current_date,

  method        text not null default 'cash'
                check (method in ('cash', 'upi', 'card', 'bank_transfer')),

  -- Which staff member keyed this in. Useful when a figure is disputed.
  recorded_by   uuid references public.profiles(id) on delete set null,
  note          text,

  created_at    timestamptz not null default now()
);

create index if not exists payments_gym_id_idx on public.payments (gym_id);
create index if not exists payments_member_id_idx on public.payments (member_id);
create index if not exists payments_gym_paid_on_idx on public.payments (gym_id, paid_on desc);
