# Sparn — Project Constitution

> Non-negotiable principles governing specification, planning, and implementation.

---

## Article I: CLI-First, Library-Second

Every feature in Sparn MUST begin as a standalone, importable module under `src/core/`. Each module is exposed both as a programmatic API (`import { sparsePruner } from 'sparn'`) and as a CLI subcommand (`sparn optimize`). No feature shall exist only as a CLI command without a programmatic equivalent.

## Article II: Neuroscience Fidelity

Every core module MUST map to a documented neuroscience principle. The mapping between brain mechanism and software implementation MUST be explicit in code comments and in `docs/NEUROSCIENCE.md`. We do not use neuroscience terms as branding — we implement the actual mechanisms.

| Brain Mechanism | Module | Implementation |
|---|---|---|
| Sparse Coding | sparse-pruner | Keep 2-5% most relevant context |
| BTSP | btsp-embedder | One-shot pattern learning |
| Hippocampal KV | kv-memory | Separate index and retrieval stores |
| Engram Theory | engram-scorer | Temporal decay + TTL per entry |
| Multi-State Synapses | confidence-states | Silent/Ready/Active classification |
| Sleep Replay | sleep-compressor | Periodic memory consolidation |

## Article III: Test-First Development

This is NON-NEGOTIABLE. All implementation MUST follow strict TDD:

1. Unit tests are written FIRST
2. Tests are confirmed to FAIL (Red phase)
3. Implementation makes tests pass (Green phase)
4. Code is refactored while tests stay green (Refactor phase)

Every core module has a minimum of 5 unit tests. Integration tests cover all CLI commands. Tests use vitest. No `any` types. No untested code paths in core modules.

## Article IV: Agent-Agnostic Design

Sparn MUST work with any CLI-based AI agent. Agent-specific logic lives ONLY in `src/adapters/`. The core engine (`src/core/`) has ZERO knowledge of which agent is consuming it. Adding a new agent adapter MUST NOT require changes to core modules.

Supported agents for v0.1: Claude Code, generic (stdin/stdout).
Future: Gemini CLI, Codex, Cline, Aider.

## Article V: Complementary to RTK, Not Competitive

Sparn optimizes **context memory** (what enters the agent). RTK optimizes **CLI outputs** (what the agent reads from commands). These are different concerns. Sparn MUST never duplicate RTK functionality. Sparn SHOULD work alongside RTK in the same project. Documentation MUST explain this distinction clearly.

## Article VI: Minimal Dependencies

Every dependency MUST be justified. Prefer zero-dependency solutions when feasible. The core engine should have minimal runtime deps. SQLite (better-sqlite3) is the only allowed storage backend for v0.1 — no external services, no cloud, no network calls from core.

## Article VII: Simplicity First

- Maximum 3 levels of directory nesting in src/
- No abstract base classes unless shared by 3+ implementations
- No premature optimization — measure first, optimize second
- Config format is YAML, human-readable, with sensible defaults
- CLI output is clear and scannable in under 2 seconds

## Article VIII: Brand Consistency

All CLI output follows the Direction Artistique:
- Primary: `#00D4AA` (Neural Cyan) — success, active operations
- Secondary: `#7B61FF` (Synapse Violet) — highlights, graphs
- Error: `#FF6B6B` — failures, pruned items
- Font: JetBrains Mono in all docs and screenshots
- Logo: Minimalist lightning bolt with sparse dots
- Sound effects are ALWAYS optional (toggle off by default)

## Article IX: Production-Quality TypeScript

- Strict mode enabled
- No `any` types — use `unknown` + type guards when needed
- All public APIs have JSDoc comments
- Exported types for all core interfaces
- Build with tsup, lint with biome
- CI runs lint + typecheck + test on every push

---

## Amendments

Amendments to this constitution require:
- Explicit documentation of the rationale for change
- Review and approval by project maintainer (@ulrichc1)
- Backwards compatibility assessment

*Last updated: 2026-02-22*
