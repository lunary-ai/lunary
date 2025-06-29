# CLAUDE.md

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

**API Response Format:** 
- All API responses MUST use camelCase for root-level keys
- The SQL client (`sql` from `@/src/utils/db`) automatically converts between snake_case (database) and camelCase (API)
- Example: `default_payload` in DB becomes `defaultPayload` in API response
- Do NOT manually convert case - the SQL client handles this automatically

## Architecture

**Monorepo Structure (Bun workspaces):**

- **`packages/backend/`** - Koa.js API server with PostgreSQL
- **`packages/frontend/`** - Next.js 15 + React 19 dashboard
- **`packages/shared/`** - TypeScript types and utilities
- **`packages/db/`** - 96 sequential PostgreSQL migrations
- **`packages/e2e/`** - Playwright tests
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

1. Setup PostgreSQL 15+ instance
2. Configure `.env` files in backend/frontend from examples
3. `bun install`
4. `bun run migrate:db`
5. `bun run dev`

Dashboard: `http://localhost:8080`
API: `http://localhost:3333`