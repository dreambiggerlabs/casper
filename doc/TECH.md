# Tech Stack

Technology choices for the Casper Engine.

---

## Runtime

**Node.js** with **TypeScript**

---

## Core Libraries

| Layer | Technology | Status | Notes |
|---|---|---|---|
| HTTP Framework | [Express.js](https://expressjs.com/) | Installed | Routing, middleware, request handling |
| Database | [PostgreSQL](https://www.postgresql.org/) | Installed | Task state, job queue, execution logs, events |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) | Installed | Type-safe SQL, schema declarations, migrations |
| Validation | [Zod 4.x](https://zod.dev/) | Installed | Runtime schema validation and type inference |
| Validation (JSON Schema) | [AJV](https://ajv.js.org/) | Planned | JSON Schema validation for API payloads and config |
| Logging | [Pino](https://getpino.io/) | Planned | Structured JSON logging, low-overhead |
| API Docs | [Swagger/OpenAPI](https://swagger.io/) + [Scalar](https://scalar.com/) | Installed | OpenAPI spec generation with Scalar API reference UI |
| Docker SDK | [dockerode](https://github.com/apocas/dockerode) | Planned | Container lifecycle management for agent execution |
| Git | [simple-git](https://github.com/steveukx/git-js) | Planned | Git operations (branch, commit, push) |
| WebSocket | [ws](https://github.com/websockets/ws) | Planned | Real-time worker communication, interactive mode |
| LLM Integration | HTTP client + streaming JSON | Planned | OpenAI-compatible API |
| Config | Environment variables + [dotenv](https://github.com/motdotla/dotenv) | Installed | 12-factor compliant |
| Testing | [Vitest](https://vitest.dev/) | Installed | Fast TypeScript-native test runner |

---

## Database

**PostgreSQL** serves as the single backing store for:

* Task state and execution logs
* Job queue
* Configuration and metadata

Schema is managed through **Drizzle ORM** — type-safe table declarations in TypeScript with generated SQL migrations.

---

## Validation Strategy

Two complementary validators are used:

* **Zod 4.x** — primary validation for request bodies, service inputs, and internal data contracts. Provides TypeScript type inference directly from schemas.
* **AJV** — JSON Schema validation for cases requiring standards-based schema interchange (webhook payloads, external config files, OpenAPI request validation).

---

## API Documentation

API endpoints are documented using the **OpenAPI 3.x** specification. The interactive API reference is served via **Scalar**, providing a modern, browsable interface for exploring and testing endpoints.

---

## Studio (Frontend)

The **Studio** is a responsive, **mobile-first** web application. All layouts and components are designed for small screens first, then progressively enhanced for tablet and desktop viewports.

- **Mobile-first CSS** — base styles target mobile, wider breakpoints are added with `min-width` media queries.
- **Touch-friendly** — interactive elements are sized and spaced for touch input.
- **Responsive layouts** — every view must work from 320px to wide desktop without horizontal scrolling or broken layouts.

The API is always built before any Studio work. The Studio consumes the API — it never contains business logic.

---

## Testing

**Vitest** is the test runner. All tests are written in TypeScript and colocated with the code they cover.

### Structure

```
src/
├── task/
│   ├── task.service.ts
│   ├── task.service.test.ts        # unit tests
│   ├── task.routes.ts
│   └── task.routes.test.ts         # route/integration tests
```

* **Unit tests** — `*.test.ts` next to the source file.
* **Integration tests** — `*.integration.test.ts` or placed in a top-level `tests/` directory when they span multiple modules.
* **End-to-end tests** — `tests/e2e/` directory for full API lifecycle tests.

### Naming

Test descriptions follow the pattern: **"should [expected behaviour] when [condition]"**.

```ts
describe("TaskService", () => {
  it("should return a paginated list when tasks exist", async () => { ... });
  it("should throw NotFoundError when the task does not exist", async () => { ... });
});
```

### Database

Integration tests that touch the database run against a **real PostgreSQL instance** (Docker Compose or testcontainers). Each test suite:

1. Runs inside a transaction.
2. Rolls back after each test — no leftover state between tests.

Avoid mocking the database in integration tests. The goal is to verify real queries against a real schema.

### Mocking

* **External services** (GitHub API, GitLab API, LLM providers, Docker SDK) are mocked at the HTTP boundary or via dependency-injected interfaces.
* **Internal modules** are not mocked unless isolation is explicitly needed. Prefer testing through the public API of a module.

### Validation

Test both valid and invalid inputs for every endpoint and service method. Verify that:

* Zod schemas reject malformed data with meaningful errors.
* API responses match the documented OpenAPI schema.

### Coverage

* All new code must ship with tests.
* Critical paths (task lifecycle, agent dispatch, validation pipeline) require both unit and integration coverage.
* Coverage reports are generated but not gated by an arbitrary percentage — meaningful coverage of behaviour is prioritised over line count.

### Running Tests

```bash
# all tests
npm test

# watch mode during development
npm run test:watch

# specific file
npx vitest run src/task/task.service.test.ts
```

---

## Deployment

| Concern | Approach |
|---|---|
| Runtime | Node.js LTS |
| Containerization | Compose-first — services run via `docker-compose.yml` using official images. Add `.docker/{service}/Dockerfile` only when build steps exceed what compose can express |
| Orchestration | Docker Compose for development, any container platform for production |
