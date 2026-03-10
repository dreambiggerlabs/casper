# AGENTS.md

Guidance for human and AI contributors working in this repository.

## 1. Purpose

Paperclip is a control plane for AI-agent companies.
The current implementation target is V1 and is defined in `doc/SPEC-implementation.md`.

## 2. Read This First

Before making changes, read in this order:

1. `README.md`
2. `doc/CONVENTIONS.md`
3. `doc/TECH.md`
4. `ROADMAP.md`

## 3. API-First Principle

Casper Engine is a **standalone API** — it does not ship with or depend on any frontend.

Every change starts at the API layer:

1. **Schema first** — define or update Drizzle schemas and Zod validation schemas
2. **Service layer** — implement business logic through domain services
3. **Routes** — expose functionality through REST endpoints
4. **OpenAPI docs** — update the API specification to reflect new or changed endpoints

Frontend code may exist in this repository, but the API is always built first. Never start with UI work — the frontend consumes the API, so the API must be in place before any frontend that depends on it.

## 4. Docker Guidelines

Services must work via `docker-compose.yml` first — use `image`, `command`, `working_dir`, `environment`, and `volumes` directly in compose. Only add a `.docker/{service}/Dockerfile` when the service has build steps that cannot be expressed in `docker-compose.yml` (e.g. multi-stage builds, custom base images, compiled dependencies). Every new service must run with `docker compose up` before introducing any additional Docker files.

## 5. Definition of Done

A change is done when all are true:

1. API docs (OpenAPI spec) are updated to reflect the changes
2. Tests are written and passing
3. Changes follow the API-first workflow (schema → service → route → docs)
