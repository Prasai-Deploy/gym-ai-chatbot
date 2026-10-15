# STRIVA V2 — MASTER PRODUCT SPECIFICATION

## 1. PRODUCT IDENTITY & POSITIONING

- **Product Name**: STRIVA
- **Positioning**: STRIVA is an AI-powered fitness operating system designed for both individual health optimization (Member) and gym management (Gym Owner).
- **Core Visual & Conceptual Identity**: Premium, minimal, futuristic, calm, dark, clear, and human. STRIVA prioritizes speed, action, and progressive disclosure over enterprise dashboard clutter and excessive charts.

### The Intelligence Layer: TRINETRA
- **Definition**: TRINETRA is STRIVA's intelligent health guidance layer. It understands the user's fitness context across training, nutrition, recovery, progress, goals, and history, then turns that understanding into clear actions.
- **Product Identity**: TRINETRA acts as a single, unified intelligence layer ("Three-eye" holistic vision across Training, Health, and Business) connecting the Member experience and Gym Owner experience.
- **Terminology**: TRINETRA replaces all legacy "Trinity" references across product branding, code symbols, prompts, and documentation.

---

## 2. PRODUCT PRINCIPLES

1. **Simplicity over feature density**: Clean interfaces over cluttered KPI walls.
2. **Action over analytics**: Highlight what to do next rather than swamping the user with charts.
3. **Real data over mock data**: Zero tolerance for fake fallbacks or mock data in production code.
4. **One canonical implementation**: Eliminate duplicate pages, routes, and feature variations.
5. **One canonical database schema**: Single version-controlled PostgreSQL migration directory.
6. **Strong tenant isolation**: Multi-tenant boundaries enforced strictly at database (RLS) and server layers.
7. **Security by default**: Fail closed on missing credentials, unverified JWTs, or missing org memberships.
8. **AI assists actions**: TRINETRA drives workflows through validated domain tools, not generic text generation.
9. **Progressive disclosure**: Surface essential details first; disclose deeper metrics on interaction.
10. **Premium visual language**: Near-black surfaces, subtle borders, high visual contrast, restrained accents.
11. **Mobile-first usability**: Frictionless mobile navigation dock and high-contrast touch targets.
12. **Mandatory accessibility**: WCAG AA compliance for high readability under gym lighting conditions.
13. **No unnecessary enterprise complexity**: Avoid multi-layered abstract wrappers and over-engineered enterprise patterns.
14. **No duplicate implementations**: Single design system, single API client, single backend routing tree.
15. **Production-capable completion**: A feature is done only when backend, frontend, database, tests, and security boundaries are fully verified.

---

## 3. MEMBER EXPERIENCE (PERSONAL FITNESS OS)

Primary Navigation: **Home | Coach | Workout | Nutrition | Progress | Profile**

### 3.1 HOME
- **Purpose**: Daily health cockpit answering three core questions:
  1. *How am I doing?* (Recovery, daily streak, macro status)
  2. *What should I do today?* (Today's workout session, nutrition goal)
  3. *What does TRINETRA recommend?* (Action-oriented AI insight)
- **Design Guidelines**: Restrained cards, zero dense KPI walls, single primary action callout.

### 3.2 COACH (TRINETRA)
- **Purpose**: Actionable AI fitness advisor powered by TRINETRA.
- **Capabilities**: Directly inspects member profile, goals, active workout session, nutrition logs, hydration, body metrics, and historical logs. Executes domain tools (e.g., logging workouts or swapping exercises) upon user confirmation.
- **Interface**: Conversation timeline with embedded action cards (e.g., "Log Set", "Accept Workout Modification").

### 3.3 WORKOUT ENGINE
- **Primary Flow**: `Preview` → `Active Workout` → `Rest Interval` → `Session Completion & Summary`.
- **Key Features**:
  - Exercise demonstration, set/rep/weight tracking, RPE (Rate of Perceived Exertion) logging.
  - Automatic 1RM (One-Rep Max) and volume accumulation calculations.
  - Seamless rest timers with subtle visual/vibration alerts.

### 3.4 NUTRITION & HYDRATION
- **Core Metrics**: Daily Calorie Intake vs Target, Protein/Carb/Fat macro distribution, Hydration (ml).
- **Log Workflows**: Quick meal logging, calorie adjustment, single-tap water log (+250ml, +500ml).

### 3.5 PROGRESS
- **Core Metrics**: Strength progression curves (1RM over time), consistency streaks, body composition measurements (weight, body fat %), milestone achievements.
- **Visualization**: Clean, single-trend lines with restrained visual clutter.

### 3.6 PROFILE & SETTINGS
- **Primary Options**: Personal details, fitness goals, dietary preferences, connected health integrations (Apple Health, Google Fit), subscription tier (Free, Pro, Elite), security settings (password, OAuth, sessions).

---

## 4. GYM OWNER EXPERIENCE (FITNESS BUSINESS OS)

Core Operational Principle: **STATE → ATTENTION → ACTION**

### 4.1 OWNER HOME
- **Focus**: Instant snapshot of gym health and required manager actions.
- **Key Displays**: Active occupancy, today's revenue, members needing attention (at risk of churn or pending payments), TRINETRA business advisor recommendations.

### 4.2 MEMBERS DIRECTORY
- **Focus**: Fast searching, status filtering (Active, Paused, Expired, At-Risk), progressive disclosure member drawer (attendance history, subscription status, assigned trainer).

### 4.3 ATTENDANCE & ACCESS
- **Focus**: Today's check-ins count, expected peak attendance hours, live turnstile/QR code check-in workflow, manual check-in override.

### 4.4 TRAINER MANAGEMENT
- **Focus**: Active trainers roster, client assignment capacity, pending client check-ins, performance stats.

### 4.5 BILLING & REVENUE
- **Focus**: Monthly Recurring Revenue (MRR), pending invoices, upcoming renewals, failed payment retries, plan management.

---

## 5. OUT OF SCOPE FOR INITIAL MVP

To ensure rapid, production-ready execution, the following features are explicitly **DEFERRED**:
- Social community feeds, public leaderboards, and user-to-user messaging.
- Computer vision form correction or automatic camera-based food recognition.
- AI voice trainers or animated 3D avatars.
- Franchise management, multi-branch white-labeling, or complex BI custom report builders.
- Trainer-to-client marketplace or external ecommerce store.

---

## 6. DEFINITION OF DONE (DoD)

A feature is strictly defined as **DONE** only when all of the following conditions are met:
1. **Frontend**: Clean UI built using the unified Design System, complete with Loading, Empty, and Error states. Responsive on mobile and accessible (WCAG AA).
2. **Backend**: Modular Express controller, service, repository, and Zod validation schema.
3. **Database**: Migration file in `backend/supabase/migrations/` with appropriate PostgreSQL indexes and RLS policies.
4. **Security**: Server-side tenant isolation and RBAC role authorization verified. Zero reliance on client-supplied tenant headers.
5. **Real Data**: End-to-end integration with PostgreSQL/Supabase. **Zero mock fallback logic**.
6. **Tests**: Automated unit/security test coverage passing in Vitest suite.
7. **Documentation**: OpenAPI/Swagger contract documented in spec.
