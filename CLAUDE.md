# Project Development Guidelines for Claude

## Build Commands
- Install dependencies: `bun install`
- Start entire app: `bun run start`
- Start backend only: `bun run start:backend`
- Start frontend only: `bun run start:frontend`
- Development mode: `bun run dev`
- Build frontend: `bun run build:frontend`
- Run database migrations: `bun run migrate:db`
- Run tests: `bun run test`
- Run single test: `bun --env-file=../backend/env playwright test [test-file-path]`

## Code Style
- TypeScript with strict types
- React components use PascalCase
- Functions/variables use camelCase
- File naming: kebab-case.ts or PascalCase.tsx for components
- Zod for validation and schema definitions
- Error handling with typed errors using Zod validation errors
- Use monorepo structure with packages in `packages/`
- Prefer absolute imports using path aliases
- Use Mantine UI components for all UI elements - don't use Tailwind classes
- Mantine for styling, layout, and component structure

## Project Structure
- Backend: Koa-based API in `packages/backend`
- Frontend: Next.js app with Mantine UI in `packages/frontend`
- E2E tests: Playwright tests in `packages/e2e`
- Shared code: Common types in `packages/shared`
- PostgreSQL v15+ for database
- The whole database structure can be found in `database-structure.sql`. Do not look at `packages/db/**.sql` to get information about the database structure.