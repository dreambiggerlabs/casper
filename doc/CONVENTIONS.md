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

### Module Structure

Each bounded context maps to a **domain directory** directly under `src/`. Directory and file names inside `src/` always use the **singular** form of the domain name. Test directories that mirror the `src/` structure (e.g. `tests/unit/task/`) follow the same convention. Root-level directories, config folders, and tooling directories are unaffected.

```
src/
├── shared/                    # cross-cutting concerns
│   ├── config/                # configuration loading
│   ├── database/              # connection, migrations, transaction helpers
│   ├── error/                 # base error classes
│   ├── middleware/             # auth, logging, error handling
│   └── type/                  # shared types, utility types
├── task/                      # task domain
├── agent/                     # agent domain
├── worker/                    # worker domain
└── project/                   # project domain
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
3. Internal modules (`@/shared/`, `@/task/`)
4. Relative imports (`./`, `../`)

Use `@/` path alias for imports from `src/`.

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
| Shared subdirectory | singular, lowercase | `src/shared/error/`, `src/shared/type/` |
| Test mirror directory | singular, lowercase | `tests/unit/task/`, `tests/integration/agent/` |

### Files

File names inside `src/` and mirrored test directories use the **singular** form of the domain name.

| Type | Pattern | Example |
|---|---|---|
| Schema | `{domain}.schema.ts` | `task.schema.ts` |
| Repository | `{domain}.repository.ts` | `task.repository.ts` |
| Service | `{domain}.service.ts` | `task.service.ts` |
| Routes | `{domain}.routes.ts` | `task.routes.ts` |
| Types | `{domain}.types.ts` | `task.types.ts` |
| Test | `{file}.test.ts` | `task.service.test.ts` |
| Integration test | `{file}.integration.test.ts` | `task.repository.integration.test.ts` |

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

#### Identity columns

Every table has two identity columns:

- `id` — auto-incrementing integer (`serial`). Used as the **primary key** and for all **foreign key references** between tables. This is an internal database concern and is never exposed in API responses.
- `uuid` — randomly generated UUID. Used exclusively for **public API communication** (JSON responses, IRIs, URL parameters). Never used as a foreign key target.

Foreign key columns are always `integer` type and reference the `id` column of the related table — never the `uuid` column.

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
3. Internal modules (`@/shared/`, `@/task/`)
4. Relative imports (`./`, `../`)

Use `@/` path alias for imports from `src/`.

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

Directories inside `src/` use **singular** names — the folder represents the domain concept, not a collection. This convention applies only to `src/`; root-level directories, config folders, and tooling directories are unaffected.

| Type | Convention | Example |
|---|---|---|
| Domain directory | singular, lowercase | `src/task/`, `src/agent/`, `src/worker/` |
| Shared subdirectory | singular, lowercase | `src/shared/error/`, `src/shared/type/` |

### Files

File names inside `src/` use the **singular** form of the domain name.

| Type | Pattern | Example |
|---|---|---|
| Schema | `{domain}.schema.ts` | `task.schema.ts` |
| Repository | `{domain}.repository.ts` | `task.repository.ts` |
| Service | `{domain}.service.ts` | `task.service.ts` |
| Routes | `{domain}.routes.ts` | `task.routes.ts` |
| Types | `{domain}.types.ts` | `task.types.ts` |
| Test | `{file}.test.ts` | `task.service.test.ts` |
| Integration test | `{file}.integration.test.ts` | `task.repository.integration.test.ts` |

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
