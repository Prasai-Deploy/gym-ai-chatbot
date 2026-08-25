-- ============================================================================
-- 0007 — Web push subscriptions
-- ============================================================================
-- Build this LAST. Push is the fiddliest and least reliable channel, and the
-- in-app notification feed from 0005 must work on its own first.
--
-- Two limits worth designing around rather than discovering later:
--
--  * On iPhone, web push only works if the member has added the app to their
--    home screen (iOS 16.4+). In a plain Safari tab there is no push at all,
--    and no reliable way to detect that. Expect a meaningful share of members
--    never to receive one.
--
--  * Push is best-effort, never guaranteed. A "gym closed today" notice must
--    ALSO be a banner in the app, driven by the notifications table. In-app is
--    the reliable channel; push is the accelerator.
-- ============================================================================

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),

  member_id  uuid not null references public.profiles(id) on delete cascade,
  gym_id     uuid not null references public.gyms(id) on delete cascade,

  -- The three fields the Web Push API hands you from
  -- registration.pushManager.subscribe(). `endpoint` is a unique per-device
  -- URL at the browser vendor's push service.
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,

  -- Helps identify a stale row when debugging ("that's their old phone").
  user_agent text,

  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- ONE ROW PER DEVICE, not per member — people use a phone and a laptop, and
-- a member who reinstalls gets a new endpoint. Broadcasting means selecting
-- every subscription for the gym, not one per member.
create index if not exists push_subscriptions_member_idx
  on public.push_subscriptions (member_id);

create index if not exists push_subscriptions_gym_idx
  on public.push_subscriptions (gym_id);


-- ============================================================================
-- Pruning dead subscriptions
-- ============================================================================
-- When a push send returns HTTP 410 Gone, the browser is telling you that
-- subscription is permanently dead — the user cleared site data, uninstalled,
-- or revoked permission. DELETE THE ROW.
--
-- Not pruning is how a push queue rots: every broadcast slows down as it
-- retries hundreds of endpoints that will never accept another message.
create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

revoke execute on function public.delete_push_subscription(text) from public, anon, authenticated;

comment on function public.delete_push_subscription(text) is
  'Called by the backend when a push send returns HTTP 410 Gone. Service-role only.';


-- ============================================================================
-- Row Level Security
-- ============================================================================
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public' and tablename = 'push_subscriptions'
  loop
    execute format('drop policy if exists %I on %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table public.push_subscriptions enable row level security;

-- A member registers and removes their own devices. Nobody can read anyone
-- else's subscription: the endpoint URL is effectively a capability — holding
-- it lets you send that device a notification.
create policy "member manages own push subscriptions" on public.push_subscriptions
  for all using (member_id = auth.uid())
  with check (
    member_id = auth.uid()
    and gym_id = (select public.current_gym_id())
  );

-- NOTE: staff get no read policy here, deliberately. Sending a broadcast is a
-- server-side job using the service-role key, which bypasses RLS. There is no
-- reason for a human to ever look at these rows.
