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

Everything runs inside Docker. The `docker-compose.yml` in the project root is the single source of truth for all services.

### Running the stack

```bash
docker compose up        # start all services
docker compose up -d     # start in background
docker compose down      # stop all services
```

### Running commands inside a container

Never install packages or run commands on the host. Use `docker compose exec` to run commands inside a running service container:

```bash
docker compose exec {service} npm install {package}
docker compose exec {service} npm run typecheck
docker compose exec {service} npm test
```

### Adding services

Services must work via `docker-compose.yml` first — use `image`, `command`, `working_dir`, `environment`, and `volumes` directly in compose. Only add a `.docker/{service}/Dockerfile` when the service has build steps that cannot be expressed in `docker-compose.yml` (e.g. multi-stage builds, custom base images, compiled dependencies). Every new service must run with `docker compose up` before introducing any additional Docker files.

## 5. Definition of Done

A change is done when all are true:

1. **API docs updated** — OpenAPI spec reflects all endpoint changes
2. **Tests pass** — Unit and integration tests written and passing
3. **API-first workflow followed** — Schema → Service → Route → Docs
4. **Type check passes** — `npm run typecheck` succeeds
5. **Lint passes** — `npm run lint` succeeds
6. **Format check passes** — `npm run format:check` succeeds
7. **Build succeeds** — `npm run build` succeeds

## 6. Code Quality Requirements

All code contributions must pass automated quality checks.

### Mandatory Checks

Run these before committing:

| Check | Command | Purpose |
|---|---|---|
| Type check | `npm run typecheck` | Catches type errors |
| Lint | `npm run lint` | Enforces code quality |
| Format | `npm run format:check` | Ensures consistent style |
| Test | `npm test` | Verifies behaviour |
| Audit | `npm audit` | Security vulnerability check |

### Pre-commit Enforcement

Pre-commit hooks run automatically via lefthook:

- **Formatting** — Prettier validates style
- **Linting** — ESLint catches issues
- **Type checking** — TypeScript verifies types
- **Tests** — Vitest runs affected tests
- **Audit** — npm audit checks for vulnerabilities

Failed checks block the commit. Fix issues before committing.

### CI Requirements

All pull requests must pass CI checks:

- Type check ✓
- Lint ✓
- Format check ✓
- Tests ✓
- Audit ✓ (no high/critical vulnerabilities)
- Build ✓

No exceptions. Fix failing checks before requesting review.

## 7. Running Quality Checks

```bash
# Run all checks
npm run check

# Individual checks
npm run typecheck
npm run lint
npm run lint:fix      # auto-fix lint issues
npm run format
npm run format:check
npm test

# Build
npm run build
```