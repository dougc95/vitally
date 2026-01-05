# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

**Development:**
```bash
npm run dev          # Start development server (Express + Vite HMR)
npm run check        # Type-check TypeScript without building
npm run build        # Build for production (frontend + backend)
npm start            # Run production build
```

**Database:**
```bash
npm run db:push      # Push schema changes to PostgreSQL (no migrations)
```

**Docker (Local DB):**
```bash
docker-compose up -d # Start Postgres database in background
docker-compose down  # Stop database
```

**Environment Setup:**
- Requires `DATABASE_URL` environment variable for PostgreSQL connection
- Uses Replit Auth integration (requires Replit environment)

## Architecture Overview

### Project Structure

**Monorepo Layout:**
- `client/` - React frontend (Vite bundler)
- `server/` - Express backend
- `shared/` - Shared types, schemas, and API contracts between client/server

**Path Aliases (tsconfig.json + vite.config.ts):**
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

### Authentication Flow

**Replit Auth Integration:**
- Implementation in `server/replit_integrations/auth.ts`
- Exports: `setupAuth()`, `registerAuthRoutes()`, `isAuthenticated` middleware
- Session storage: PostgreSQL `sessions` table (connect-pg-simple)
- User data: PostgreSQL `users` table (id, email, firstName, lastName, profileImageUrl)

**Patient Auto-Creation:**
- Each authenticated user gets an auto-created `Patient` record (1:1 mapping)
- Pattern used in all API routes: `getOrCreatePatient(req)` extracts `req.user.claims.sub` and creates patient if missing
- Default height: 175cm, displayName from `req.user.claims.first_name`

**Client-side Auth:**
- `client/src/hooks/use-auth.ts` - Fetches user via `/api/auth/user` (5 min cache)
- `client/src/lib/auth-utils.ts` - Helper: `redirectToLogin()`, `isUnauthorizedError()`

### Database Schema (Drizzle ORM)

**Key Tables:**

1. **`metrics` (Global Registry)**
   - PK: `code` (text) - e.g., 'weight', 'waist', 'body_fat'
   - Seeded with 10 default metrics on server startup
   - Fields: displayName, unit (UCUM), kind (weight|circumference|composition), defaultDirection, defaultTolerance

2. **`observations` (Measurement Sessions)**
   - One observation = one measurement session (e.g., "morning weigh-in")
   - FK: `patientId` → patients.id
   - `effectiveAt` (timestamp) - WHEN measurement was taken (user-specified date)
   - `issuedAt` (timestamp) - WHEN recorded in system (auto)
   - Fields: status, category, code, note, sessionTag, source

3. **`observationComponents` (Individual Metric Values)**
   - One component = one metric value within a session
   - FK: `observationId` → observations.id, `metricCode` → metrics.code
   - Fields: value (real), unit (UCUM)

4. **`goals` + `goalTargets` (Monthly Goals)**
   - One goal per patient per month (monthStart = YYYY-MM-01)
   - Each goal has multiple targets (one per metric)
   - Fields: targetValue, direction (increase|decrease|maintain), tolerance

**Relations (Drizzle):**
- Use `db.query.observations.findMany({ with: { components: { with: { metric: true } } } })` for nested fetches
- Composite types: `ObservationWithComponents`, `GoalWithTargets`

**Schema Location:** `shared/schema.ts` (also exports Zod schemas for validation)

### API Routes Contract

**Defined in:** `shared/routes.ts` (Zod schemas) + `server/routes.ts` (handlers)

**Key Endpoints:**
- `POST /api/bootstrap` - Get patient + metrics registry (initial app load)
- `POST /api/measurements` - Create measurement session with metrics object
- `GET /api/measurements/latest` - Most recent observation with components
- `GET /api/measurements?from=YYYY-MM-DD&to=YYYY-MM-DD` - Date range query
- `GET /api/metrics/:code/timeseries?from&to` - Single metric history
- `GET /api/goals?month=YYYY-MM` - Get monthly goal with targets
- `PUT /api/goals` - Upsert monthly goal (deletes old targets, creates new)
- `GET /api/progress?month=YYYY-MM` - Calculate progress vs goals

**Validation:**
- All endpoints use Zod schemas from `shared/routes.ts` (e.g., `api.measurements.create.input.parse()`)
- Errors return 400 with `{ message, field? }`
- All endpoints require `isAuthenticated` middleware

### Data Flow Pattern

**Creating a Measurement:**
```
Client Form Submit (NewMeasurement.tsx)
  ↓
useCreateMeasurement() mutation
  ↓
POST /api/measurements { date, metrics: { "weight": 75.5, "waist": 85 }, note? }
  ↓
[Server] Validate metric codes against metrics table
  ↓
storage.createMeasurement() - DatabaseStorage class
  ↓
[Database Transaction]
  1. INSERT observation (effectiveAt = user date)
  2. FOR EACH metric: INSERT observationComponent
  3. RETURN { observationId, count }
  ↓
[Client] React Query invalidates:
  - api.measurements.latest
  - api.measurements.list
  - api.metrics.timeseries
  - api.goals.progress
```

### Storage Layer

**Location:** `server/storage.ts`

**Pattern:**
- `IStorage` interface defines all data operations
- `DatabaseStorage` class implements interface
- Singleton instance: `export const storage = new DatabaseStorage()`

**Key Methods:**
- `createMeasurement()` - Transaction: creates observation + components atomically
- `getObservations()` - Joins observations with components and metrics (nested query)
- `upsertGoal()` - Transaction: delete old targets, insert new ones
- `getLatestMetricValueInMonth()` - Used for progress calculation

**Transactions:**
- Use `db.transaction(async (tx) => { ... })` for multi-step operations
- Example: measurement creation (observation + N components), goal upsert (delete + inserts)

### Frontend Architecture

**Routing (Wouter):**
- `client/src/App.tsx` - Main router with `<Switch>` and `<Route>`
- Routes: `/` (Dashboard), `/measurements/new`, `/metrics`, `/goals`
- Navigation: `useLocation()` hook, `navigate()` function

**State Management:**
- React Query for server state (5 min cache, automatic refetch)
- Local component state for UI (forms, dialogs, month pickers)

**Key Hooks:**
- `client/src/hooks/use-metrics.ts` - All measurement-related queries/mutations
  - `useBootstrap()`, `useCreateMeasurement()`, `useLatestMeasurement()`, etc.
- `client/src/hooks/use-auth.ts` - User authentication state

**UI Components:**
- `client/src/components/ui/` - Radix UI + Tailwind (shadcn pattern)
- `client/src/components/` - App-specific (PageLayout, MetricCard, QuickAction, Sidebar)

### Important Conventions

1. **Metric Codes:** Always snake_case (e.g., `body_fat`, `bicep_r`, `thigh_l`)
2. **Dates:** YYYY-MM-DD format (string) for API, converted to Date objects in storage layer
3. **Timestamps:** `effectiveAt` (when measured) vs `issuedAt` (when recorded)
4. **Patient Isolation:** All routes extract `req.user.claims.sub` and fetch/create patient automatically
5. **Validation:** Zod schemas in `shared/` used for both client and server
6. **Transactions:** Always use transactions for multi-step writes (measurements, goals)
7. **Progress Calculation:** Direction-aware (increase/decrease/maintain) with tolerance range

### Database Migration Notes

- Uses Drizzle Kit with `db:push` (schema sync, no migration files)
- Schema defined in `shared/schema.ts`
- Config: `drizzle.config.ts` (requires `DATABASE_URL`)
- Seed data: `DEFAULT_METRICS` array in `server/routes.ts` (seeded on startup with `onConflictDoUpdate`)

### Build Process

**Development:**
- `npm run dev` starts Express server with Vite middleware (`server/vite.ts`)
- Vite HMR for frontend, tsx watch for backend
- Backend runs on port from env, frontend proxied through Express

**Production:**
- `npm run build` → `script/build.ts`
  - Builds frontend (Vite) to `dist/public/`
  - Bundles backend (esbuild) to `dist/index.cjs`
- `npm start` → runs `dist/index.cjs` with static file serving (`server/static.ts`)

### Known Issues / Missing Features

1. **Missing Auth File:** `server/replit_integrations/auth.ts` is referenced but not in repo
2. **BMI Calculation:** Dashboard shows BMI card but formula not implemented
3. **Trend Analysis:** Dashboard TODO at line 64 ("calculate real trend")
4. **Metric Code Mismatch:** Progress endpoint may reference `body-fat` instead of `body_fat`
