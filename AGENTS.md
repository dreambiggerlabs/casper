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
4. `doc/ARCHITECTURE.md`
5. `ROADMAP.md`

**`doc/CONVENTIONS.md` is mandatory.** Every rule in that file — naming, structure, simplicity, SOLID, database conventions — must be followed without exception. Do not deviate, improvise, or take shortcuts. If your code does not conform to `CONVENTIONS.md`, it is wrong.

**Architecture Updates:** When anything changes the architecture, `doc/ARCHITECTURE.md` must be updated accordingly.

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

## 8. Security Requirements

Security is not optional. Every contributor — human or AI — must follow these rules without exception.

### No Secrets in the Repository

**Never commit credentials, API keys, tokens, passwords, private keys, or any other secret to the repository.** This includes:

- API keys and access tokens (OpenAI, GitHub, Slack, etc.)
- Database connection strings containing passwords
- JWT signing keys or private PEM files
- OAuth client secrets
- Webhook secrets
- Any form of password or passphrase

**If a secret is committed, consider it compromised** — rotate it immediately, even if the commit is reverted or force-pushed.

### Environment Variables for All Sensitive Configuration

All secrets and sensitive configuration must be provided via **environment variables** at runtime.

- Use `.env` files locally — these are gitignored (`.env`, `.env.*`)
- Maintain `.env.example` with placeholder values and no real secrets
- In production, inject secrets through the orchestration layer (Docker secrets, Vault, CI/CD variables)
- Never hardcode fallback values for secrets in application code

```typescript
// ✗ Bad — hardcoded secret fallback
const apiKey = process.env.OPENAI_API_KEY ?? 'sk-real-key-here';

// ✗ Bad — secret in source code
const jwtSecret = 'my-super-secret-key';

// ✓ Good — fail if missing
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is required');
```

### Encrypted Storage for Sensitive Data

Sensitive data stored in the database must be **encrypted at rest**. This applies to:

- User credentials and authentication tokens
- API keys stored on behalf of tenants
- Personal identification information (PII)
- Webhook secrets and signing keys
- Any data that would cause harm if the database were breached

Use application-level encryption (e.g. AES-256-GCM) for sensitive columns. Never store passwords in plain text — always use a strong hashing algorithm (e.g. bcrypt, argon2).

```typescript
// ✗ Bad — plain text password storage
await database.insert(user).values({ password: plaintextPassword });

// ✓ Good — hashed password
const hashedPassword = await argon2.hash(plaintextPassword);
await database.insert(user).values({ password: hashedPassword });
```

### Git-Level Protections

The repository must enforce protections against accidental secret commits:

- **`.gitignore`** must exclude `.env`, `.env.*`, `*.pem`, `*.key`, and other secret file patterns
- **Pre-commit hooks** should include a secrets scanner (e.g. `detect-secrets`, `gitleaks`, or `trufflehog`) to block commits containing potential secrets
- **CI pipeline** should run a secrets scan on every pull request

### Dependency Security

- Run `npm audit` before every commit (enforced by pre-commit hooks)
- **No high or critical vulnerabilities** are allowed in production dependencies
- Pin exact dependency versions in `package-lock.json`
- Review new dependencies before adding them — prefer well-maintained, widely-used packages
- Remove unused dependencies promptly

### General Security Hygiene

- **Validate and sanitise all input** — never trust data from external sources (API requests, webhooks, user input)
- **Use parameterised queries** — never concatenate user input into SQL or shell commands
- **Apply the principle of least privilege** — services and database users should have only the permissions they need
- **Log securely** — never log secrets, tokens, passwords, or full request bodies containing sensitive data
- **Use HTTPS everywhere** — all external communication must be encrypted in transit
- **Set security headers** — `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, etc.
- **Implement rate limiting** — protect endpoints from brute-force and abuse
- **Token expiry** — JWTs and session tokens must have reasonable expiration times; support token revocation