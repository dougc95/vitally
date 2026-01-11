# AGENTS.md

Guidance for AI coding agents working with this repository.

## Quick Reference

| Command                | Purpose                               |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Start dev server (Express + Vite HMR) |
| `npm run check`        | TypeScript type-check                 |
| `npm run build`        | Production build                      |
| `npm run test`         | Run Vitest tests                      |
| `npm run db:push`      | Push schema changes to PostgreSQL     |
| `docker-compose up -d` | Start local Postgres                  |

## Project Overview

**Vitally** is a full-stack body metrics and health tracking application built with:

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, shadcn/ui (Radix primitives)
- **Backend:** Express.js, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **State:** TanStack React Query
- **Routing:** Wouter (client), Express routes (server)
- **Validation:** Zod schemas (shared between client/server)

## Monorepo Structure

```
├── client/           # React frontend
│   └── src/
│       ├── components/   # UI components (shadcn/ui in /ui)
│       ├── hooks/        # React Query hooks
│       ├── pages/        # Route pages
│       └── lib/          # Utilities
├── server/           # Express backend
│   ├── services/     # Business logic (AI providers, export, import)
│   ├── routes.ts     # API route handlers
│   └── storage.ts    # Database access layer
├── shared/           # Shared code
│   ├── schema.ts     # Drizzle tables + Zod schemas
│   └── routes.ts     # API contract (Zod request/response schemas)
└── migrations/       # Drizzle migrations
```

## Path Aliases

| Alias      | Resolves To        |
| ---------- | ------------------ |
| `@/`       | `client/src/`      |
| `@shared/` | `shared/`          |
| `@assets/` | `attached_assets/` |

## Core Features

1. **Body Metrics Tracking** - Weight, circumferences, body composition
2. **Goal Setting** - Monthly goals with direction (increase/decrease/maintain)
3. **Macro Calculator** - BMR/TDEE calculations with multiple formulas
4. **Habit Tracking** - Daily habits with contribution graph
5. **Nutrition Tracking** - Meal logging with AI image analysis
6. **Recipe Suggestions** - AI-powered recipe generation
7. **Data Import/Export** - CSV import, FHIR export

## Database Schema

### Key Tables

| Table                    | Purpose                                                    |
| ------------------------ | ---------------------------------------------------------- |
| `users`                  | Authentication (email/password or OAuth)                   |
| `patients`               | User profile (1:1 with user), stores heightCm, gender, dob |
| `metrics`                | Global metric registry (code, unit, kind)                  |
| `observations`           | Measurement sessions (effectiveAt = when measured)         |
| `observation_components` | Individual metric values within a session                  |
| `goals`                  | Monthly goals per patient                                  |
| `goal_targets`           | Target values for each metric within a goal                |
| `habits`                 | Habit definitions                                          |
| `habit_entries`          | Daily habit completions                                    |
| `nutrition_goals`        | Daily macro targets                                        |
| `meals`                  | Logged meals                                               |
| `meal_items`             | Food items within meals                                    |
| `ingredients`            | User's ingredient inventory                                |
| `saved_recipes`          | AI-generated saved recipes                                 |

### Important Patterns

- **Patient isolation:** All routes extract user from session, create/fetch patient
- **Metric codes:** Always snake_case (e.g., `body_fat`, `bicep_r`)
- **Dates:** YYYY-MM-DD strings in API, converted in storage layer
- **Timestamps:** `effectiveAt` (when measured) vs `issuedAt` (when recorded)

## API Structure

Routes defined in `server/routes.ts`, contracts in `shared/routes.ts`.

### Authentication

- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/user` - Current user

### Metrics

- `POST /api/bootstrap` - Initial load (patient + metrics)
- `POST /api/measurements` - Create measurement session
- `GET /api/measurements` - List measurements (with date range)
- `GET /api/measurements/latest` - Most recent measurement
- `GET /api/metrics/:code/timeseries` - Single metric history

### Goals

- `GET /api/goals?month=YYYY-MM` - Get monthly goal
- `PUT /api/goals` - Upsert monthly goal
- `GET /api/progress?month=YYYY-MM` - Progress vs goals

### Habits

- `GET /api/habits` - List habits
- `POST /api/habits` - Create habit
- `PUT /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Delete habit
- `POST /api/habits/:id/entries` - Toggle entry

### Nutrition

- `GET /api/nutrition/goals` - Macro targets
- `POST /api/nutrition/goals` - Update targets
- `GET /api/nutrition/meals?date=YYYY-MM-DD` - Meals for date
- `POST /api/nutrition/meals` - Log meal
- `DELETE /api/nutrition/meals/:id` - Delete meal
- `POST /api/nutrition/analyze-image` - AI food analysis

### AI Features

- `POST /api/nutrition/analyze-image` - Food image → macros (OpenAI/Gemini)
- `POST /api/recipes/suggest` - Generate recipes from ingredients (OpenAI/Gemini)
- `POST /api/ingredients/scan` - Scan ingredient images

## Frontend Architecture

### Key Hooks (React Query)

| Hook                   | File               | Purpose                     |
| ---------------------- | ------------------ | --------------------------- |
| `useAuth`              | `use-auth.ts`      | User authentication state   |
| `useBootstrap`         | `use-metrics.ts`   | Initial app data            |
| `useCreateMeasurement` | `use-metrics.ts`   | Create measurement mutation |
| `useLatestMeasurement` | `use-metrics.ts`   | Latest measurement query    |
| `useHabits`            | `use-habits.ts`    | Habit CRUD operations       |
| `useNutritionGoals`    | `use-nutrition.ts` | Macro targets               |
| `useMeals`             | `use-nutrition.ts` | Meal queries/mutations      |

### Route Pages

| Route               | Page Component        | Purpose                     |
| ------------------- | --------------------- | --------------------------- |
| `/`                 | `Dashboard.tsx`       | Overview with metrics cards |
| `/measurements/new` | `NewMeasurement.tsx`  | Log new measurements        |
| `/metrics`          | `MetricsExplorer.tsx` | Browse metric history       |
| `/goals`            | `Goals.tsx`           | Set monthly goals           |
| `/calculator`       | `Calculator.tsx`      | Macro calculator            |
| `/habits`           | `Habits.tsx`          | Habit list                  |
| `/habits/new`       | `CreateHabit.tsx`     | Create habit                |
| `/habits/:id`       | `HabitDetail.tsx`     | Habit detail + calendar     |
| `/nutrition`        | `Nutrition.tsx`       | Daily nutrition dashboard   |
| `/nutrition/log`    | `LogMeal.tsx`         | Log meal with AI            |
| `/import`           | `ImportData.tsx`      | CSV import                  |

## AI Provider Pattern

Located in `server/services/ai-providers/`:

```typescript
// Strategy pattern for AI providers
interface AIImageAnalyzer {
  analyzeImage(base64Image: string, mimeType: string): Promise<AnalysisResult>;
}

// Available providers
- OpenAIProvider (GPT-4o Vision)
- GeminiProvider (Gemini 1.5 Flash)

// Factory selects based on request param or env
getProvider(provider?: "openai" | "gemini"): AIImageAnalyzer
```

## Environment Variables

| Variable                | Required | Purpose                      |
| ----------------------- | -------- | ---------------------------- |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string |
| `SESSION_SECRET`        | Yes      | Express session secret       |
| `OPENAI_API_KEY`        | For AI   | OpenAI API access            |
| `GOOGLE_GEMINI_API_KEY` | For AI   | Gemini API access            |
| `AWS_ACCESS_KEY_ID`     | For S3   | Image uploads                |
| `AWS_SECRET_ACCESS_KEY` | For S3   | Image uploads                |
| `S3_BUCKET`             | For S3   | Bucket name                  |

## Code Conventions

1. **Validation:** Always use Zod schemas from `shared/` for both client/server
2. **Transactions:** Use `db.transaction()` for multi-step writes
3. **Error handling:** Return `{ message, field? }` for validation errors
4. **Query invalidation:** Invalidate related queries after mutations
5. **Type safety:** Use exported types from `shared/schema.ts`
6. **Components:** shadcn/ui pattern - copy to `components/ui/`, customize

## Testing

- Framework: Vitest
- Test files: `*.test.ts` alongside source
- Run: `npm run test` or `npm run test:watch`
- Coverage areas: API routes, import/export services

## Common Tasks

### Adding a New Metric

1. Add to `DEFAULT_METRICS` array in `server/routes.ts`
2. Run app (auto-seeds on startup)
3. Metric available in measurement forms

### Adding a New API Endpoint

1. Define Zod schemas in `shared/routes.ts`
2. Add handler in `server/routes.ts`
3. Create React Query hook in `client/src/hooks/`

### Adding a New Page

1. Create page in `client/src/pages/`
2. Add route in `client/src/App.tsx`
3. Add navigation in `Sidebar.tsx` if needed

### Database Changes

1. Modify tables in `shared/schema.ts`
2. Run `npm run db:push` to sync
3. Update storage methods in `server/storage.ts`

## Known Issues

1. BMI calculation on Dashboard not fully implemented
2. Trend analysis shows placeholder
3. Some metric code mismatches (body-fat vs body_fat)
