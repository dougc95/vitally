# CLAUDE.md - Body Metrics Tracker Context

## Project Overview
A body metrics tracking application (Vitally) built with a SQL-on-FHIR inspired data model. It allows users to log measurements (weight, circumferences, etc.), set monthly goals, and visualize progress.

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Wouter (routing), TanStack Query, Radix UI, Lucide Icons, Recharts.
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL with Drizzle ORM.
- **Schema**: SQL-on-FHIR shaped tables (patients, metrics, observations, goals).

## Key Commands
- `npm run dev`: Start the full-stack development environment.
- `npm run db:push`: Push schema changes to the database.
- `npm run db:push --force`: Force push schema changes if there are conflicts.
- `npm run build`: Build the application for production.

## Coding Standards
- **Schema First**: Define data models in `shared/schema.ts` and API contracts in `shared/routes.ts` before implementing UI or backend logic.
- **API Pattern**: Use the `api` object in `shared/routes.ts` as the single source of truth for endpoints.
- **UI Components**: Use shadcn/ui components from `client/src/components/ui`.
- **Styling**: Tailwind CSS with medical-tech theme (slate/teal). Follow the H S% L% variable format in `index.css`.
- **Test IDs**: Add `data-testid` attributes to interactive and dynamic elements (`action-target` or `type-content` patterns).

## Project Structure
- `client/`: React frontend.
- `server/`: Express backend and storage logic.
- `shared/`: Shared TypeScript types, Zod schemas, and API definitions.
- `attached_assets/`: Original PRDs and project documentation.

## Current Roadmap (from PRD Extensions)
1. **Phase 1**: Authentication (Replit Auth) & Multi-user support, transition to `effective_at` timestamps.
2. **Phase 2**: Data Portability (CSV Import/Export, FHIR JSON export).
3. **Phase 3**: Body Composition (Skinfolds) & AI-driven insights.
