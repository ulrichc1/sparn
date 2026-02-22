# Feature Specification: Sparn Core

Branch: 001-sparn-core | Date: 2026-02-22

---

## 1. Overview

### Problem Statement

AI coding agents (Claude Code, Gemini CLI, Codex, etc.) consume massive amounts of tokens by maintaining bloated context windows. Up to 95% of context is irrelevant noise — old file contents, stale conversation history, redundant instructions. This waste increases cost, slows responses, and degrades agent performance.

### Proposed Solution

Sparn is an npm CLI package that applies 6 neuroscience principles to intelligently prune, score, and compress agent context memory. It acts as a middleware layer between the developer and their AI agent, optimizing what enters the context window.

### Success Criteria

- Reduce token usage by 60-90% on average across supported agents
- Maintain or improve agent task completion quality
- Zero configuration needed for basic usage (`sparn init` + `sparn optimize`)
- Sub-500ms optimization latency for contexts under 100K tokens
- Work with any CLI-based agent via generic adapter

### Out of Scope (v0.1)

- Web dashboard or GUI
- Cloud sync or team features
- Training or fine-tuning models
- Modifying agent behavior directly
- Supporting non-CLI agents (VS Code extensions, IDEs)

---

## 2. User Stories

### US-1: Initialize Sparn in a project

> As a developer using an AI coding agent, I want to initialize sparn in my project so that it can start tracking and optimizing my agent's context memory.

**Acceptance Criteria:**
- Running `sparn init` in a project creates a `.sparn/` directory with default config
- The config file is human-readable YAML with documented options
- If `.sparn/` already exists, the command asks for confirmation before overwriting
- A SQLite database is created at `.sparn/memory.db` for the KV store
- Initialization completes in under 2 seconds
- Terminal shows a branded welcome message with the sparn banner

### US-2: Optimize context before agent interaction

> As a developer, I want to run `sparn optimize` to prune and compress my agent's context before sending it, so that I use fewer tokens while keeping the relevant information.

**Acceptance Criteria:**
- Reads context from stdin or from a specified file
- Applies the full optimization pipeline: sparse pruning → engram scoring → confidence filtering → compression
- Outputs optimized context to stdout (pipeable) or to a specified output file
- Displays a summary: tokens before, tokens after, reduction percentage, engrams active/pruned
- Supports `--agent <name>` flag to use agent-specific optimization profiles
- Supports `--dry-run` flag to show what would be pruned without actually doing it
- Supports `--verbose` flag for detailed per-entry scoring output

### US-3: View optimization statistics

> As a developer, I want to see cumulative statistics about how sparn has optimized my token usage over time, so that I can quantify the savings.

**Acceptance Criteria:**
- `sparn stats` shows: total commands run, total tokens saved, average reduction %, session count
- `sparn stats --graph` shows a bar chart of savings over time (last 7 days or last 20 sessions)
- Stats are persisted in the local SQLite database
- `sparn stats --reset` clears all statistics with confirmation prompt

### US-4: Run commands through sparn relay

> As a developer, I want to pipe CLI commands through sparn so that their output is automatically optimized before being consumed by my agent.

**Acceptance Criteria:**
- `sparn relay <command>` executes the command and pipes output through the optimization pipeline
- Works with any shell command (git, npm, cargo, etc.)
- Preserves exit codes from the proxied command
- Shows a one-line summary of token savings after the proxied output
- Supports `--silent` flag to suppress the savings summary

### US-5: Consolidate memory (sleep compression)

> As a developer, I want to periodically consolidate my project's memory store so that old, decayed entries are compressed or removed, keeping the memory lean.

**Acceptance Criteria:**
- `sparn consolidate` runs a full sleep compression cycle
- Entries below the decay threshold are archived or removed
- Similar entries are merged/deduplicated
- Shows a report: entries before, entries after, compression ratio
- Can be run manually or scheduled via `sparn config --auto-consolidate <interval>`

### US-6: Configure sparn behavior

> As a developer, I want to customize sparn's optimization parameters so that I can tune it for my specific project and workflow.

**Acceptance Criteria:**
- `sparn config` opens or displays current configuration
- `sparn config set <key> <value>` modifies a specific setting
- Configurable options include: pruning aggressiveness (0-100), decay rate, TTL default, sounds toggle, agent profile, auto-consolidation interval
- All options have sensible defaults documented in the YAML config
- Invalid values are rejected with helpful error messages

### US-7: Use sparn as a library (programmatic API)

> As a tool developer, I want to import sparn's core modules into my own Node.js project so that I can build custom optimization pipelines.

**Acceptance Criteria:**
- `import { sparsePruner, engramScorer, kvMemory } from 'sparn'` works
- Each core module exports a clean, typed API with JSDoc
- Types are published alongside the package (`sparn/types`)
- Modules can be used independently (no forced coupling)

---

## 3. Functional Requirements

### FR-1: Sparse Pruner Module

Maps to: **Sparse Coding** — only 2-5% of neurons fire for any given stimulus.

- Analyzes input context and scores each segment for relevance
- Uses TF-IDF-like heuristics combined with recency weighting
- Configurable pruning threshold (default: keep top 5%)
- Returns pruned context + pruning report (what was removed and why)

### FR-2: Engram Scorer Module

Maps to: **Engram Theory** — memories have physical traces that decay over time.

- Assigns a decay score to each memory entry based on age and access frequency
- Each entry has a TTL (time-to-live) measured in hours (default: 24 hours)
- Recently accessed entries get TTL refreshed (reinforcement)
- Entries below score threshold are marked for pruning
- Score formula: `score = baseRelevance * recencyBoost * accessFrequency * (1 - decay)`

**Decay Details:**
- TTL units: Hours (stored as integer seconds in database)
- Decay formula: Exponential decay `decay = 1 - e^(-age/TTL)` where age is in hours
- Default TTL: 24 hours (86400 seconds)
- Decay threshold: 0.95 (entries with decay ≥ 0.95 are marked for pruning)
- TTL refresh on access: Reset to default TTL value

### FR-3: KV Memory Store Module

Maps to: **Hippocampal Key-Value** — the hippocampus separates what to store from how to retrieve it.

- Stores memory entries in a local SQLite database
- Separate index (fast key lookup) and value (full content) tables
- Supports operations: put, get, query, delete, list, compact
- Keys are content hashes or user-defined labels
- Supports tags and metadata per entry
- Compact operation removes orphaned indexes and expired entries

**Memory Entry Structure:**
- `id` (string): Unique identifier (UUID or auto-increment)
- `content` (text): The actual memory content/context data
- `hash` (string): SHA-256 hash of content for deduplication
- `timestamp` (integer): Unix timestamp of creation
- `score` (float): Current engram score (0.0-1.0)
- `ttl` (integer): Time-to-live in seconds remaining
- `state` (string): Confidence state ("silent" | "ready" | "active")
- `accessCount` (integer): Number of times accessed/retrieved
- `tags` (JSON array): User-defined tags for categorization
- `metadata` (JSON object): Additional key-value pairs
- `isBTSP` (boolean): Flag indicating one-shot learned entry

### FR-4: Confidence States Module

Maps to: **Multi-State Synapses** — synapses exist in silent, ready, or active states.

- Classifies each memory entry into one of three states:
  - **Silent**: Low relevance (score < 0.3), not included in context (but retained in store)
  - **Ready**: Moderate relevance (score 0.3-0.7), included if space permits
  - **Active**: High relevance (score > 0.7), always included in context
- State transitions based on access patterns and engram scores
- State distribution is shown in stats output

**State Transition Rules:**
- Score ≤ 0.3: Transition to Silent
- 0.3 < Score ≤ 0.7: Transition to Ready
- Score > 0.7: Transition to Active
- State recalculated after each access or consolidation cycle
- BTSP-flagged entries start in Active state regardless of score

### FR-5: Sleep Compressor Module

Maps to: **Sleep Replay** — the brain consolidates memories during sleep cycles.

- Runs periodic consolidation cycles on the memory store
- Groups similar entries and merges them into compressed summaries
- Removes entries that have fully decayed below threshold
- Deduplicates near-identical entries
- Produces a consolidation report

### FR-6: BTSP Embedder Module

Maps to: **Behavioral Time-Scale Synaptic Plasticity** — single-exposure learning.

- Enables one-shot context learning: new important patterns are stored immediately
- Detects novel or high-signal entries (error messages, new file structures, key decisions)
- Bypasses the normal decay pipeline for critical entries
- Assigns initial high confidence to one-shot learned entries

### FR-7: CLI Interface

- Entry point: `sparn` binary via npm global install
- Subcommands: `init`, `optimize`, `stats`, `consolidate`, `relay`, `config`
- All commands display branded terminal UI (colors, progress, boxen frames)
- ASCII banner shown on first run and on `sparn --version`
- `--help` available on every subcommand
- `--json` flag on all commands for machine-readable output
- Exit codes: 0 success, 1 error, 2 partial (some entries failed)

### FR-8: Agent Adapters

- Claude Code adapter: hooks into PreToolUse for context injection
- Generic adapter: reads from stdin, writes to stdout
- Each adapter implements a common interface: `optimize(context) → optimizedContext`
- Adapter selection via `--agent` flag or `.sparn/config.yaml`

**Context Format (v0.1):**
- Input: Plain text (line-based), read from stdin or file
- Output: Plain text (line-based), written to stdout or file
- Each line treated as a potential memory entry candidate
- Empty lines preserved for formatting
- No special markup or structure required

---

## 4. Non-Functional Requirements

### Performance
- Optimization of 100K tokens completes in under 500ms
- Maximum supported context size: 500K tokens per optimization
- Maximum database capacity: 10K memory entries (older entries auto-pruned)
- SQLite operations (single read/write) complete in under 10ms
- CLI startup time under 200ms
- Memory usage under 100MB for typical workloads

### Reliability
- Graceful degradation: if optimization fails, pass through original context
- SQLite database corruption recovery via automatic backup
- No data loss on unexpected termination

### Portability
- Works on macOS, Linux, and Windows (via WSL or native Node.js)
- Node.js 18+ required
- No native dependencies beyond better-sqlite3

### Security
- No network calls from core modules
- No telemetry or analytics
- Memory store is local-only, readable only by project owner
- No API keys or credentials stored in config

---

## 5. Technical Constraints

- Language: TypeScript (strict mode)
- Runtime: Node.js 18+
- Build: tsup
- Test: vitest
- Lint: biome
- Storage: better-sqlite3
- CLI: commander + chalk + ora + boxen
- Config: cosmiconfig (reads `.sparn/config.yaml`)
- Package manager: npm (published to npmjs.com as `sparn`)
- License: MIT

---

## 6. Review & Acceptance Checklist

- [ ] All 7 user stories have passing acceptance tests
- [ ] All 8 functional requirements are implemented with unit tests
- [ ] Non-functional requirements are verified (perf benchmarks, cross-platform)
- [ ] `sparn init` → `sparn optimize` → `sparn stats` workflow works end-to-end
- [ ] `sparn relay git status` works and shows savings
- [ ] Programmatic API (`import from 'sparn'`) works with types
- [ ] CLI help text is complete and accurate for all subcommands
- [ ] README.md is complete with usage examples and terminal screenshots
- [ ] NEUROSCIENCE.md documents all 6 brain-to-code mappings
- [ ] npm publish dry-run succeeds
- [ ] CI pipeline (lint + typecheck + test + build) passes

---

## 7. Clarifications

### Session 2026-02-22

- Q: Memory Entry Data Structure - What fields does a memory entry contain? → A: Complete structure with `{ id, content, hash, timestamp, score, ttl, state, accessCount, tags, metadata, isBTSP }`
- Q: Scalability & Performance Limits - What are the maximum context size and database capacity? → A: Max 500K tokens per optimization, max 10K entries in database
- Q: Context Input/Output Format - What format is the context data? → A: Plain text only (line-based, universal compatibility)
- Q: TTL Units and Decay Rate - What time units and decay formula? → A: Hours-based TTL with exponential decay, default 24 hours
- Q: Confidence State Transition Thresholds - What score thresholds trigger state changes? → A: Active >0.7, Ready 0.3-0.7, Silent <0.3

---

*Author: @ulrichc1*
*Status: Draft*
