# Vision & Inspiration

This document captures the product vision, competitive positioning, and inspiration behind Casper Engine.

## What We're Building

Casper Engine is an **agentic coding engine** — the backend infrastructure that turns tasks into validated pull requests using LLM agents.

On top of this engine, we're building **Casper Studio** — a full browser-based development environment that combines the best ideas from:

- **Replit** — browser-based IDE, instant environments, collaborative coding
- **Cline** — agentic coding assistant with deep IDE integration
- **Paperclip** — AI-driven task management and code generation

The key differentiator: **Casper Engine is the open source core** that anyone can self-host and build on. Studio is the polished product layer on top.

## Product Strategy

```
Casper Engine (open source, MIT)
  └── Standalone API — orchestration, agents, execution, validation
  └── Self-hostable — own your entire pipeline

Casper Studio (open source CE + hosted edition)
  └── Browser-based development environment
  └── Task board, code editor, preview environments
  └── Community Edition — self-host for free
  └── Hosted Edition — managed SaaS, zero ops
```

## Core Principles

1. **API-first** — the engine is a standalone API; frontends are consumers, not dependencies
2. **Open source and feature-complete** — no artificial limits in the Community Edition
3. **LLM-agnostic** — any model, any provider, any CLI tool
4. **Self-hostable** — full control over your infrastructure and data
5. **Engine + Studio separation** — the engine is the foundation; Studio is one of many possible interfaces

## Competitive Landscape

| Product    | What they do                                    | How Casper differs                                              |
|------------|-------------------------------------------------|-----------------------------------------------------------------|
| Replit     | Browser-based IDE with AI features              | Casper is self-hostable, LLM-agnostic, API-first                |
| Cline      | VS Code extension for agentic coding            | Casper runs headless, scales horizontally, works from any input  |
| Paperclip  | AI task-to-PR pipeline                          | Casper is open source, extensible, supports agent teams          |
| Cursor     | AI-powered code editor                          | Casper is backend-focused, not tied to an editor                 |
| Windsurf   | AI IDE with agentic capabilities                | Casper separates engine from UI, fully open source               |
| Devin      | Autonomous AI software engineer                 | Casper is open source, self-hostable, multi-LLM                  |

## North Star

> Anyone should be able to describe what they want — in a Slack message, a GitHub issue, or a chat — and have working, validated code delivered as a pull request, iterable through review feedback.
