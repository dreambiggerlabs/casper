# 👻 Casper Engine

> 🚧 **Currently in development**  
> Casper Engine is actively being built and will be released soon.  
> If you're interested, ⭐ follow/watch this repository for updates and early releases.

**Agentic coding engine** — receive tasks from Slack, GitHub, GitLab or a REST API, dispatch them to LLM agents running inside isolated environments, validate changes through a multi-step pipeline, open pull requests, and iterate on review feedback.

---

## Overview

Casper Engine is the foundation for building agent-driven development tools.

It bridges the gap between developer intent and working code. You describe what you want in a GitHub issue, a Slack message or a REST call and Casper Engine agentically implements it, validates it, opens a pull request, and refines it based on your review.

Behind the scenes, Casper Engine acts like your own team of **AI ghost producers** — quietly turning tasks and ideas into working code while you stay focused on the bigger picture.

The goal of Casper Engine is to provide a **powerful backend engine** that developers can build their own interfaces on top of. Whether you want a simple Kanban-style task board, a chat-based interface, or a full **Replit-like development environment**, Casper Engine provides the infrastructure to make it possible.

Casper Engine is built as a **standalone API** — it does not ship with or depend on any frontend. The entire focus is on delivering a rock-solid agentic coding engine: task orchestration, agent execution, validation pipelines, and integrations. Bring your own UI, or use one of the community or first-party frontends that build on top of the API.

No context switching. No boilerplate. Just working code.

---

## Key Features

**Work from anywhere.** Create and refine tasks from your phone, laptop, or anywhere in the world. Describe work in natural language and receive previews or artifacts without needing a local development environment.

**Works where you already work.** Submit tasks from GitHub Issues, GitLab Issues, Slack, or directly via the REST API. Casper Engine normalizes all inputs into the same pipeline — no special setup per channel.

**Interactive or autonomous execution.** Stay in control with **interactive mode**. When enabled, agents keep the human in the loop and will ask questions whenever they need clarification — for example when proposing a plan, choosing an implementation strategy, or making important decisions. This allows you to guide the process step-by-step while the agent does the heavy lifting.

**Your LLM, your terms.** Agents can run on any coding adapter — Codex, Claude Code, Gemini CLI, OpenCode, or any other tool — and use any LLM: Opus 4.6, GPT-5.4, GLM-5, Kimi K2.5, or any OpenAI-compatible endpoint (Ollama, vLLM, LM Studio). Use an API key, or skip the API entirely and use your existing subscription via the CLI tools — zero additional cost.

**Validation before you ever see the PR.** Every change runs through a configurable pipeline: formatter, linter, typechecker, tests, integration tests, build. The agent auto-repairs failures and retries before surfacing the PR.

**Distributed execution.** Agents run inside ephemeral Docker containers with isolation by default. Workers scale horizontally — spin up additional worker instances and they automatically register with the API and begin accepting jobs.

**Preview environments and artifacts.** Optionally spin up Docker Compose previews per branch (identified by `casper/<task-uuid>`) via `.casper/preview.yml`. Routing is label-driven through your server-side proxy (Caddy/Traefik/Nginx).  
Preview jobs can also generate **build artifacts** such as APK files, compiled binaries, static builds, or other downloadable outputs so you can test results immediately without merging the code.

**Review-driven iteration.** Refine results directly from your code review workflow. Comment on a pull/merge request, leave feedback on specific lines of code (inline review comments), or respond in a discussion thread. Casper Engine picks up the feedback, re-runs the agent with your instructions, updates the branch, and waits for the next review.

**Single agents or agent teams.** Run a single agent on a focused task, or assemble a team of agents that collaborate on a larger objective. Team members communicate with each other, decompose work, execute in parallel where possible, and merge the results — all within one task lifecycle.

**Skill-based agents.** Each agent has a defined skill — documentation, testing, refactoring, architecture, frontend, etc. Skills shape the agent's system prompt, tool access, and conventions so it stays focused on what it does best.

**Right model for the job.** Assign different LLM models per agent based on task complexity. A documentation agent can use a fast, inexpensive model while an architecture agent uses an advanced reasoning model — optimising cost without sacrificing quality where it matters.

**Cost-controlled.** Per-task token budgets enforce spend limits. Subscription-based providers report zero cost. Costs are tracked and persisted per agent run.

**Open source and feature-complete.** The Community Edition is fully open source under the MIT license and ships with every core capability — no artificial limits, no feature gates. Self-host it on your own infrastructure and own your entire pipeline.

**Managed SaaS available.** Prefer not to self-host? Casper Studio will offer a hosted edition with zero operational overhead — we handle infrastructure, updates, and scaling for you.

---

## Ecosystem Vision

Casper Engine is designed as the **core infrastructure layer** for agent-driven development platforms.

The engine itself focuses on orchestration, agents, execution environments, and task pipelines. On top of this engine, multiple interfaces and products will be built.

- **Casper Engine** — the open source orchestration engine and agent platform
- **Casper Studio** — a full browser-based development environment combining the best of Replit, Paperclip, and Cline — available as an open source Community Edition or a managed hosted edition

Because Casper Engine exposes its functionality through APIs and workers, developers can also build **their own custom frontends and workflows** on top of it.

---

## How It Works

```mermaid
flowchart LR
    subgraph Entrypoints
        GH[GitHub Issue]
        GL[GitLab Issue]
        SL[Slack Message]
        API[REST API]
    end

    subgraph Casper Engine Platform
        Q[Task Queue]
        W[Worker]

        subgraph Agent Execution
            SA[Single Agent]
            AT[Agent Team]
            SA -.- SK1[Skill + Model]
            AT -.- SK2[Skill + Model per Agent]
        end

        V{Validation Pipeline}
    end

    PR[Pull Request / Merge Request]
    FB[Review Feedback]

    GH --> Q
    GL --> Q
    SL --> Q
    API --> Q
    Q --> W
    W --> SA
    W --> AT
    SA --> V
    AT --> V
    V -- pass --> PR
    V -- fail --> SA
    V -- fail --> AT
    PR --> FB
    FB --> Q
```

---

## License

MIT
