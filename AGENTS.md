# AGENTS.md

Guidance for AI coding agents working on **Vitally**, a full-stack body metrics tracker.

**Stack:** React 18 + TypeScript + Vite (frontend), Express + TypeScript (backend), PostgreSQL + Drizzle ORM, Zod validation, TanStack React Query, Wouter routing, TailwindCSS + shadcn/ui.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server (Express + Vite HMR) |
| `npm run check` | TypeScript type-check (strict mode) |
| `npm run build` | Production build |
| `npm run test` | Run all Vitest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npx vitest run path/to/file.test.ts` | Run a single test file |
| `npx vitest run -t "test name"` | Run a single test by name |
| `npm run db:push` | Push Drizzle schema changes to PostgreSQL |
| `npm run db:generate` | Generate Drizzle migration files |

Tests are colocated with source (`*.test.ts` alongside the module). Vitest runs with `globals: true` and `fileParallelism: false`. Tests use `supertest` for route testing and `vi.mock()` for dependency isolation.

## Project Structure

```
client/src/           # React frontend
  components/         # Named-export components (shadcn/ui primitives in /ui)
  hooks/              # React Query hooks (use-*.ts)
  pages/              # Route pages (default-export)
  lib/                # Utilities (cn(), queryClient)
server/               # Express backend
  services/           # Business logic (AI providers, import/export)
  routes.ts           # API route handlers
  storage.ts          # Database access layer (IStorage interface)
  auth.ts             # Authentication (Passport, sessions)
  errors.ts           # Custom error classes (AuthenticationError, UnauthorizedError)
shared/               # Shared between client & server
  schema.ts           # Drizzle tables + Zod schemas + exported types
  routes.ts           # API contract (Zod request/response schemas, path constants)
  types/              # Pure TS interfaces (FHIR, import/export)
  models/             # Auth table definitions
migrations/           # Drizzle migration files
```

### Path Aliases

| Alias | Resolves To |
|---|---|
| `@/` | `client/src/` |
| `@shared/` | `shared/` |
| `@assets/` | `attached_assets/` |

## Code Style

### Formatting

- **2-space indentation**, no tabs
- **Double quotes** for all strings and imports
- **Semicolons** at the end of every statement
- **Trailing commas** in multi-line argument lists and object literals
- **ESM** throughout (`"type": "module"` in package.json) — use `import`/`export`, never `require`
- No ESLint or Prettier configured; follow existing patterns

### Import Order

1. Type-only imports (`import type { Express } from "express";`)
2. React/framework imports (`useState`, `useEffect`)
3. Third-party libraries (`zod`, `date-fns`, `wouter`)
4. Shared alias imports (`@shared/schema`, `@shared/routes`)
5. Client alias imports (`@/hooks/...`, `@/components/...`, `@/lib/...`)
6. Relative imports (`./storage`, `./types`)

Separate `import type` from value imports. Group related imports together.

### Naming Conventions

| Kind | Convention | Examples |
|---|---|---|
| Page files | PascalCase | `Dashboard.tsx`, `NewMeasurement.tsx` |
| Component files | PascalCase | `MetricCard.tsx`, `PageLayout.tsx` |
| Hook files | kebab-case, `use-` prefix | `use-metrics.ts`, `use-habits.ts` |
| Server/service files | kebab-case | `import-parser.ts`, `export-fhir.ts` |
| Test files | colocated `.test.ts` suffix | `import-parser.test.ts` |
| Variables/functions | camelCase | `getOrCreatePatient`, `isLoading` |
| Components/classes | PascalCase | `MetricCard`, `DatabaseStorage` |
| Types/interfaces | PascalCase | `Patient`, `CreateMealRequest` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_METRICS`, `SALT_ROUNDS` |
| Metric codes | snake_case | `body_fat`, `bicep_r`, `thigh_l` |
| DB columns (SQL) | snake_case | `patient_id`, `effective_at` |
| DB columns (TS) | camelCase | `patientId`, `effectiveAt` |

### React Components

- Always use **`function` declarations**, not arrow functions
- **Pages:** `export default function PageName() { ... }`
- **Components:** `export function ComponentName() { ... }` (named export, no default)
- **Props:** define `interface FooProps { ... }` above the component, destructure in signature
- **Barrel files:** component directories use `index.ts` with named re-exports
- **Styling:** Tailwind utility classes, combine with `cn()` from `@/lib/utils`

### React Query Hooks

- One file per domain, multiple named exports per file
- Query keys use `api.domain.action.path` from the shared contract
- All fetches include `credentials: "include"` for session auth
- Mutations call `queryClient.invalidateQueries()` on success with related query keys
- Types inferred via `z.infer<typeof schema>` or imported from `@shared/schema`

### Type Definitions

- **Table select types:** `export type Patient = typeof patients.$inferSelect;`
- **Zod-inferred request types:** `export type CreateMealRequest = z.infer<typeof createMealSchema>;`
- **Props/contracts:** use `interface` (`interface IStorage`, `interface MetricCardProps`)
- **Simple aliases/unions:** use `type` (`type AIProviderType = "openai" | "gemini"`)
- All shared types live in `shared/schema.ts` or `shared/types/`

### Error Handling

**Server routes** — validate with Zod, catch and return structured errors:
```typescript
try {
  const input = someSchema.parse(req.body);
  // ... business logic ...
} catch (err) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
  }
  throw err; // Let Express handle unexpected errors
}
```

**Client hooks** — check `res.ok`, throw with message:
```typescript
if (!res.ok) {
  const error = await res.json();
  throw new Error(error.message || "Failed to ...");
}
```

**Error response shape** is always `{ message: string, field?: string }`.

## Database Patterns

- Schema defined in `shared/schema.ts` using Drizzle `pgTable()` — run `npm run db:push` after changes
- Data access through `server/storage.ts` — `IStorage` interface, `DatabaseStorage` implementation, singleton `export const storage`
- Use `db.transaction()` for multi-step writes (e.g., observation + components)
- **Patient isolation:** all routes extract user from session, then `getOrCreatePatient()` to get the patient; storage methods verify ownership via `verifyOwnership()`
- **Dates:** `YYYY-MM-DD` strings in the API layer, converted in storage
- **Timestamps:** `effectiveAt` = when measured, `issuedAt` = when recorded

## Common Tasks

**Add a new metric:** Add to `DEFAULT_METRICS` array in `server/routes.ts` — auto-seeded on startup.

**Add an API endpoint:** (1) Define Zod schemas in `shared/routes.ts`, (2) add handler in `server/routes.ts`, (3) create React Query hook in `client/src/hooks/`.

**Add a page:** (1) Create in `client/src/pages/`, (2) add route in `client/src/App.tsx`, (3) add nav link in `Sidebar.tsx`.

**Database changes:** (1) Modify tables in `shared/schema.ts`, (2) run `npm run db:push`, (3) update storage methods in `server/storage.ts`.
