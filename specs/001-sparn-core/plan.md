# Implementation Plan: Sparn Core

**Branch**: `001-sparn-core` | **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `.specify/specs/001-sparn-core/spec.md`

## Summary

Sparn is an npm CLI package that applies 6 neuroscience-inspired principles (sparse coding, engram theory, hippocampal KV storage, multi-state synapses, sleep replay, BTSP) to intelligently prune, score, and compress AI agent context memory. The system reduces token usage by 60-90% while maintaining task completion quality through a dual CLI/library architecture with local SQLite storage and agent-agnostic design.

## Technical Context

**Language/Version**: TypeScript (strict mode), Node.js 18+
**Primary Dependencies**:
- Runtime: better-sqlite3 (SQLite storage), commander (CLI framework), chalk + ora + boxen (terminal UI)
- Config: cosmiconfig (YAML config), js-yaml (YAML parsing)
- Build: tsup (bundler), @types/node, @types/better-sqlite3
- Dev: vitest (testing), biome (lint/format), typescript (compiler)

**Storage**: SQLite via better-sqlite3 (local `.sparn/memory.db`, dual index/value tables)
**Testing**: vitest (unit + integration), minimum 5 tests per core module
**Target Platform**: macOS, Linux, Windows (WSL or native Node.js), cross-platform CLI
**Project Type**: Hybrid library + CLI (dual-purpose npm package)
**Performance Goals**:
- <500ms optimization latency for 100K tokens
- <10ms single SQLite read/write
- <200ms CLI startup time
- Max 500K tokens/optimization, max 10K DB entries

**Constraints**:
- <100MB memory usage for typical workloads
- No network calls from core modules
- No native deps beyond better-sqlite3
- Offline-capable, local-only storage
- Zero configuration for basic usage

**Scale/Scope**:
- 7 user stories (init, optimize, stats, relay, consolidate, config, library API)
- 6 core neuroscience modules + CLI + adapters
- Single-developer v0.1, npm-published package

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Article I: CLI-First, Library-Second
✅ **PASS** - All 6 core modules (sparse-pruner, engram-scorer, kv-memory, confidence-states, sleep-compressor, btsp-embedder) will be under `src/core/`, exposed as both programmatic API (`import { sparsePruner } from 'sparn'`) and CLI subcommands (`sparn optimize`).

### Article II: Neuroscience Fidelity
✅ **PASS** - Each of 6 modules maps to documented brain mechanism. Implementation plan includes `docs/NEUROSCIENCE.md` with explicit mappings. Code comments will reference neuroscience principles.

### Article III: Test-First Development
✅ **PASS** - TDD workflow required: tests written first, confirmed to fail, then implementation. Minimum 5 unit tests per core module using vitest. Integration tests for all CLI commands.

### Article IV: Agent-Agnostic Design
✅ **PASS** - Core modules (`src/core/`) have zero agent knowledge. Agent-specific logic isolated in `src/adapters/` (Claude Code adapter, generic stdin/stdout adapter). Generic adapter demonstrates extensibility.

### Article V: Complementary to RTK, Not Competitive
✅ **PASS** - Sparn optimizes context memory (input to agent), RTK optimizes CLI outputs (agent reads). Different concerns, non-overlapping. Documentation will clarify distinction.

### Article VI: Minimal Dependencies
✅ **PASS** - Only justified runtime deps: better-sqlite3 (required for persistence), commander/chalk/ora/boxen (CLI UX), cosmiconfig (config). No external services, no cloud, no network calls from core.

### Article VII: Simplicity First
✅ **PASS** - Max 3 dir levels: `src/core/`, `src/adapters/`, `src/cli/`. YAML config with defaults. No abstract base classes (each module standalone). Sub-500ms optimization meets "scannable under 2 seconds" CLI output goal.

### Article VIII: Brand Consistency
✅ **PASS** - Terminal UI will use Neural Cyan (#00D4AA) for success/active, Synapse Violet (#7B61FF) for highlights, Error Red (#FF6B6B) for failures. JetBrains Mono in docs. Sound effects optional (default off).

### Article IX: Production-Quality TypeScript
✅ **PASS** - TypeScript strict mode enabled. No `any` types (use `unknown` + guards). JSDoc on all public APIs. Full type exports. Build with tsup, lint with biome. CI runs lint + typecheck + test.

**Gate Status: ✅ ALL CHECKS PASSED** - No constitution violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── core/                       # Core neuroscience modules (library exports)
│   ├── sparse-pruner.ts
│   ├── engram-scorer.ts
│   ├── kv-memory.ts
│   ├── confidence-states.ts
│   ├── sleep-compressor.ts
│   └── btsp-embedder.ts
├── adapters/                   # Agent-specific adapters
│   ├── claude-code.ts
│   └── generic.ts
├── cli/                        # CLI command implementations
│   ├── commands/
│   │   ├── init.ts
│   │   ├── optimize.ts
│   │   ├── stats.ts
│   │   ├── consolidate.ts
│   │   ├── relay.ts
│   │   └── config.ts
│   ├── ui/                     # Terminal UI components
│   │   ├── banner.ts
│   │   ├── colors.ts
│   │   └── progress.ts
│   └── index.ts                # CLI entry point
├── types/                      # Shared TypeScript types
│   ├── memory.ts
│   ├── config.ts
│   └── adapter.ts
├── utils/                      # Shared utilities
│   ├── tokenizer.ts
│   ├── hash.ts
│   └── logger.ts
└── index.ts                    # Main library export

tests/
├── unit/                       # Unit tests (min 5 per core module)
│   ├── sparse-pruner.test.ts
│   ├── engram-scorer.test.ts
│   ├── kv-memory.test.ts
│   ├── confidence-states.test.ts
│   ├── sleep-compressor.test.ts
│   └── btsp-embedder.test.ts
├── integration/                # CLI integration tests
│   ├── init.test.ts
│   ├── optimize.test.ts
│   └── workflow.test.ts
└── fixtures/                   # Test data
    └── sample-contexts/

docs/
├── NEUROSCIENCE.md             # Brain-to-code mappings
└── api/                        # Generated API docs
```

**Structure Decision**: Single project (Option 1) with library/CLI hybrid architecture. Core modules under `src/core/` are importable as library and wrapped by CLI commands. Agent adapters isolated in `src/adapters/`. Maximum 3 directory levels in `src/` (Article VII compliance).

## Complexity Tracking

> **No constitution violations** - All checks passed. No complexity justifications required.

---

## Phase 0: Research (Complete ✅)

**Status**: All technical unknowns resolved

**Deliverables**:
- ✅ `research.md` — 10 key technical decisions documented
  - SQLite schema design (dual index/value tables)
  - Token counting strategy (whitespace heuristic, ~90% accuracy)
  - TF-IDF implementation (sqrt capping, entry-level IDF)
  - Exponential decay formula (hours-based TTL)
  - Confidence state transition logic (thresholds from clarifications)
  - BTSP detection heuristics (pattern-based)
  - Sleep compression deduplication (SHA-256 + cosine similarity)
  - CLI framework (Commander.js + chalk + ora + boxen)
  - Config management (Cosmiconfig + YAML)
  - Cross-platform path handling (Node.js path module)

**Key Findings**:
- No external dependencies beyond specified constraints
- All performance targets achievable with chosen tech stack
- Constitution compliance verified for all decisions

---

## Phase 1: Design & Contracts (Complete ✅)

**Status**: All design artifacts generated

**Deliverables**:
- ✅ `data-model.md` — Complete TypeScript interfaces and SQLite schema
  - MemoryEntry structure (11 fields)
  - Database schema (entries_index, entries_value, optimization_stats)
  - SparnConfig interface with validation rules
  - AgentAdapter contract
  - CLI command schemas (init, optimize, stats, relay, consolidate, config)
  - Core module interfaces (6 neuroscience modules)

- ✅ `contracts/cli-commands.md` — CLI command specifications
  - All 6 commands with usage, options, output formats
  - Global flags (--help, --json, --version)
  - Exit codes (0 success, 1 error, 2 partial)
  - ASCII banner and color scheme (Article VIII compliance)

- ✅ `contracts/library-api.md` — Programmatic API specifications
  - All 6 core module factories and interfaces
  - JSDoc examples and usage patterns
  - TypeScript type exports
  - Full pipeline integration example

- ✅ `quickstart.md` — Getting started guide
  - CLI quick start (init, optimize, relay, stats, consolidate, config)
  - Programmatic API quick start
  - Common workflows (Claude Code integration, daily cleanup, git diff optimization)
  - Configuration reference
  - Troubleshooting guide

- ✅ `CLAUDE.md` (agent context) — Updated with TypeScript + Node.js stack

**Architecture Summary**:
```
src/core/          → 6 neuroscience modules (library exports)
src/adapters/      → Agent-specific logic (Claude Code, generic)
src/cli/           → CLI command implementations
src/types/         → Shared TypeScript types
src/utils/         → Shared utilities (tokenizer, hash, logger)
tests/unit/        → Min 5 tests per core module
tests/integration/ → CLI workflow tests
```

**Constitution Check (Re-evaluation)**:
- ✅ Article I: CLI-First, Library-Second — Dual API confirmed in library-api.md
- ✅ Article II: Neuroscience Fidelity — All 6 modules mapped in data-model.md
- ✅ Article III: Test-First Development — Test structure defined, ready for TDD
- ✅ Article IV: Agent-Agnostic Design — Adapter pattern confirmed in contracts
- ✅ Article V: Complementary to RTK — Distinct concerns verified
- ✅ Article VI: Minimal Dependencies — Only justified deps (better-sqlite3, commander, chalk, ora, boxen, cosmiconfig)
- ✅ Article VII: Simplicity First — 3-level max directory nesting, YAML config
- ✅ Article VIII: Brand Consistency — Color scheme (#00D4AA, #7B61FF, #FF6B6B) documented
- ✅ Article IX: Production-Quality TypeScript — JSDoc, strict types, no `any`

**All gates passed ✅** — Ready for implementation

---

## Next Steps

**Phase 2: Implementation**

Use `/speckit.tasks` to generate implementation task list from:
- User stories (spec.md)
- Core modules (data-model.md)
- CLI commands (contracts/cli-commands.md)
- Library API (contracts/library-api.md)

**Recommended Task Order**:
1. Project setup (tsconfig, package.json, build config)
2. Core types and utilities (src/types/, src/utils/)
3. TDD for core modules (tests first, per Article III)
4. KVMemory implementation (foundation for other modules)
5. Other core modules (sparse-pruner, engram-scorer, confidence-states, btsp-embedder, sleep-compressor)
6. Adapters (generic first, Claude Code second)
7. CLI commands (init → optimize → relay → stats → consolidate → config)
8. Integration tests
9. Documentation (NEUROSCIENCE.md, README.md)
10. Packaging and publish

**Success Criteria Verification**:
- [ ] Reduce token usage by 60-90% (benchmark with real contexts)
- [ ] Zero configuration works (`sparn init` + `sparn optimize`)
- [ ] Sub-500ms optimization for 100K tokens (performance test)
- [ ] Works with generic adapter (extensibility proof)
