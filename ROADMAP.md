# Roadmap

This document outlines the development phases of **Casper Engine**.

Casper Engine is designed as the **core infrastructure layer for agent-driven software development**.
The roadmap prioritizes building a **reliable orchestration engine first**, followed by advanced agent capabilities and ecosystem tooling.

The long-term vision is a platform where developers can describe work in natural language and receive working code, previews, and artifacts — all driven by autonomous agents.

---

# Phase 1 — Core Engine (MVP)

Goal: **Turn tasks into validated pull requests.**

The first phase focuses on building a reliable **agentic development loop**.

```
Task
 → Agent execution
 → Validation pipeline
 → Pull request
 → Review feedback
 → Agent refinement
```

This loop establishes the core Casper Engine workflow using a **single agent per task**. Multi-agent teams and collaborative agent workflows are introduced in a later phase.

## Features

### Task ingestion

Tasks can originate from:

* GitHub Issues
* GitLab Issues
* Slack messages
* REST API

All entrypoints are normalized into the **same task queue**.

### Worker system

Workers execute tasks.

Workers:

* poll the API for tasks
* run jobs locally
* execute agents inside containers
* return results to the engine

Workers scale horizontally and automatically register with the engine.

### Agent execution

Agents:

* read the task description
* inspect the repository
* modify code
* commit changes

Execution happens inside **isolated Docker environments**.

> **Current MVP status:** Agent execution is pluggable through a `TaskExecutor` interface in the Worker. The default implementation (`MockTaskExecutor`) is a placeholder that logs the task and resolves — real container-based execution will drop in behind the same interface.

### Git workflow automation

Casper Engine automatically handles:

* branch creation
* committing changes
* pushing branches
* opening Pull Requests or Merge Requests

### Validation pipeline

Before a PR is opened, changes pass through a validation pipeline.

Typical steps:

* formatter
* linter
* typechecker
* tests
* build

If validation fails, the agent attempts automatic repairs before retrying.

### Review-driven refinement

Pull request feedback becomes new tasks.

Agents can respond to:

* PR comments
* inline review comments
* discussion threads

The agent updates the branch and pushes new commits.

---

# Phase 2 — Agent Framework

Goal: **Make agents modular, configurable, and specialized.**

This phase introduces the agent architecture used by Casper Engine.

## Features

### Skill-based agents

Agents operate with defined skills such as:

* documentation
* testing
* refactoring
* architecture
* frontend
* backend

Skills influence:

* system prompts
* tool access
* coding conventions

### Model routing

Agents can use different models depending on the task.

Examples:

* documentation → fast inexpensive model
* architecture → advanced reasoning model
* refactoring → coding optimized model

### Interactive mode

Agents can operate in two modes:

**Autonomous mode**

* executes tasks without interruption

**Interactive mode**

* pauses for clarification
* asks the human questions
* proposes plans before executing

### Tool system

Agents gain structured access to tools such as:

* repository inspection
* code search
* file editing
* build execution
* test execution

---

# Phase 3 — Distributed Execution

Goal: **Enable large-scale parallel agent execution.**

## Features

### Horizontal worker scaling

Workers can be added dynamically.

New workers automatically:

* register with the engine
* start accepting jobs
* increase execution capacity

### Resource isolation

Each task runs in:

* ephemeral Docker containers
* isolated file systems
* clean environments

### Task orchestration

The engine manages:

* job scheduling
* retries
* task state transitions
* execution logs

---

# Phase 4 — Preview & Artifact System

Goal: **Allow agents to produce running environments and downloadable outputs.**

## Features

### Preview environments

Agents can spin up preview environments using Docker Compose.

Preview environments:

* run per branch
* are routed through a reverse proxy
* can be destroyed automatically when no longer needed

Example configuration:

```
.caspers/preview.yml
```

### Artifact generation

Agents can generate artifacts such as:

* APK builds
* compiled binaries
* Docker images
* static site builds
* documentation bundles

Artifacts can be downloaded directly from the task results.

---

# Phase 5 — Multi-Agent Teams

Goal: **Allow agents to collaborate on complex objectives.**

Instead of a single agent, tasks can be executed by **agent teams**.

Example team structure:

* planner agent
* coder agent
* reviewer agent
* testing agent

Agents can:

* decompose tasks
* communicate internally
* run subtasks in parallel
* merge results into a final output

---

# Phase 6 — Ecosystem & Platform

Goal: **Enable developers to build products on top of Casper Engine.**

Casper Engine exposes its functionality through APIs and workers.

Developers can build custom interfaces and workflows on top of the engine.

## Possible interfaces

* Kanban task boards
* chat-based development tools
* CI/CD integrations
* mobile control interfaces
* browser IDEs

---

# Phase 7 — Casper Studio

Goal: **Create a full browser-based development environment.**

Casper Studio will combine the best of **Replit, Paperclip, and Cline** into a single browser-based development environment, powered by Casper Engine.

Features may include:

* browser IDE
* agent-assisted coding
* live previews
* collaborative development
* integrated agent orchestration

Casper Studio will run entirely on top of Casper Engine infrastructure.

Casper Studio will ship as an open source **Community Edition** for self-hosting, and a **hosted edition** for teams that prefer zero operational overhead — with managed workers, hosted preview environments, automatic scaling, and simplified setup.

---

# Long-Term Vision

Casper Engine aims to become the **Open Source foundation for agent-driven software development**.

Developers describe what they want built, and the engine:

* plans the work
* executes agents
* validates the result
* produces working outputs

All while keeping developers in control through familiar workflows like pull requests and code reviews.
