# Database setup

Step-by-step. Assumes no prior database experience. Total time ~30 minutes.

> **Before you start:** the credentials in the old `striva.env` are compromised
> and must not be reused. This guide creates a brand-new Supabase project, which
> is the cleanest way to retire them.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. **Region: Mumbai (ap-south-1).** Your users are in India — this is the single
   biggest latency win available and it cannot be changed later.
3. Set a strong database password. **Save it in a password manager, not a file.**
4. Wait ~2 minutes for provisioning.

---

## 2. Run the migrations

Open **SQL Editor** in the Supabase dashboard. Run each file **in order**, one
at a time, pasting the contents and clicking *Run*:

| # | File | What it creates |
|---|---|---|
| 1 | `0001_tenancy_and_money.sql` | gyms, profiles, invitations, plans, memberships, payments |
| 2 | `0002_rls_core.sql` | The security rules. **The most important file here.** |
| 3 | `0003_triggers_views.sql` | Auto-create profile on signup; overdue/expiring views |
| 4 | `0004_attendance.sql` | QR codes, check-ins, streak calculation |
| 5 | `0005_engagement.sql` | Events, RSVPs, challenges, notifications |
| 6 | `0006_leaderboard.sql` | Opt-in leaderboard functions |
| 7 | `0007_push.sql` | Web push subscriptions |

**Order matters.** Later files reference tables and functions from earlier ones.

You only need 1–3 to have a working product. Files 4–7 add engagement features
and can wait until the core works.

All seven are safe to run more than once — they drop and recreate policies and
triggers rather than failing on "already exists". You will re-run them while
learning, and that's fine.

**Requires PostgreSQL 15 or newer** (for `security_invoker` on views). Every
Supabase project created today qualifies.

---

## 3. Create your first gym and owner

The schema deliberately has **no INSERT policy on `gyms`** — a logged-in member
must not be able to spawn gyms. So the first one is created by you, by hand.

**a. Create the auth user.** Dashboard → **Authentication** → **Users** →
*Add user* → enter your email and a password. Tick *Auto Confirm User*.

The trigger from `0003` automatically creates a matching `profiles` row with
`role = 'member'` and `gym_id = null`.

**b. Create the gym and promote yourself.** SQL Editor:

```sql
-- Replace the email with the one you just registered.
with new_gym as (
  insert into public.gyms (name, slug, primary_color, city, phone)
  values ('Iron Paradise Gym', 'iron-paradise', '#F97316', 'Kolkata', '+919000000000')
  returning id
)
update public.profiles p
   set gym_id = (select id from new_gym),
       role   = 'owner',
       full_name = 'Your Name'
 where p.email = 'you@example.com';
```

Both statements run in one transaction, so you can never end up with a gym that
has no owner or an owner with no gym.

**c. Create the check-in QR code:**

```sql
insert into public.gym_qr_codes (gym_id, code, kind)
select id, encode(gen_random_bytes(16), 'hex'), 'static'
from public.gyms where slug = 'iron-paradise'
returning code;
```

Copy the `code` it returns. The sticker you print encodes:

```
https://yourapp.com/checkin?c=<that code>
```

Members scan it with their **phone's normal camera** — no in-app scanner needed.

**d. Add a membership plan:**

```sql
insert into public.membership_plans (gym_id, name, price_paise, duration_days)
select id, 'Monthly', 150000, 30 from public.gyms where slug = 'iron-paradise';
```

`150000` paise = ₹1,500. **Money is always an integer of paise** — never a
decimal. Floating-point cannot represent `0.1` exactly, and money that drifts by
fractions of a paisa turns into real disputes.

---

## 4. Wire up the environment variables

Dashboard → **Settings** → **API**. You need three values.

**`.env`** in the project root — this file is compiled into your JavaScript and
is **publicly readable by anyone**:

```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon / public key>
```

**`backend/.env`** — this never leaves the server:

```
NODE_ENV=development
PORT=5000
SUPABASE_URL=https://<your-ref>.supabase.co
SUPABASE_ANON_KEY=<the anon / public key>
SUPABASE_SERVICE_ROLE_KEY=<the service_role key>
```

### The one rule that prevents the worst mistake

> **Anything named `VITE_…` ends up in the browser. Everything else stays on the
> server.**

The `service_role` key bypasses every security rule in `0002`. If it ever
reaches the frontend, anyone who opens DevTools has full read/write access to
every gym's data. It belongs **only** in `backend/.env`.

Confirm both files are ignored by git:

```bash
git check-ignore -v .env backend/.env
```

That must print a match for each. If it prints nothing, stop and fix
`.gitignore` before committing anything.

---

## 5. Verify the security rules actually work

This is the step people skip. Don't — it's the difference between believing
you're secure and knowing it.

Create a **second** gym with its own owner and member (repeat step 3). Then:

```sql
-- Run as the service role (SQL Editor default): you see everything.
select gym_id, count(*) from public.payments group by gym_id;
```

Now sign in to your app as Gym A's member and call the same query through the
Supabase client. You should see **only Gym A's rows** — the database filtered
them, not your code.

Then try each of these. Every one must fail:

```sql
-- 1. Invalid role — the CHECK constraint must reject this.
update public.profiles set role = 'admin' where id = auth.uid();

-- 2. Self-promotion — the column grant must reject this.
update public.profiles set role = 'owner' where id = auth.uid();

-- 3. Invalid brand colour — the CHECK constraint must reject this.
update public.gyms set primary_color = 'blue' where id = ...;

-- 4. Reading another member's streak — the function must raise 42501.
select * from public.member_streak('<another members uuid>');
```

If any of those **succeed**, something in `0002` didn't apply. Re-run it and
check the SQL Editor output for errors.

---

## Common problems

**"relation auth.users does not exist"** — you're running the SQL somewhere
other than the Supabase SQL Editor. `auth.users` is Supabase's own table.

**A new signup gets no profile row** — the `on_auth_user_created` trigger from
`0003` didn't install. Re-run `0003` and check for errors.

**Every query returns zero rows** — this is RLS working correctly on a user
whose `profiles.gym_id` is still `null`. Check with:
```sql
select id, email, role, gym_id from public.profiles;
```

**"permission denied for table profiles" on update** — expected if you're
trying to write `role` or `gym_id`. Those columns are intentionally unwritable
except via the service-role key. See the column-grant block in `0002`.

---

## What is deliberately *not* here

- **Online payments.** `payments` is a record-only ledger; members pay the gym
  directly by cash/UPI/card and staff record it. No gateway, no webhooks, no
  money moving through the platform.
- **Self-registration.** Members are created by the owner and claim their
  account via an invitation token, so nobody joins a gym they didn't pay for.
- **Multi-gym membership.** One person belongs to exactly one gym, which is why
  every security rule is a single column comparison.
