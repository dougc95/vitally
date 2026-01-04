# Body Metrics Tracker (Vitally)

## Overview

A body metrics tracking web application that allows users to log measurements (weight, body fat, circumferences), set monthly goals, and visualize progress over time. The application uses a SQL-on-FHIR-shaped data model for future healthcare interoperability. Built as a single-user MVP with architecture designed for easy multi-user extension.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens (medical tech theme with slate/teal palette)
- **Charts**: Recharts for data visualization and time series
- **Date Handling**: date-fns for formatting and manipulation

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Build**: esbuild for server bundling, Vite for client

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Design**: SQL-on-FHIR shaped tables:
  - `patients` - User/patient records
  - `metrics` - Registry of trackable measurements (weight, waist, etc.)
  - `observations` - Measurement sessions with date
  - `observation_components` - Individual metric values within a session
  - `goals` - Monthly goal definitions
  - `goal_targets` - Target values per metric within a goal

### API Contract
- Shared route definitions in `shared/routes.ts` with Zod schemas
- Type-safe request/response validation
- Endpoints: bootstrap, measurements (CRUD), goals (upsert), timeseries queries

### Key Design Decisions
1. **SQL-on-FHIR Model**: Chose observation/component pattern to enable future FHIR export and healthcare system integration
2. **Single-user MVP**: No auth in v1, but patient ID is threaded through for easy multi-user extension
3. **Metrics Registry**: Predefined metrics with units, directions, and tolerances seeded on startup
4. **Monorepo Structure**: `client/`, `server/`, `shared/` directories with path aliases

## External Dependencies

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Connection pooling with `pg` package
- Schema migrations via `drizzle-kit push`

### Third-Party Services
- None currently (MVP is self-contained)
- Architecture prepared for future integrations: smart scales, wearables, FHIR export

### Key NPM Packages
- `drizzle-orm` + `drizzle-zod`: Database ORM and validation
- `@tanstack/react-query`: Server state management
- `recharts`: Data visualization
- `date-fns`: Date utilities
- `zod`: Schema validation
- Full shadcn/ui component suite via Radix UI primitives