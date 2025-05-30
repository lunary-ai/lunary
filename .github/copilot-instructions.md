# Coding Guidelines

This document outlines coding standards and best practices for the Lunary monorepo and its constituent packages.

## Table of Contents
1. [Monorepo Structure](#monorepo-structure)
2. [General Conventions](#general-conventions)
   - [Formatting](#formatting)
   - [Linting & Static Analysis](#linting--static-analysis)
   - [TypeScript](#typescript)
   - [Python](#python)
   - [Git](#git)
   - [Commit Messages](#commit-messages)
   - [Pull Requests](#pull-requests)
3. [Dependency Management](#dependency-management)
4. [Testing](#testing)
5. [CI/CD](#ci-cd)
6. [Security & Secrets](#security--secrets)
7. [Package-Specific Guidelines](#package-specific-guidelines)
   - [Frontend (packages/frontend)](#frontend-packagesfrontend)
   - [Backend (packages/backend)](#backend-packagesbackend)
   - [Shared (packages/shared)](#shared-packagesshared)
   - [Python SDK (packages/python-sdk)](#python-sdk-packagespython-sdk)
   - [Database Migrations (packages/db)](#database-migrations-packagesdb)
   - [End-to-End Tests (packages/e2e)](#end-to-end-tests-packagese2e)
8. [Additional Resources](#additional-resources)

---

## Monorepo Structure

Root directory layout:
```
├── CONTRIBUTING.md        # Contribution guide
├── CODING_GUIDELINES.md   # (this document)
├── package.json           # Bun workspace configuration
├── tsconfig.json          # Base TypeScript config
├── packages/              # Workspace packages
│   ├── frontend/          # Next.js React app
│   ├── backend/           # Koa-based API server
   ├── shared/             # Shared TypeScript library
   ├── python-sdk/         # Python client SDK
   ├── db/                 # SQL migrations
   └── e2e/                # Playwright end-to-end tests
└── ops/                   # Operations and deployment scripts
```

All code should live in one of the `packages/*` workspaces (JS/TS managed by Bun; Python managed by Poetry).

---

## General Conventions
### TypeScript
- Target `ESNext` and enable `strict` mode as defined in `tsconfig.json`.
- Prefer **explicit** types over `any`.
- Use path aliases (`@/`) defined in each package’s `tsconfig.json`.
- Prefer named function to variable functions

### Python
- Adhere to **PEP8** style. Use **black** for formatting:
- Include type hints and runtime checks; package is PEP 561 compatible.

### Git
- Branch naming:
  - feature/xxx
  - fix/xxx
  - chore/xxx
  - docs/xxx
- Keep branches focused on a single change.
- Rebase or squash merge to maintain a clean history.

### Commit Messages
- Use **imperative mood**: `Add`, `Fix`, `Update`.
- Structure: `<type>(<scope>): <subject>`
  - e.g., `feat(api): add pagination to /users endpoint`
- Types: feat, fix, docs, style, refactor, test, chore.

### Pull Requests
- Link to the issue or RFC.
- Provide a concise description of changes.
- Include screenshots or recordings for UI changes.
- Ensure all tests pass and CI checks are green.
- Self-review before requesting review.

---

## Dependency Management

- **Bun** workspaces for JS/TS. Run `bun install` at repo root.
- Commit `bun.lock` and `poetry.lock` for reproducibility.
- Update dependencies via:
  ```bash
  bun upgrade
  # or for Python
  poetry update
  ```
- Avoid adding transitive or unused dependencies.

---

## Testing

- **Unit Tests** (TS/JS): use **Jest** or the framework of choice under each package.
- **Integration / API Tests**: write tests for HTTP endpoints (e.g., supertest).
- **End-to-End Tests**: see [packages/e2e](#end-to-end-tests-packagese2e).
- Run all tests via:
  ```bash
  bun test
  # or Python
  poetry run pytest
  ```
- Strive for >80% coverage in critical modules.

---

## CI/CD

- Built-in GitHub Actions workflows in `.github/workflows`.
- Ensure PRs trigger `run-tests.yml`.
- Use `build-push-deploy.yml` for production releases.
- Keep CI fast (<5 min) by parallelizing where possible.

---

## Security & Secrets

- **Never commit** secrets or `.env` files.
- Provide `.env.example` with placeholder values.
- Load secrets via environment variables in CI and runtime.
- Sanitize and validate all user inputs at the edge and server.

---

## Package-Specific Guidelines

### Frontend (packages/frontend)
- **Framework**: Next.js with React + TypeScript + Mantine.
- Place pages in `pages/`, UI components in `components/`, utilities in `utils/`, and styles in `styles/` or component-specific CSS modules.
- Use path aliases (`@/components`, `@/utils`).
- Prefer **functional components** and React **hooks**.
- Leverage Next.js features:
  - `getStaticProps` / `getServerSideProps` appropriately.
  - API routes in `pages/api/`.
- Style with CSS Modules (`.module.css`) 
- Test UI with **React Testing Library** and **Jest**.

### Backend (packages/backend)
- **Framework**: Koa + TypeScript.
- Structure:
  - `src/api/v1/`: route definitions and OpenAPI specs
  - `src/utils/`: business logic, database access (`db.ts`)
  - `src/access-control/`: authorization policies
  - `src/jobs/`: scheduled tasks
  - `src/types/`: shared interfaces
- Centralize error handling via Koa middleware.
- Validate request payloads against schemas/OpenAPI.
- Interact with PostgreSQL via the `db.ts` helper.
- Write migration scripts under `packages/db` and run via `bun run migrate:db`.
- All the sql columns are autoCamelize on select and insert. 

### Shared (packages/shared)
- **Purpose**: shared TypeScript types, schemas, and utility functions.
- Maintain backwards compatibility; bump version when breaking changes.
- Export a minimal public API in `index.ts`.
- Document modules in `README.md`.

### Python SDK (packages/python-sdk)
- **Packaging**: Poetry-managed. Update `pyproject.toml` and `poetry.lock`.
- Follow Python best practices:
  - Formatting: `black`, `isort`.
  - Type checking: enable `mypy` if configured.
  - Runtime checks and helpful error messages.
- Write examples under `examples/` and tests under `tests/`.
- Publish to PyPI; follow semantic versioning.

### Database Migrations (packages/db)
- Use sequential, timestamped SQL files (`0001_init.sql`, `0002_add_users.sql`).
- Keep migrations idempotent and transactional.
- Document schema changes and rollbacks.

### End-to-End Tests (packages/e2e)
- **Framework**: Playwright.
- Store tests as `*.spec.ts` in root of `e2e/`.
- Use global setup/teardown (`auth.setup.ts`, `global.teardown.ts`).
- Reference selectors with `data-test-id` when possible for stability.
- Save artifacts (screenshots, videos) for CI debugging.
