
# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lunary is an LLM observability and development platform providing conversation tracking, analytics, debugging, prompt management, and evaluation tools. It's a self-hostable toolkit that integrates with major LLM providers.

## Essential Commands

**Development:**
- `bun run dev` - Start all services (frontend + backend)
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

## Development Workflow

1. `bun run migrate:db`
2. `bun run dev`

Dashboard: `http://localhost:8080`
API: `http://localhost:3333`

## Tests
- Use `bun run test` to run tests after each code change.
- Before running the Playwright suite, start the full stack with `bun run dev:llm` (spawns backend + frontend + dependencies). The tests expect all services to be reachable.

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
