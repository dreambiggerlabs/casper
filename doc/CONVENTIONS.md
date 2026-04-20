# Conventions

Coding conventions for the Casper Engine codebase.

---

## Simplicity

Keep everything simple. Do not over-engineer.

- **Solve the problem at hand** — do not build for hypothetical future requirements that do not exist yet.
- **Prefer clear, boring code** — clever abstractions that nobody else can follow are a liability, not an asset.
- **One layer of indirection is enough** — if you need a factory that creates a builder that configures a provider, you have gone too far.
- **Delete code you do not need** — dead code, unused utilities, and speculative features add confusion. Remove them.
- **Start concrete, abstract later** — write the straightforward implementation first. Only introduce abstractions when a real, repeated pattern emerges.

If a junior developer cannot understand the code within a few minutes, it is too complex.

---

## SOLID Principles

All code must follow the SOLID principles. These are not guidelines — they are requirements.

### Single Responsibility Principle (SRP)

Every module, class, and function has **one reason to change**.

* A service handles business logic — it does not parse HTTP requests or format responses.
* A controller handles request/response — it does not contain business rules.
* A repository handles data access — it does not validate input.

### Open/Closed Principle (OCP)

Code is **open for extension, closed for modification**.

* New behaviour is added by implementing interfaces or extending abstractions — not by editing existing working code.
* Validation pipeline steps, LLM providers, Git platform adapters, and integrations are all pluggable through interfaces.

### Liskov Substitution Principle (LSP)

Any implementation of an interface can **replace another without breaking the system**.

* If a function accepts a `GitProvider`, it must work identically whether the underlying implementation is GitHub, GitLab, or any future provider.
* Subtypes must not tighten preconditions or weaken postconditions.

### Interface Segregation Principle (ISP)

Interfaces are **small and focused**. No client is forced to depend on methods it does not use.

* Prefer multiple narrow interfaces over a single wide one.
* A component that only reads tasks should depend on a `TaskReader` interface — not a full `TaskRepository` that also includes write and delete methods.

### Dependency Inversion Principle (DIP)

High-level modules do not depend on low-level modules. Both depend on **abstractions**.

* Services depend on interfaces, not concrete implementations.
* Dependencies are injected — never instantiated internally.
* This enables testing (inject mocks), flexibility (swap providers), and clear module boundaries.

---

## Domain-Driven Design (DDD)

The codebase is organised around **business domains**, not technical layers.

### Bounded Contexts

Each major domain area is a **bounded context** with its own models, language, and rules. Contexts communicate through well-defined interfaces — never by reaching into each other's internals.

Core bounded contexts in Casper Engine:

* **Tasks** — task lifecycle, state transitions, priority, assignment
* **Agents** — agent configuration, skills, model routing, execution
* **Workers** — worker registration, heartbeat, job polling, capacity
* **Projects** — project configuration and metadata

Planned for future phases:

* **Pipeline** — validation steps, linting, testing, build verification
* **Integrations** — GitHub, GitLab, Slack adapters and webhook handling

### Layered Architecture Inside Bounded Contexts

Each bounded context maps to a **domain directory** directly under `src/`. Directory and file names inside `src/` always use the **singular** form of the domain name. Inside each domain, code is organised into four layers with a strict dependency direction.

#### Layer structure

```
src/{domain}/
├── presentation/
│   ├── controller/        # HTTP controllers
│   ├── router/            # Express router builders
│   └── middleware/         # domain-specific HTTP middleware
├── application/
│   ├── service/           # use-cases (TaskService, AgentService, …)
│   ├── dto/               # Zod request/response schemas (consumed by services)
│   └── port/              # outbound interfaces: repositories, cross-domain readers, external clients
├── domain/                # pure: no I/O, no Express, no Drizzle, no Zod, no pino
│   ├── entity/            # entities (identity + behaviour)
│   └── value-object/      # value objects (immutable, equality-by-value)
└── infrastructure/
    ├── repository/        # Drizzle implementations of application/port interfaces
    ├── mapper/            # row ↔ entity mappers
    ├── schema/            # Drizzle pgTable + pgEnum
    └── seeder/            # test/seed factories
```

`src/shared/` follows the same four-layer split for cross-cutting concerns.

#### Dependency direction

- `presentation → application → domain` (one-way, inward).
- `infrastructure → application` (implements ports) and `infrastructure → domain` (uses entities/VOs).
- `application/` never imports from `presentation/` or `infrastructure/`.
- `domain/` imports nothing from sibling layers — no Express, no Drizzle, no Zod, no pino. Pure TypeScript, framework-free.
- Cross-domain imports only allowed via another domain's `application/port/` interfaces or `domain/` classes — never another domain's `infrastructure/` or `presentation/`.

#### OOP-only rule

Every TypeScript file inside `src/` exports either a **class** or an **interface**. Free-function exports are forbidden. The composition root (`src/application.ts`) is the only file that may contain procedural bootstrap code, and only enough to wire the dependency graph and start the runtime.

#### Composition root

Each app has a single `src/application.ts` exporting an `Application` class. Its constructor accepts the lowest-level dependencies (database connection, env config) and instantiates the rest of the graph as fields. `src/index.ts` is the only remaining procedural file: it loads env config, constructs `new Application(env)`, and starts the runtime.

#### Shared layer

```
src/shared/
├── presentation/
│   └── middleware/         # cross-domain HTTP middleware (error handler)
├── application/
│   ├── pagination/         # pagination parsing, Hydra collection building
│   └── reference/          # cross-domain IRI → ID resolution
├── domain/
│   ├── error/              # base error classes (HttpError, NotFoundError, ValidationError)
│   ├── iri/                # IRI building, parsing, Zod schema factory
│   └── value-object/       # shared value objects (PaginationParams, PaginatedResult)
└── infrastructure/
    ├── database/            # DatabaseConnection class
    ├── crypto/              # EncryptionService class
    ├── logging/             # Logger class
    ├── openapi/             # OpenApiSpec class
    ├── repository/          # DrizzleRepositoryBase abstract class
    ├── config/              # EnvConfig class (Zod-validated env)
    └── seed/                # SeedOrchestrator class
```

`src/shared/` contains code used across multiple domains — database utilities, base middleware, common types. It has **no domain logic**.

Each domain directory (`src/task/`, `src/agent/`, etc.) owns its schema, logic, and routes. No domain imports another domain's repository or internal types directly — communicate through the service layer or shared contracts.

### Entities and Value Objects

* **Entities** have identity and a lifecycle (e.g. `Task`, `Agent`, `Worker`). They are identified by a unique ID and their state changes over time.
* **Value Objects** are immutable and defined only by their attributes (e.g. `TokenBudget`, `ValidationResult`, `BranchName`). Two value objects with the same data are equal.

### Domain Services

Logic that does not naturally belong to a single entity lives in a **domain service**. Services are stateless and operate on entities and value objects.

Example: `TaskDispatcher` decides which worker receives a task — this logic belongs to neither `Task` nor `Worker` alone.

### Repositories

Repositories provide **collection-like access** to entities. They abstract the database and expose domain-oriented methods:

```ts
// ✅ domain-oriented
findPendingTasks(limit: number): Promise<Task[]>
findByBranch(branch: BranchName): Promise<Task | null>

// ❌ leaking implementation
query(sql: string): Promise<Row[]>
```

### Ubiquitous Language

Use the same terms in code, documentation, and conversation. If the team calls it a "task", the code uses `Task` — not `Job`, `Ticket`, or `Issue` internally. The domain vocabulary is defined once and used everywhere.

---

## Code Quality Standards

All code must pass automated quality checks. These are non-negotiable requirements.

### TypeScript Configuration

TypeScript must run in strict mode. Use the default `strict: true` setting which enables:

- `noImplicitAny`
- `strictNullChecks`
- `strictFunctionTypes`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `noImplicitThis`
- `useUnknownInCatchVariables`
- `alwaysStrict`

**Run type checking:**

```bash
npm run typecheck
```

### Linting (ESLint)

ESLint catches bugs and enforces code quality using `typescript-eslint` recommended configs.

**Config:**

- `typescript-eslint/strict` — strict type-checked rules
- `typescript-eslint/stylistic` — consistent code style

**Run before every commit:**

```bash
npm run lint
```

**Auto-fix issues:**

```bash
npm run lint:fix
```

### Formatting (Prettier)

Prettier handles all formatting. No configuration debate — accept the defaults.

**Run before every commit:**

```bash
npm run format:check
```

**Auto-format:**

```bash
npm run format
```

### Import Organization

Imports are organized in this order, separated by blank lines:

1. Node.js built-ins (`fs`, `path`, `http`)
2. External packages (`express`, `zod`, `drizzle-orm`)
3. Cross-domain relative imports (e.g. `../../shared/...`, `../../agent/...`)
4. Intra-domain relative imports (`./`, `../`)

---

## Pre-commit & CI Requirements

### Pre-commit Hooks

Pre-commit hooks run automatically via lefthook:

1. **Format check** — Prettier validates formatting
2. **Lint check** — ESLint validates code quality
3. **Type check** — TypeScript validates types
4. **Test affected files** — Vitest runs tests for changed files
5. **Audit** — npm audit checks for vulnerabilities

Failed checks block the commit. Fix issues before committing.

### CI Pipeline

All pull requests must pass:

| Check | Command | Blocking |
|---|---|---|
| Type check | `npm run typecheck` | Yes |
| Lint | `npm run lint` | Yes |
| Format check | `npm run format:check` | Yes |
| Tests | `npm test` | Yes |
| Audit | `npm audit` | Yes |
| Build | `npm run build` | Yes |

---

## Naming Conventions

### Directories

Directories inside `src/` use **singular** names — the folder represents the domain concept, not a collection. Test directories that mirror the `src/` structure (e.g. `tests/unit/`, `tests/integration/`) must use the same singular names. Root-level directories, config folders, and tooling directories are unaffected.

| Type | Convention | Example |
|---|---|---|
| Domain directory | singular, lowercase | `src/task/`, `src/agent/`, `src/worker/` |
| Layer directory | singular, lowercase | `presentation/`, `application/`, `domain/`, `infrastructure/` |
| Shared subdirectory | singular, lowercase | `src/shared/domain/error/`, `src/shared/infrastructure/database/` |
| Test mirror directory | singular, lowercase | `tests/unit/task/`, `tests/integration/agent/` |

### Files

File names inside `src/` and mirrored test directories use the **singular** form of the domain name.

| Type | Pattern | Example |
|---|---|---|
| Entity | `{domain}/domain/entity/{domain}.entity.ts` | `task/domain/entity/task.entity.ts` |
| Value object | `{domain}/domain/value-object/*.value-object.ts` | `task/domain/value-object/task-status.value-object.ts` |
| Schema | `{domain}/infrastructure/schema/{domain}.schema.ts` | `task/infrastructure/schema/task.schema.ts` |
| Repository interface | `{domain}/application/port/{domain}.repository.ts` | `task/application/port/task.repository.ts` |
| Repository impl | `{domain}/infrastructure/repository/drizzle-{domain}.repository.ts` | `task/infrastructure/repository/drizzle-task.repository.ts` |
| Mapper | `{domain}/infrastructure/mapper/{domain}.mapper.ts` | `task/infrastructure/mapper/task.mapper.ts` |
| Service | `{domain}/application/service/{domain}.service.ts` | `task/application/service/task.service.ts` |
| DTO | `{domain}/application/dto/{domain}.dto.ts` | `task/application/dto/task.dto.ts` |
| Controller | `{domain}/presentation/controller/{domain}.controller.ts` | `task/presentation/controller/task.controller.ts` |
| Router | `{domain}/presentation/router/{domain}.router.ts` | `task/presentation/router/task.router.ts` |
| Seeder | `{domain}/infrastructure/seeder/{domain}.seeder.ts` | `task/infrastructure/seeder/task.seeder.ts` |
| Test | `{file}.test.ts` | `task.service.test.ts` |
| Integration test | `{file}.integration.test.ts` | `drizzle-task.repository.integration.test.ts` |

### Code

| Type | Convention | Example |
|---|---|---|
| Variables | camelCase | `taskList`, `pendingTasks` |
| Functions | camelCase | `findTaskById`, `createTask` |
| Classes | PascalCase | `TaskRepository`, `TaskDispatcher` |
| Interfaces | PascalCase | `Task`, `TaskFilter` |
| Type aliases | PascalCase | `TaskStatus`, `TaskPriority` |
| Constants | SCREAMING_SNAKE_CASE | `MAXIMUM_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT_MILLISECONDS` |

### Self-Explanatory Names

All code must use **full, self-explanatory names**. Every function, method, variable, parameter, and constant must clearly communicate its purpose without requiring the reader to guess or look up context.

#### Rules

- **No abbreviations** — use `customer` not `cust`, `transaction` not `txn`, `repository` not `repo`
- **No single-letter variables** — use `index` not `i`, `element` not `e`, `key` not `k` (exception: well-established mathematical formulas)
- **Functions describe actions** — `calculateMonthlyRevenue()` not `calcRev()`, `validateUserInput()` not `valIn()`
- **Booleans read as questions** — `isAuthenticated`, `hasPermission`, `shouldRetryRequest`
- **Collections use plurals** — `customers` not `customerList`, `activeOrders` not `orderArr`
- **Constants are descriptive** — `MAXIMUM_RETRY_ATTEMPTS` not `MAX_R`, `DEFAULT_TIMEOUT_MILLISECONDS` not `DEF_TO`

#### Examples

```typescript
// ✗ Bad — unclear, abbreviated
const res = await db.query(q);
const fn = (u: User) => u.role === 'admin';
for (let i = 0; i < items.length; i++) { ... }

// ✓ Good — self-explanatory
const queryResult = await database.query(userSearchQuery);
const isAdministrator = (user: User) => user.role === 'admin';
for (let itemIndex = 0; itemIndex < items.length; itemIndex++) { ... }
```

When in doubt, choose the longer, clearer name. Code is read far more often than it is written.

### Database

Table names use the pattern `{domain}_{entity}` in snake_case. When the entity name is the same as the domain, use just the entity name to avoid redundancy (e.g. `task` not `task_task`).

| Type | Convention | Example |
|---|---|---|
| Tables (entity = domain) | `{entity}` | `task`, `agent`, `worker` |
| Tables (entity ≠ domain) | `{domain}_{entity}` | `agent_run`, `pipeline_step`, `task_assignment` |
| Columns | snake_case | `created_at`, `task_id` |
| Primary keys | `id` | `id` |
| Foreign keys | `{table}_id` | `task_id`, `agent_id` |

#### Identity columns

Every table has two identity columns:

- `id` — auto-incrementing integer (`serial`). Used as the **primary key** and for all **foreign key references** between tables. This is an internal database concern and is never exposed in API responses.
- `uuid` — randomly generated UUID. Used exclusively for **public API communication** (JSON responses, IRIs, URL parameters). Never used as a foreign key target.

Foreign key columns are always `integer` type and reference the `id` column of the related table — never the `uuid` column.
