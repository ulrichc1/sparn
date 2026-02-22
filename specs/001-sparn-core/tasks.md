# Tasks: Sparn Core

**Input**: Design documents from `.specify/specs/001-sparn-core/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/, research.md, quickstart.md

**Tests**: TDD is NON-NEGOTIABLE per Article III. All test tasks are REQUIRED and must be completed BEFORE implementation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths follow plan.md structure: `src/core/`, `src/adapters/`, `src/cli/`, `src/types/`, `src/utils/`

---

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETE

**Purpose**: Project initialization and basic structure

- [X] T001 Initialize Node.js project with package.json (name: sparn, version: 0.1.0, license: MIT)
- [X] T002 [P] Configure TypeScript with strict mode in tsconfig.json
- [X] T003 [P] Configure tsup build config in tsup.config.ts
- [X] T004 [P] Configure vitest testing framework in vitest.config.ts
- [X] T005 [P] Configure biome linter and formatter in biome.json
- [X] T006 Create directory structure: src/core, src/adapters, src/cli/commands, src/cli/ui, src/types, src/utils
- [X] T007 [P] Create directory structure: tests/unit, tests/integration, tests/fixtures/sample-contexts
- [X] T008 [P] Create docs/ directory for NEUROSCIENCE.md and api/
- [X] T009 Install runtime dependencies: better-sqlite3, commander, chalk, ora, boxen, cosmiconfig, js-yaml
- [X] T010 [P] Install dev dependencies: typescript, tsup, vitest, biome, @types/node, @types/better-sqlite3
- [X] T011 Add npm scripts: build, test, lint, dev, typecheck in package.json
- [X] T012 [P] Create .gitignore (node_modules, dist, .sparn, *.log)
- [X] T013 [P] Create LICENSE file (MIT)

---

## Phase 2: Foundational (Blocking Prerequisites) ✅ COMPLETE

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**✅ COMPLETE**: Foundation ready - user story implementation can now begin in parallel

- [X] T014 [P] Create MemoryEntry interface in src/types/memory.ts
- [X] T015 [P] Create ConfidenceState type in src/types/memory.ts
- [X] T016 [P] Create SparnConfig interface in src/types/config.ts
- [X] T017 [P] Create AgentAdapter interface in src/types/adapter.ts
- [X] T018 [P] Create OptimizationResult interface in src/types/adapter.ts
- [X] T019 [P] Create PruneResult interface in src/types/pruner.ts
- [X] T020 [P] Create ConsolidateResult interface in src/types/consolidate.ts
- [X] T021 Implement estimateTokens utility in src/utils/tokenizer.ts (whitespace heuristic)
- [X] T022 [P] Implement hashContent utility in src/utils/hash.ts (SHA-256)
- [X] T023 [P] Implement logger utility in src/utils/logger.ts (console wrapper with levels)
- [X] T024 [P] Create color constants in src/cli/ui/colors.ts (Neural Cyan #00D4AA, Synapse Violet #7B61FF, Error Red #FF6B6B)
- [X] T025 [P] Create ASCII banner in src/cli/ui/banner.ts

**Checkpoint**: ✅ Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Initialize Sparn (Priority: P1) 🎯 MVP ✅ COMPLETE

**Goal**: Enable developers to initialize Sparn in their project with `sparn init`

**Independent Test**: ✅ Run `sparn init` in empty directory, verify `.sparn/` created with config.yaml and memory.db, completes <2s

### Tests for User Story 1 (Article III: TDD - Tests FIRST)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T026 [P] [US1] Unit test: createKVMemory initializes SQLite database at path in tests/unit/kv-memory.test.ts
- [X] T027 [P] [US1] Unit test: createKVMemory creates entries_index table with correct schema in tests/unit/kv-memory.test.ts
- [X] T028 [P] [US1] Unit test: createKVMemory creates entries_value table with correct schema in tests/unit/kv-memory.test.ts
- [X] T029 [P] [US1] Unit test: createKVMemory creates optimization_stats table in tests/unit/kv-memory.test.ts
- [X] T030 [P] [US1] Unit test: createKVMemory creates all required indexes in tests/unit/kv-memory.test.ts
- [X] T031 [P] [US1] Integration test: `sparn init` creates .sparn/ directory in tests/integration/init.test.ts
- [X] T032 [P] [US1] Integration test: `sparn init` creates config.yaml with defaults in tests/integration/init.test.ts
- [X] T033 [P] [US1] Integration test: `sparn init` prompts on overwrite without --force in tests/integration/init.test.ts
- [X] T034 [P] [US1] Integration test: `sparn init --force` overwrites existing .sparn/ in tests/integration/init.test.ts
- [X] T035 [P] [US1] Integration test: `sparn init` completes in under 2 seconds in tests/integration/init.test.ts

### Implementation for User Story 1

- [X] T036 [US1] Implement createKVMemory factory in src/core/kv-memory.ts (SQLite init, schema creation)
- [X] T037 [US1] Implement KVMemory.put method in src/core/kv-memory.ts (dual table insert)
- [X] T038 [US1] Implement KVMemory.get method in src/core/kv-memory.ts (join index + value)
- [X] T039 [US1] Implement KVMemory.query method in src/core/kv-memory.ts (filter by state, score, tags)
- [X] T040 [US1] Implement KVMemory.delete method in src/core/kv-memory.ts (cascade delete)
- [X] T041 [US1] Implement KVMemory.list method in src/core/kv-memory.ts (return all IDs)
- [X] T042 [US1] Implement KVMemory.compact method in src/core/kv-memory.ts (VACUUM)
- [X] T043 [US1] Implement KVMemory.close method in src/core/kv-memory.ts (close connection)
- [X] T044 [US1] Implement init command in src/cli/commands/init.ts (create .sparn/, config, db)
- [X] T045 [US1] Add default config template with all options documented in src/cli/commands/init.ts
- [X] T046 [US1] Add overwrite confirmation prompt in src/cli/commands/init.ts
- [X] T047 [US1] Display branded banner on success in src/cli/commands/init.ts
- [X] T048 [US1] Wire init command to CLI entry point in src/cli/index.ts

**Checkpoint**: ✅ User Story 1 is fully functional and testable independently - `sparn init` WORKING!

---

## Phase 4: User Story 2 - Optimize Context (Priority: P1)

**Goal**: Enable context optimization via `sparn optimize` using full neuroscience pipeline

**Independent Test**: Pipe 100K token context to `sparn optimize`, verify 60-90% reduction, <500ms duration

### Tests for User Story 2 (Article III: TDD - Tests FIRST)

- [X] T049 [P] [US2] Unit test: SparsePruner.prune keeps top 5% by TF-IDF relevance in tests/unit/sparse-pruner.test.ts
- [X] T050 [P] [US2] Unit test: SparsePruner.prune returns PruneResult with kept/removed entries in tests/unit/sparse-pruner.test.ts
- [X] T051 [P] [US2] Unit test: SparsePruner.scoreEntry calculates TF-IDF correctly in tests/unit/sparse-pruner.test.ts
- [X] T052 [P] [US2] Unit test: SparsePruner handles empty context gracefully in tests/unit/sparse-pruner.test.ts
- [X] T053 [P] [US2] Unit test: SparsePruner handles single-line context in tests/unit/sparse-pruner.test.ts
- [X] T054 [P] [US2] Unit test: EngramScorer.calculateScore uses exponential decay formula in tests/unit/engram-scorer.test.ts
- [X] T055 [P] [US2] Unit test: EngramScorer.calculateScore factors in accessCount in tests/unit/engram-scorer.test.ts
- [X] T056 [P] [US2] Unit test: EngramScorer.refreshTTL resets TTL to default in tests/unit/engram-scorer.test.ts
- [X] T057 [P] [US2] Unit test: EngramScorer.calculateDecay returns 0.0-1.0 range in tests/unit/engram-scorer.test.ts
- [X] T058 [P] [US2] Unit test: EngramScorer marks entries with decay ≥0.95 for pruning in tests/unit/engram-scorer.test.ts
- [X] T059 [P] [US2] Unit test: ConfidenceStates.calculateState returns 'silent' for score <0.3 in tests/unit/confidence-states.test.ts
- [X] T060 [P] [US2] Unit test: ConfidenceStates.calculateState returns 'ready' for score 0.3-0.7 in tests/unit/confidence-states.test.ts
- [X] T061 [P] [US2] Unit test: ConfidenceStates.calculateState returns 'active' for score >0.7 in tests/unit/confidence-states.test.ts
- [X] T062 [P] [US2] Unit test: ConfidenceStates.calculateState returns 'active' for isBTSP=true regardless of score in tests/unit/confidence-states.test.ts
- [X] T063 [P] [US2] Unit test: ConfidenceStates.transition updates entry state correctly in tests/unit/confidence-states.test.ts
- [X] T064 [P] [US2] Unit test: BTSPEmbedder.detectBTSP identifies error patterns in tests/unit/btsp-embedder.test.ts
- [X] T065 [P] [US2] Unit test: BTSPEmbedder.detectBTSP identifies stack traces in tests/unit/btsp-embedder.test.ts
- [X] T066 [P] [US2] Unit test: BTSPEmbedder.detectBTSP identifies git diff new files in tests/unit/btsp-embedder.test.ts
- [X] T067 [P] [US2] Unit test: BTSPEmbedder.detectBTSP identifies merge conflicts in tests/unit/btsp-embedder.test.ts
- [X] T068 [P] [US2] Unit test: BTSPEmbedder.createBTSPEntry sets isBTSP=true, state='active', score=1.0 in tests/unit/btsp-embedder.test.ts
- [X] T069 [P] [US2] Integration test: `sparn optimize` reads from stdin in tests/integration/optimize.test.ts
- [X] T070 [P] [US2] Integration test: `sparn optimize --input file.txt` reads from file in tests/integration/optimize.test.ts
- [X] T071 [P] [US2] Integration test: `sparn optimize --output out.txt` writes to file in tests/integration/optimize.test.ts
- [X] T072 [P] [US2] Integration test: `sparn optimize --dry-run` doesn't modify memory store in tests/integration/optimize.test.ts
- [X] T073 [P] [US2] Integration test: `sparn optimize --verbose` shows per-entry scores in tests/integration/optimize.test.ts
- [X] T074 [P] [US2] Integration test: `sparn optimize` completes 100K tokens in <500ms in tests/integration/optimize.test.ts

### Implementation for User Story 2

- [X] T075 [P] [US2] Implement createSparsePruner factory in src/core/sparse-pruner.ts
- [X] T076 [US2] Implement SparsePruner.prune with TF-IDF algorithm in src/core/sparse-pruner.ts
- [X] T077 [US2] Implement SparsePruner.scoreEntry with sqrt term frequency capping in src/core/sparse-pruner.ts
- [X] T078 [P] [US2] Implement createEngramScorer factory in src/core/engram-scorer.ts
- [X] T079 [US2] Implement EngramScorer.calculateScore with exponential decay in src/core/engram-scorer.ts
- [X] T080 [US2] Implement EngramScorer.refreshTTL with TTL reset logic in src/core/engram-scorer.ts
- [X] T081 [US2] Implement EngramScorer.calculateDecay helper in src/core/engram-scorer.ts
- [X] T082 [P] [US2] Implement createConfidenceStates factory in src/core/confidence-states.ts
- [X] T083 [US2] Implement ConfidenceStates.calculateState with threshold logic in src/core/confidence-states.ts
- [X] T084 [US2] Implement ConfidenceStates.transition with state update in src/core/confidence-states.ts
- [X] T085 [US2] Implement ConfidenceStates.getDistribution with count aggregation in src/core/confidence-states.ts
- [X] T086 [P] [US2] Implement createBTSPEmbedder factory in src/core/btsp-embedder.ts
- [X] T087 [US2] Implement BTSPEmbedder.detectBTSP with pattern matching (errors, stack traces, git, conflicts) in src/core/btsp-embedder.ts
- [X] T088 [US2] Implement BTSPEmbedder.createBTSPEntry with high initial score in src/core/btsp-embedder.ts
- [X] T089 [P] [US2] Implement GenericAdapter in src/adapters/generic.ts (stdin/stdout, full optimization pipeline)
- [X] T090 [US2] Implement GenericAdapter.optimize orchestrating all core modules in src/adapters/generic.ts
- [X] T091 [US2] Implement optimize command in src/cli/commands/optimize.ts (read input, call adapter, write output)
- [X] T092 [US2] Add stdin/file input handling in src/cli/commands/optimize.ts
- [X] T093 [US2] Add stdout/file output handling in src/cli/commands/optimize.ts
- [X] T094 [US2] Add optimization summary display (tokens before/after, state distribution) in src/cli/commands/optimize.ts
- [X] T095 [US2] Add --dry-run flag support in src/cli/commands/optimize.ts
- [X] T096 [US2] Add --verbose flag support with per-entry scoring in src/cli/commands/optimize.ts
- [X] T097 [US2] Wire optimize command to CLI entry point in src/cli/index.ts
- [X] T098 [US2] Create sample context fixtures in tests/fixtures/sample-contexts/ (100K tokens, errors, normal)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - View Stats (Priority: P2)

**Goal**: Enable viewing cumulative optimization statistics with `sparn stats`

**Independent Test**: Run `sparn stats` after several optimizations, verify cumulative tokens saved and average reduction

### Tests for User Story 3 (Article III: TDD - Tests FIRST)

- [X] T099 [P] [US3] Integration test: `sparn stats` shows total commands, tokens saved, average reduction in tests/integration/stats.test.ts
- [X] T100 [P] [US3] Integration test: `sparn stats --graph` displays ASCII bar chart in tests/integration/stats.test.ts
- [X] T101 [P] [US3] Integration test: `sparn stats --reset` prompts for confirmation in tests/integration/stats.test.ts
- [X] T102 [P] [US3] Integration test: `sparn stats --reset` clears optimization_stats table in tests/integration/stats.test.ts
- [X] T103 [P] [US3] Integration test: `sparn stats --json` outputs JSON format in tests/integration/stats.test.ts

### Implementation for User Story 3

- [X] T104 [US3] Implement stats command in src/cli/commands/stats.ts (query optimization_stats table)
- [X] T105 [US3] Add total commands aggregation in src/cli/commands/stats.ts
- [X] T106 [US3] Add total tokens saved aggregation in src/cli/commands/stats.ts
- [X] T107 [US3] Add average reduction calculation in src/cli/commands/stats.ts
- [X] T108 [US3] Add session count calculation in src/cli/commands/stats.ts
- [X] T109 [US3] Implement ASCII bar chart generation for --graph flag in src/cli/commands/stats.ts
- [X] T110 [US3] Implement reset confirmation prompt for --reset flag in src/cli/commands/stats.ts
- [X] T111 [US3] Add stats persistence in optimize command (insert into optimization_stats) in src/cli/commands/optimize.ts
- [X] T112 [US3] Wire stats command to CLI entry point in src/cli/index.ts

**Checkpoint**: User Stories 1, 2, AND 3 all work independently

---

## Phase 6: User Story 4 - Relay Commands (Priority: P2)

**Goal**: Enable proxying CLI commands through optimization with `sparn relay`

**Independent Test**: Run `sparn relay git status`, verify output optimized and exit code preserved

### Tests for User Story 4 (Article III: TDD - Tests FIRST)

- [X] T113 [P] [US4] Integration test: `sparn relay echo test` executes command and optimizes output in tests/integration/relay.test.ts
- [X] T114 [P] [US4] Integration test: `sparn relay` preserves exit code of proxied command in tests/integration/relay.test.ts
- [X] T115 [P] [US4] Integration test: `sparn relay` shows token savings summary by default in tests/integration/relay.test.ts
- [X] T116 [P] [US4] Integration test: `sparn relay --silent` suppresses savings summary in tests/integration/relay.test.ts
- [X] T117 [P] [US4] Integration test: `sparn relay` works with git, npm, cargo commands in tests/integration/relay.test.ts

### Implementation for User Story 4

- [X] T118 [US4] Implement relay command in src/cli/commands/relay.ts (spawn child process, capture output)
- [X] T119 [US4] Add child process execution with argument passing in src/cli/commands/relay.ts
- [X] T120 [US4] Add stdout/stderr capture in src/cli/commands/relay.ts
- [X] T121 [US4] Pipe captured output through optimization pipeline in src/cli/commands/relay.ts
- [X] T122 [US4] Preserve and return proxied command exit code in src/cli/commands/relay.ts
- [X] T123 [US4] Add token savings one-line summary in src/cli/commands/relay.ts
- [X] T124 [US4] Add --silent flag to suppress summary in src/cli/commands/relay.ts
- [X] T125 [US4] Wire relay command to CLI entry point in src/cli/index.ts

**Checkpoint**: User Stories 1-4 all work independently

---

## Phase 7: User Story 5 - Consolidate Memory (Priority: P2)

**Goal**: Enable periodic memory consolidation with `sparn consolidate`

**Independent Test**: Run `sparn consolidate` with 1000+ entries, verify deduplication and compression

### Tests for User Story 5 (Article III: TDD - Tests FIRST)

- [X] T126 [P] [US5] Unit test: SleepCompressor.consolidate removes fully decayed entries (decay ≥0.95) in tests/unit/sleep-compressor.test.ts
- [X] T127 [P] [US5] Unit test: SleepCompressor.findDuplicates detects exact hash matches in tests/unit/sleep-compressor.test.ts
- [X] T128 [P] [US5] Unit test: SleepCompressor.findDuplicates detects near-duplicates (cosine similarity ≥0.85) in tests/unit/sleep-compressor.test.ts
- [X] T129 [P] [US5] Unit test: SleepCompressor.mergeDuplicates keeps highest score entry in tests/unit/sleep-compressor.test.ts
- [X] T130 [P] [US5] Unit test: SleepCompressor.mergeDuplicates sums accessCount in tests/unit/sleep-compressor.test.ts
- [X] T131 [P] [US5] Integration test: `sparn consolidate` shows entries before/after and compression ratio in tests/integration/consolidate.test.ts
- [X] T132 [P] [US5] Integration test: `sparn consolidate` runs database VACUUM in tests/integration/consolidate.test.ts

### Implementation for User Story 5

- [X] T133 [US5] Implement createSleepCompressor factory in src/core/sleep-compressor.ts (depends on KVMemory)
- [X] T134 [US5] Implement SleepCompressor.consolidate orchestration in src/core/sleep-compressor.ts
- [X] T135 [US5] Implement decay-based pruning logic in src/core/sleep-compressor.ts
- [X] T136 [US5] Implement SleepCompressor.findDuplicates with hash matching in src/core/sleep-compressor.ts
- [X] T137 [US5] Implement cosine similarity for near-duplicate detection in src/core/sleep-compressor.ts
- [X] T138 [US5] Implement SleepCompressor.mergeDuplicates with score/accessCount merge in src/core/sleep-compressor.ts
- [X] T139 [US5] Add database VACUUM to compact in src/core/sleep-compressor.ts
- [X] T140 [US5] Implement consolidate command in src/cli/commands/consolidate.ts (call SleepCompressor)
- [X] T141 [US5] Add consolidation report display (entries before/after, compression ratio, duration) in src/cli/commands/consolidate.ts
- [X] T142 [US5] Wire consolidate command to CLI entry point in src/cli/index.ts

**Checkpoint**: User Stories 1-5 all work independently

---

## Phase 8: User Story 6 - Configure Behavior (Priority: P3)

**Goal**: Enable customizing Sparn settings with `sparn config`

**Independent Test**: Run `sparn config set pruning.threshold 10`, verify config.yaml updated

### Tests for User Story 6 (Article III: TDD - Tests FIRST)

- [X] T143 [P] [US6] Integration test: `sparn config get pruning.threshold` returns value in tests/integration/config.test.ts
- [X] T144 [P] [US6] Integration test: `sparn config set pruning.threshold 10` updates config.yaml in tests/integration/config.test.ts
- [X] T145 [P] [US6] Integration test: `sparn config set` rejects invalid values with helpful error in tests/integration/config.test.ts
- [X] T146 [P] [US6] Integration test: `sparn config` opens editor with YAML file in tests/integration/config.test.ts
- [X] T147 [P] [US6] Integration test: `sparn config --json` outputs JSON format in tests/integration/config.test.ts

### Implementation for User Story 6

- [X] T148 [US6] Implement config command in src/cli/commands/config.ts (cosmiconfig integration)
- [X] T149 [US6] Add config get subcommand (read YAML, extract key) in src/cli/commands/config.ts
- [X] T150 [US6] Add config set subcommand (update YAML, validate value) in src/cli/commands/config.ts
- [X] T151 [US6] Implement config validation (threshold 1-100, scores 0.0-1.0, etc.) in src/cli/commands/config.ts
- [X] T152 [US6] Add helpful error messages for invalid values in src/cli/commands/config.ts
- [X] T153 [US6] Add editor integration for `sparn config` (no args) in src/cli/commands/config.ts
- [X] T154 [US6] Wire config command to CLI entry point in src/cli/index.ts

**Checkpoint**: User Stories 1-6 all work independently

---

## Phase 9: User Story 7 - Programmatic API (Priority: P3)

**Goal**: Enable using Sparn as a library with clean TypeScript API

**Independent Test**: `import { createSparsePruner } from 'sparn'` works with TypeScript types

### Tests for User Story 7 (Article III: TDD - Tests FIRST)

- [X] T155 [P] [US7] Integration test: Library import works with all core modules in tests/integration/library-api.test.ts
- [X] T156 [P] [US7] Integration test: TypeScript types are exported correctly in tests/integration/library-api.test.ts
- [X] T157 [P] [US7] Integration test: Modules can be used independently (no forced coupling) in tests/integration/library-api.test.ts
- [X] T158 [P] [US7] Integration test: JSDoc comments are present on all public APIs in tests/integration/library-api.test.ts

### Implementation for User Story 7

- [X] T159 [US7] Create main library export in src/index.ts (export all core modules)
- [X] T160 [US7] Export all TypeScript types in src/index.ts
- [X] T161 [US7] Export utility functions (estimateTokens, hashContent) in src/index.ts
- [X] T162 [US7] Add JSDoc comments to all public API functions in src/core/* (sparse-pruner, engram-scorer, kv-memory, confidence-states, sleep-compressor, btsp-embedder)
- [X] T163 [US7] Verify no forced coupling (each module standalone) in src/core/*
- [X] T164 [US7] Add package.json exports field with type definitions
- [X] T165 [US7] Configure tsup to generate .d.ts files in tsup.config.ts

**Checkpoint**: All 7 user stories now independently functional

---

## Phase 10: Claude Code Adapter (Extended Feature)

**Goal**: Add Claude Code-specific adapter beyond generic adapter

**Purpose**: Demonstrates agent-agnostic design (Article IV)

- [X] T166 [P] Unit test: ClaudeCodeAdapter implements AgentAdapter interface in tests/unit/claude-code.test.ts
- [X] T167 [P] Unit test: ClaudeCodeAdapter.optimize uses PreToolUse hook integration in tests/unit/claude-code.test.ts
- [X] T168 Implement ClaudeCodeAdapter in src/adapters/claude-code.ts (PreToolUse hook, same interface as generic)
- [X] T169 Add Claude Code-specific optimization profile in src/adapters/claude-code.ts
- [X] T170 Export ClaudeCodeAdapter from src/index.ts

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T171 [P] Create NEUROSCIENCE.md documenting all 6 brain-to-code mappings in docs/NEUROSCIENCE.md
- [X] T172 [P] Create README.md with installation, quick start, usage examples in README.md
- [ ] T173 [P] Add terminal screenshots to README.md (branded banner, optimization summary)
- [X] T174 [P] Create CONTRIBUTING.md with development setup, TDD workflow in CONTRIBUTING.md
- [X] T175 [P] Add progress indicators (ora spinners) for long operations (consolidate, optimize large contexts) in src/cli/ui/progress.ts
- [X] T176 [P] Add --json flag support to all CLI commands for machine-readable output in src/cli/commands/*.ts
- [X] T177 [P] Add --help flag detailed help text to all subcommands in src/cli/commands/*.ts
- [X] T178 Implement global error handling with graceful degradation in src/cli/index.ts
- [X] T179 Add SQLite database backup on corruption detection in src/core/kv-memory.ts
- [X] T180 [P] Add CLI startup time optimization (<200ms target) via lazy loading
- [X] T181 [P] Create performance benchmark suite in benchmarks/ (token reduction, processing speed)
- [X] T182 [P] Add cross-platform tests (macOS, Linux, Windows) in CI matrix
- [X] T183 Configure GitHub Actions CI (lint + typecheck + test + build) in .github/workflows/ci.yml
- [X] T184 [P] Add npm publish configuration with prepublishOnly script in package.json
- [X] T185 [P] Run npm publish --dry-run to validate package
- [X] T186 Run quickstart.md validation (created validation scripts in scripts/)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if team capacity allows)
  - Or sequentially in priority order (US1 → US2 → US3 → US4 → US5 → US6 → US7)
- **Claude Code Adapter (Phase 10)**: Can proceed after US2 (depends on GenericAdapter pattern)
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Init)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **US2 (Optimize)**: Can start after Foundational (Phase 2) - Depends on US1 for database init
- **US3 (Stats)**: Can start after US2 - Needs optimization_stats table writes from US2
- **US4 (Relay)**: Can start after US2 - Uses same optimization pipeline
- **US5 (Consolidate)**: Can start after US2 - Needs KVMemory + core modules from US2
- **US6 (Config)**: Can start after Foundational (Phase 2) - Independent of other stories
- **US7 (Library API)**: Can start after US2 - Exports modules built in US2

### Within Each User Story

**Article III (TDD) Workflow**:
1. Tests MUST be written FIRST
2. Tests MUST be confirmed to FAIL (Red phase)
3. THEN implement to make tests pass (Green phase)
4. Refactor while tests stay green (Refactor phase)

**Dependencies**:
- All tests for a story → MUST complete before any implementation
- Types → before modules that use them
- Core modules → before CLI commands that wrap them
- Foundational modules (KVMemory) → before dependent modules (SleepCompressor)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- All tests for a user story marked [P] can run in parallel (after test framework setup)
- Models/types within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members (after Foundational phase)

---

## Parallel Example: User Story 2

```bash
# After Foundational phase completes, launch all US2 unit tests together:
Task: Unit test sparse-pruner (T049-T053) in tests/unit/sparse-pruner.test.ts
Task: Unit test engram-scorer (T054-T058) in tests/unit/engram-scorer.test.ts
Task: Unit test confidence-states (T059-T063) in tests/unit/confidence-states.test.ts
Task: Unit test btsp-embedder (T064-T068) in tests/unit/btsp-embedder.test.ts

# After tests written and FAILING, implement core modules in parallel:
Task: Implement SparsePruner (T075-T077) in src/core/sparse-pruner.ts
Task: Implement EngramScorer (T078-T081) in src/core/engram-scorer.ts
Task: Implement ConfidenceStates (T082-T085) in src/core/confidence-states.ts
Task: Implement BTSPEmbedder (T086-T088) in src/core/btsp-embedder.ts
Task: Implement GenericAdapter (T089-T090) in src/adapters/generic.ts
```

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Init)
4. Complete Phase 4: User Story 2 (Optimize)
5. **STOP and VALIDATE**: Test US1 + US2 workflow (`sparn init` → `sparn optimize`)
6. Deploy/demo if ready

**MVP Success Criteria** (from spec.md):
- ✅ `sparn init` creates .sparn/ with config and database
- ✅ `sparn optimize` reduces 100K tokens by 60-90% in <500ms
- ✅ Zero configuration works (default config)
- ✅ Generic adapter demonstrates agent-agnostic design

### Incremental Delivery

1. MVP (US1-2) → Foundation + core optimization working
2. Add US3 (Stats) → Quantify savings, user validation
3. Add US4 (Relay) → Workflow integration (git, npm, cargo)
4. Add US5 (Consolidate) → Memory cleanup, long-term usage
5. Add US6 (Config) → Power user customization
6. Add US7 (Library API) → Extensibility, advanced users
7. Add Phase 10 (Claude Code Adapter) → Proof of multi-agent support
8. Add Phase 11 (Polish) → Production-ready, documented, published

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (T001-T025)
2. **Once Foundational is done**, parallel work:
   - Developer A: US1 (Init) + US6 (Config) - both touch .sparn/ setup
   - Developer B: US2 (Optimize) - core neuroscience modules
   - Developer C: US7 (Library API) - can proceed after US2 modules exist
3. **After US1-2 complete**, second wave:
   - Developer A: US3 (Stats)
   - Developer B: US4 (Relay)
   - Developer C: US5 (Consolidate)
4. **Final polish**: All developers on Phase 11 (docs, CI, benchmarks)

---

## Notes

- **[P] tasks** = different files, no dependencies - safe to parallelize
- **[Story] label** maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **Article III (TDD)**: Verify tests FAIL before implementing (Red-Green-Refactor)
- Commit after each task or logical group (e.g., all tests for a module)
- Stop at any checkpoint to validate story independently
- **Avoid**: vague tasks, same-file conflicts, cross-story dependencies that break independence

---

## Task Count Summary

- **Phase 1 (Setup)**: 13 tasks
- **Phase 2 (Foundational)**: 12 tasks
- **Phase 3 (US1 - Init)**: 23 tasks (10 tests + 13 implementation)
- **Phase 4 (US2 - Optimize)**: 50 tasks (26 tests + 24 implementation)
- **Phase 5 (US3 - Stats)**: 14 tasks (5 tests + 9 implementation)
- **Phase 6 (US4 - Relay)**: 13 tasks (5 tests + 8 implementation)
- **Phase 7 (US5 - Consolidate)**: 17 tasks (7 tests + 10 implementation)
- **Phase 8 (US6 - Config)**: 12 tasks (5 tests + 7 implementation)
- **Phase 9 (US7 - Library API)**: 11 tasks (4 tests + 7 implementation)
- **Phase 10 (Claude Code Adapter)**: 5 tasks (2 tests + 3 implementation)
- **Phase 11 (Polish)**: 16 tasks

**TOTAL**: 186 tasks

**Tests**: 69 test tasks (Article III compliance)
**Implementation**: 91 implementation tasks
**Infrastructure**: 26 tasks (setup, foundational, polish)

**Parallel Opportunities**: 74 tasks marked [P] - can run concurrently
