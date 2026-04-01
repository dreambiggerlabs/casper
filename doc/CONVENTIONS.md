# Conventions

Coding conventions for the Casper Engine codebase.

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
* **Pipeline** — validation steps, linting, testing, build verification
* **Integrations** — GitHub, GitLab, Slack adapters and webhook handling
* **Workers** — worker registration, heartbeat, job polling, capacity

### Module Structure

Each bounded context maps to a **domain directory** directly under `src/`:

```
src/
├── shared/                    # cross-cutting concerns
│   ├── config/                # configuration loading
│   ├── database/              # connection, migrations, transaction helpers
│   ├── errors/                # base error classes
│   ├── middleware/             # auth, logging, error handling
│   └── types/                 # shared types, utility types
├── tasks/
│   ├── tasks.schema.ts        # Drizzle table + Zod schemas
│   ├── tasks.repository.ts    # data access
│   ├── tasks.service.ts       # business logic
│   ├── tasks.routes.ts        # HTTP handlers
│   └── tasks.types.ts         # domain types and interfaces
├── agents/
├── pipeline/
├── integrations/
└── workers/
```

`src/shared/` contains code used across multiple domains — database utilities, base middleware, common types. It has **no domain logic**.

Each domain directory (`src/tasks/`, `src/agents/`, etc.) owns its schema, logic, and routes. No domain imports another domain's repository or internal types directly — communicate through the service layer or shared contracts.

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
3. Internal modules (`@/shared/`, `@/tasks/`)
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

### Files

| Type | Pattern | Example |
|---|---|---|
| Schema | `{domain}.schema.ts` | `tasks.schema.ts` |
| Repository | `{domain}.repository.ts` | `tasks.repository.ts` |
| Service | `{domain}.service.ts` | `tasks.service.ts` |
| Routes | `{domain}.routes.ts` | `tasks.routes.ts` |
| Types | `{domain}.types.ts` | `tasks.types.ts` |
| Test | `{file}.test.ts` | `tasks.service.test.ts` |
| Integration test | `{file}.integration.test.ts` | `tasks.repository.integration.test.ts` |

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

| Type | Convention | Example |
|---|---|---|
| Tables | snake_case, plural | `tasks`, `agent_runs` |
| Columns | snake_case | `created_at`, `task_id` |
| Primary keys | `id` | `id` |
| Foreign keys | `{table}_id` | `task_id`, `agent_id` |

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
3. Internal modules (`@/shared/`, `@/tasks/`)
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

### Files

| Type | Pattern | Example |
|---|---|---|
| Schema | `{domain}.schema.ts` | `tasks.schema.ts` |
| Repository | `{domain}.repository.ts` | `tasks.repository.ts` |
| Service | `{domain}.service.ts` | `tasks.service.ts` |
| Routes | `{domain}.routes.ts` | `tasks.routes.ts` |
| Types | `{domain}.types.ts` | `tasks.types.ts` |
| Test | `{file}.test.ts` | `tasks.service.test.ts` |
| Integration test | `{file}.integration.test.ts` | `tasks.repository.integration.test.ts` |

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

| Type | Convention | Example |
|---|---|---|
| Tables | snake_case, plural | `tasks`, `agent_runs` |
| Columns | snake_case | `created_at`, `task_id` |
| Primary keys | `id` | `id` |
| Foreign keys | `{table}_id` | `task_id`, `agent_id` |
