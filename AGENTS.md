
# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lunary is an LLM observability and development platform providing conversation tracking, analytics, debugging, prompt management, and evaluation tools. It's a self-hostable toolkit that integrates with major LLM providers.

## Documentation

- Internal docs now live in the `ops` submodule under `ops/docs/`. Update and commit documentation changes from inside that submodule.

## Assumptions

- Assume the local environment is already provisioned (database running, env vars set) and you have full access mode in this workspace.
- In practice, you typically only need to run `bun run dev:llm` to start everything for local development.

## Essential Commands

**Development:**
- `bun run dev:llm` - Start all services (frontend + backend). In most cases, this single command is enough to boot the app locally.
- `bun run start` - Production mode
- `bun run migrate:db` - Run database migrations
- `bun run test` - Run e2e tests with Playwright

**Individual Services:**
- `bun run start:backend` - Backend only
- `bun run start:frontend` - Frontend only  
- `bun run dev:realtime-evaluators` - Realtime evaluators in watch mode

**Maintenance:**
- `bun run clean` - Clean all node_modules and build artifacts

## Critical Rules

**Package Manager:** This repository exclusively uses `bun`. Never use `npm`, `pnpm`, or `yarn`.

**Database Migrations:** Migration files must not rely on implicit transactions—write them as plain SQL statements executed sequentially (no `BEGIN`/`COMMIT`, `DO $$` blocks, etc.).

## Architecture

**Monorepo Structure (Bun workspaces):**

- **`packages/backend/`** - Koa.js API server with PostgreSQL
- **`packages/frontend/`** - Next.js 15 + React 19 dashboard
- **`packages/shared/`** - TypeScript types and utilities
- **`packages/db/`** - 96 sequential PostgreSQL migrations
- **`packages/tests/`** - Centralized test suite (Bun unit/integration, Playwright, SDK)
- **`packages/python-sdk/`** - Python SDK with Poetry
- **`packages/tokenizer/`** - Token counting service

## Tech Stack

- **Runtime:** Bun
- **Backend:** Koa.js, PostgreSQL 15+, TypeScript
- **Frontend:** Next.js 15, React 19, Mantine UI, Tailwind CSS
- **Testing:** Playwright
- **Authentication:** JWT, Google/GitHub OAuth, SAML

## Database Requirements

PostgreSQL version 15+ is required. Run migrations with `bun run migrate:db` before development.

## Environment Setup

Backend requires: `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `API_URL`
Frontend requires: `API_URL`, `NEXT_PUBLIC_API_URL`

## Frontend Data Hook Conventions

- All project-scoped requests go through helpers in `packages/frontend/utils/dataHooks/index.ts`: `generateKey` appends the active `projectId`, while `useProjectSWR`/`useProjectMutation` wrap SWR so GETs and mutations inherit project context and standard loading state.
- Fetch hooks import `useProjectSWR`, return shape-tailored data (often defaulting to `[]`/`null`), and validate when needed with shared Zod schemas (see `prompts.ts`, `playground-endpoints.ts`).
- Mutations call `useProjectMutation` with the appropriate `fetcher` verb (`post`, `patch`, `put`, `delete`) and expose the returned `trigger` under descriptive names like `create`, `update`, or `remove`, wiring cache refreshes through `onSuccess`, `optimisticData`, or direct `mutate`.
- When SWR Mutation is insufficient (e.g., custom DELETE flows), build the URL with `generateKey`, call the shared `fetcher` directly, and manually revalidate relevant caches.
- All HTTP verbs ultimately use `packages/frontend/utils/fetcher.ts`, which prefixes `/v1`, attaches bearer auth, enforces consistent JSON payloads (`{ arg: ... }`), and centralizes error handling / sign-out logic.
- UI components must never import `fetcher` directly; always wrap API calls in an existing or new data hook under `packages/frontend/utils/dataHooks/` so project scoping and caching behave consistently.

## File Naming

- Create every new file using kebab-case (e.g., `new-feature.ts`, `user-profile.test.ts`).

## Development Workflow
1. Fast path: `bun run dev:llm` (usually all you need).
2. If your DB is fresh or after pulling new migrations: `bun run migrate:db`, then `bun run dev:llm`.

Dashboard: `http://localhost:8080`
API: `http://localhost:3333`

## Playwright MCP

- Purpose: Use the Playwright MCP to drive the local UI to quickly verify changes end‑to‑end, understand flows, and capture evidence (screenshots/logs). Prefer MCP over manual clicking for repeatable checks.

- When to use:
  - Smoke-test that the app boots, auth works, and key screens render.
  - Validate a feature you just touched (e.g., prompt playground runs and returns).
  - Reproduce or understand a bug by scripting the exact user path.

- Prerequisites:
  - Start the stack: `bun run dev:llm`.
  - Ensure `.env` points to local URLs (default): `APP_URL=http://localhost:8080`, `API_URL=http://localhost:3333`.
  - Use the `LUNARY_EMAIL` secret for the email/username field whenever a Lunary login flow is automated.
  - Use the `LUNARY_PASSWORD` secret for the password field in the same flows.
  - Retrieve both secrets in `~/.codex/.secrets`


- Common recipes (selectors prefer `data-testid`):
  - Open dashboard: navigate to `${APP_URL}`.
  - Log in:
    - Navigate to `${APP_URL}/login`.
    - Fill email/password fields.
    - Click `[data-testid="continue-button"]` and wait for `[data-testid="account-sidebar-item"]` or a visible dashboard element.

- Tips:
  - Prefer role/text selectors or `data-testid` over brittle CSS.
  - Always `wait_for` the next screen’s stable text/testid to avoid flakiness.
  - If you hit auth or 401s, confirm tokens/expiry and that the backend is reachable at `API_URL`.
  - If DB errors occur, run `bun run migrate:db` and retry.

## Commit Flow
- Branch off `main` using a conventional-commit style prefix converted for branch syntax: replace the colon with `/` and spaces with hyphens. Example: `feat: add feature X` -> `feat/add-feature-X`.
- Add a scope when appropriated: `feat(python-sdk): add support for XX` `feat/python-sdk/add-support-for-XX`.
- The commits on the branch don't need to follow conventional-commit, as we'll squash and merge the branch to main the Github Pull Request.

## Tests
- Use `bun run test` to run tests after each code change.
- Before running the Playwright suite, start the full stack with `bun run dev:llm` (spawns backend + frontend + dependencies). The tests expect all services to be reachable.

## Updating Models & Pricing
- **Cost mapping only:** Create the next sequential migration in `packages/db/` (e.g. `packages/db/0107.sql`) inserting a `model_mapping` row. Provide the public `name`, a regex `pattern` covering all billable aliases, `unit` (`TOKENS` for chat models), per-million `input_cost`/`output_cost`, and the correct `provider`/`tokenizer`. Include optional columns (like `input_caching_cost_reduction`) when relevant and avoid wrapping statements in transactions.
- **Prompt playground exposure:** Append the model to the `MODELS` array in `packages/shared/models.ts`. Use the API-facing model identifier for `id`, a human-readable label for `name`, and keep it grouped with models from the same provider so the playground dropdown stays organized.
- **After either change:** Run `bun run migrate:db` to apply new pricing data locally, then reload the prompt playground (if model entries were added) to confirm selection and end-to-end execution succeed.

## OpenAPI Documentation
- The backend exposes its OpenAPI 3 spec by running `swagger-jsdoc` with the config in `packages/backend/src/api/v1/openapi.ts`; it sets global metadata (title, version, server URL) and registers a `/openapi` route on the versioned router.
- `packages/backend/src/api/v1/index.ts` prefixes the router with `/v1` and mounts the OpenAPI router, so the full spec is always available at `GET /v1/openapi`.
- Endpoint documentation lives alongside the handlers as JSDoc blocks that start with `@openapi`. Because the generator scans `packages/backend/src/api/v1/**/*.ts`, any block under that tree becomes part of the spec.
- Those blocks contain YAML describing the path, method, parameters, and responses; keep the documented URL absolute (e.g. `/v1/runs`) so it matches the actual route path including the `/v1` prefix added by the parent router.
- You can also declare reusable `components` in the same style—see the schema definitions near the top of `packages/backend/src/api/v1/runs/index.ts` for an example. Place the comment before the relevant handler so the spec stays readable.

## Authentication Architecture

- **Request Pipeline:** `authMiddleware` in `packages/backend/src/api/v1/auth/utils.ts` runs ahead of routing (registered in `packages/backend/src/index.ts`) and populates `ctx.state` with user/org/project context. A curated `publicRoutes` allowlist lets health checks, ingestion, and auth flows bypass credentials; everything else requires either a JWT bearer token or an API key. UUID-shaped tokens are treated as project API keys and checked against `api_key`; bearer JWTs are verified and tied back to an `account` row, including optional project membership validation via the `projectId` query parameter.
- **JWT Sessions:** Tokens are HS256 JWTs signed with `JWT_SECRET`, defaulting to a 30-day lifetime. Payloads carry `userId`, `email`, and `orgId`, which downstream handlers consume from `ctx.state`. Passwords are stored with Argon2; legacy bcrypt hashes are still accepted. Helpers in `auth/utils.ts` centralize signing, verification, and expiry checks.
- **API Keys:** Each project gets a public key (its UUID) and a private key when created. Public keys grant access to ingestion and other explicitly public endpoints; private keys mark requests with `ctx.state.privateKey = true`, bypassing role checks. Ingestion code (`runs/ingest.ts`) resolves reported `appId` values back to owning projects through `api_key` records.
- **Password Flow:** `/auth/signup` supports both new-org signups and invitation joins. It enforces optional reCAPTCHA, provisions org/project/API keys inside a transaction, and issues a JWT on completion. `/auth/login` verifies credentials (handling accounts without passwords by triggering reset emails), audits the login, updates `last_login_at`, and returns a fresh JWT.
- **Invitations & OAuth:** Team invites come from `/v1/users/invitation`, which emits join tokens encoding org, role, and project IDs plus any prior role. Join tokens steer signup, deleting or migrating old accounts as needed. Google and GitHub routes verify provider tokens, ensure emails are verified, reuse join tokens when present, and otherwise provision orgs/projects/API keys. New signups trigger Slack alerts.
- **SAML SSO:** Orgs store IdP metadata; `getLoginUrl` builds the redirect. The ACS handler validates assertions, extracts email/name, updates the pre-created account, and stores a short-lived single-use token. Clients then call `/auth/exchange-token` to swap that one-time token for a standard JWT. Metadata downloads and IdP XML uploads live under the same router with rate limiting and role checks.
- **Recovery & Verification:** Password reset tokens are 15-minute JWTs saved to `account.recovery_token`; successful resets rehash the password and return a new auth token. Email verification links are JWT-powered and, on cloud deployments, send welcome emails and mark accounts verified.
- **Frontend Session Handling:** The React `AuthProvider` stores JWTs in `localStorage`, validates expiry with `decodeJwt`, and exposes `signOut` utilities that clear storage and redirect to `/login`. A shared fetch wrapper attaches bearer tokens, signs users out on 401s, and is used by login screens to probe `/auth/method`, submit credentials, or finish SAML flows by exchanging OTT tokens.

## Org / Account / Project Model

- **Entities:** `org` records own billing plan, seat limits, and SSO settings. `account` rows represent human users and always reference a single `org` via `org_id`. Projects live in the `project` table; every project belongs to exactly one org through `org_id` as well.
- **Membership Mapping:** User-to-project membership is many-to-many through `account_project`. On signup, Lunary seeds the owner into the initial project. Admin/owner role changes or project edits update `account_project` to keep access in sync (`packages/backend/src/api/v1/projects/index.ts` for project creation, `packages/backend/src/api/v1/users.ts` for assignment updates).
- **Roles & Permissions:** The `account.role` (owner/admin/member/viewer, etc.) drives feature access via the shared `hasAccess` matrix (`packages/backend/src/utils/authorization.ts`). Owners hold full rights, admins inherit most org/project controls, while members/viewers require explicit project membership entries.
- **Invites & Transfers:** Invitations encode org ID, desired role, and project list in a join token. When accepted, backend flows promote or restructure accounts—deleting outdated rows if the invitee is moving orgs—and hydrate `account_project` with the invited project IDs before issuing a session token (`packages/backend/src/api/v1/auth/index.ts`).
- **Lifecycle Hooks:** Creating new projects auto-subscribes all owners/admins to the project and generates fresh API keys. Deleting projects checks that the org retains at least one project. When users are removed, the code cleans up their `account_project` rows to avoid dangling access references (`packages/backend/src/api/v1/users.ts`).

## Additional References

- [Filter System Overview](ops/docs/filter-system-overview.md)
