# STRIVA Fitness Platform

STRIVA is a mobile-first fitness and gym-management application with member workouts, nutrition, progress tracking, AI coaching, attendance, billing, and owner analytics. The frontend is an installable PWA and the Express server hosts both the API and production frontend.

## Technology

- React 19, TypeScript, Vite, Tailwind CSS, and Motion
- Express and TypeScript
- Supabase Auth and PostgreSQL
- TanStack Query for server state
- Groq-backed AI coaching and Razorpay billing integrations
- Vite PWA with offline app-shell and image caching

## Local setup

Requirements:

- Node.js 20.19 or newer
- npm 10 or newer
- A Supabase project

Install and configure the project:

```bash
npm ci
cp .env.example .env
cp backend/.env.example backend/.env
```

Fill in the two environment files. Frontend values prefixed with `VITE_` are public and are embedded during the build. Secrets such as `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, and webhook secrets must stay in `backend/.env` only.

Apply the SQL migrations in numerical order from `backend/supabase/migrations/`. This is the only active migration directory; see `supabase/README.md` for details.

Start the frontend and backend together:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend and API: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

## Demo access

The **Explore the demo** button signs into the Supabase account `demo@sweatfix.com`.

1. Create that user in Supabase Auth.
2. Give it only isolated, resettable demo data—never real member data.
3. Set `VITE_DEMO_PASSWORD` before building.
4. Set `VITE_ENABLE_DEMO_MODE=true` only on the demo deployment if mock read-only fallback data is desired.

Because Vite embeds frontend variables at build time, changing `VITE_DEMO_PASSWORD` or another `VITE_` value requires a new build and deployment.

## Quality checks

Run the complete check before every deployment:

```bash
npm run verify
```

This performs frontend type checking, frontend and backend linting, backend security tests, and both production builds.

## Hostinger deployment

Deploy the `demo` branch as a **Node.js application**, not as a static-only site. The Express server serves the generated `dist/` folder and handles SPA route fallbacks.

Use these settings:

- Node version: 20.19 or newer
- Application root: this repository directory
- Install command: `npm ci`
- Build command: `npm run build`
- Start command: `npm start`
- Entry file, if Hostinger asks for one: `backend/dist/server.js`
- Environment: `NODE_ENV=production`
- `APP_URL`: the public HTTPS origin, with no trailing slash
- `CORS_ORIGINS`: the allowed public frontend origin(s), comma-separated
- `PORT`: use the value supplied by Hostinger when it provides one

Add all values from `.env.example` and `backend/.env.example` to Hostinger's environment panel. Do not upload either real `.env` file to GitHub.

For Supabase Auth, add these URLs to the project allowlist:

- `https://YOUR_DOMAIN/auth/callback`
- `http://localhost:5173/auth/callback`

PWA installation and service workers require HTTPS in production. A successful build generates `dist/manifest.webmanifest`, `dist/sw.js`, and the Workbox runtime.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run frontend and backend locally |
| `npm run typecheck` | Check frontend TypeScript |
| `npm run lint` | Check frontend code quality |
| `npm test` | Run backend security tests |
| `npm run build` | Build frontend and backend |
| `npm start` | Run the built production server |
| `npm run verify` | Run the full pre-deployment gate |

## Repository safety

- Production work should merge through reviewed branches.
- The current preview deployment is maintained on `demo`; `main` remains unchanged.
- `.env*` files are ignored except for the two documented example files.
- Organization access is resolved on the server from authenticated membership records; client-supplied role or organization claims are not trusted.
