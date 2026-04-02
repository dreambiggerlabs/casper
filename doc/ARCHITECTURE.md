# Architecture

Casper Engine is designed as a modular, distributed, and scalable control plane for AI-agent software development. This document details the technical architecture, core components, data flow, and the rationale behind key technical decisions.

---

## 1. System Overview

Casper Engine acts as the orchestrator between developer intent (tasks) and working code (pull requests). It consists of three primary application components that run concurrently within a Dockerized environment, backed by a relational database:

1. **Engine (API Control Plane)**
2. **Worker (Agent Execution Node)**
3. **Studio (Frontend UI)**
4. **Database (PostgreSQL State Store)**

### Component Interaction

- **Tasks** are ingested via external channels (GitHub, GitLab, Slack, REST API) and persisted in the **Database** by the **Engine**.
- The **Worker** continuously polls the **Engine** for pending tasks.
- When a task is claimed, the **Worker** provisions an ephemeral, isolated environment for the specific **Agent** (e.g., a "refactoring" agent using an advanced reasoning model).
- The **Agent** interacts with the source code, executing its skills and generating commits.
- A **Validation Pipeline** ensures the generated code passes formatting, linting, typechecking, and testing before opening a Pull Request.
- Human review feedback is captured and fed back into the Engine, creating a refinement loop.

---

## 2. Core Components

### 2.1 Engine (API)
- **Role:** Central orchestrator, API server, and source of truth.
- **Responsibilities:**
  - Task ingestion and lifecycle management.
  - Exposing REST API endpoints and OpenAPI schemas.
  - Managing worker registration, heartbeat, and state.
  - Handling external webhooks.
- **Tech Stack:** Node.js, Express, Zod (validation), Pino (logging).

### 2.2 Worker
- **Role:** Execution node for agents.
- **Responsibilities:**
  - Polling the Engine for jobs and returning results.
  - Managing the lifecycle of Agent containers via the Docker SDK (`dockerode`).
  - Executing git operations (`simple-git`).
  - Piping outputs and execution logs back to the Engine.
- **Tech Stack:** Node.js, `dockerode`, `simple-git`.

### 2.3 Studio
- **Role:** User interface for monitoring and management.
- **Responsibilities:**
  - Providing a browser-based dashboard to interact with the engine.
  - Rendering tasks, agent status, and live logs.
- **Tech Stack:** Vite, React, mobile-first CSS architecture.

### 2.4 Database
- **Role:** Persistent state, queue, and event store.
- **Tech Stack:** PostgreSQL.
- **Management:** Drizzle ORM ensures type-safe schema declarations and handles database migrations.

---

## 3. Key Architectural Decisions

### 3.1 API-First & Decoupled Frontend
**Decision:** The UI (Studio) is strictly decoupled from the Engine.
**Why:** Agents and webhooks interact primarily with the API. A standalone API ensures developers can build custom interfaces (e.g., CLI tools, custom task boards, Replit-like IDEs, or VSCode extensions) on top of the engine without being tied to a specific frontend implementation.

### 3.2 Decoupled Worker Architecture
**Decision:** The Worker is architected as a completely separate service from the Engine (API).
**Why:**
- **Collaboration:** Team members can install and run workers on their local machines and connect them simultaneously to the same shared Engine via the API.
- **Separation of Concerns:** Strictly decouples API scaling and orchestration logic from the heavy compute/execution requirements of the worker logic.

### 3.3 Ephemeral Container Execution
**Decision:** Agents execute tasks inside isolated, ephemeral Docker containers spawned by the Worker.
**Why:**
- **Security:** Prevents AI-generated code from compromising the host machine or accessing sensitive worker environment variables.
- **Reproducibility:** Ensures agents always start with a pristine, predictable state, minimizing "works on my machine" failures.
- **Scalability:** Workers can be horizontally scaled across different physical machines with loose coupling.

### 3.4 PostgreSQL as a Unified Datastore
**Decision:** PostgreSQL is used for both relational data storage and task queueing. We avoid introducing separate message brokers like Redis or RabbitMQ.
**Why:**
- **Simplicity:** Eliminates infrastructural overhead. For the scale required in V1, Postgres adequately handles state polling, transaction locks (`FOR UPDATE SKIP LOCKED`), and task transitions.
- **Consistency:** Task data, queue state, and execution logs reside in the same transactional boundary, preventing desynchronization.

### 3.5 Strict Domain-Driven Design (DDD)
**Decision:** The `src/` codebase is logically strictly divided by Bounded Contexts (e.g., `src/task/`, `src/agent/`, `src/worker/`) utilizing a singular naming convention.
**Why:**
- Enforces clear architectural boundaries—domains communicate through shared contracts and domain services, not direct internal type imports.
- Establishes a highly predictable pattern for both human and AI contributors to navigate the repository.

### 3.6 Zod & AJV Dual Validation
**Decision:** Zod is used for primary internal validation while AJV runs JSON Schema validation.
**Why:** Zod provides seamless TypeScript inference out-of-the-box for domain logic. Conversely, AJV ensures strict conformance to JSON Schema standards, which is necessary for precise OpenAPI documentation, webhook payloads, and external configuration parsing.

---

## 4. Key Features

- **Multi-Channel Ingestion:** Consolidates tasks from Slack, GitHub, GitLab, and custom API integrations into one normalized pipeline.
- **Skill-Based Agent Routing:** Routes tasks to specialized AI agents. For example, a documentation task can be routed to a faster, cheaper LLM model, whereas a complex architectural refactor may be handled by an advanced reasoning model.
- **Interactive Mode:** Supports human-in-the-loop validation, pausing execution to ask the developer questions before making critical implementation choices.
- **Pre-PR Validation & Auto-Repair:** Reject faulty code locally through linting, formatting, and unit tests before a PR is opened, instructing the LLM to patch failures autonomously.
- **Preview Environments:** Automatically provisions temporary Docker Compose environments per branch to test results and generate downloadable build artifacts.

---

## 5. Deployment Architecture

Deployments utilize a **compose-first** approach. The application footprint is natively defined in `docker-compose.yml`, deploying all services cohesively.

**Network Topology:**
1. **Engine** exposes port `3000` to the host/reverse-proxy for external API access.
2. **Studio** exposes port `5173` to the host/reverse-proxy for browser access.
3. **Worker** runs without exposed ports, strictly communicating outbound to the Engine's internal Docker network URL (`http://engine:3000`).
4. **Database** runs securely within the internal Docker network, accessed only by the Engine layer.

Secrets and sensitive environment variables are evaluated at runtime by passing through Docker environments, strictly adhering to 12-factor application principles.
