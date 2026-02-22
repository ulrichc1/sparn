# Data Model: Sparn Core

**Feature**: Sparn Core
**Branch**: 001-sparn-core
**Date**: 2026-02-22

## Overview

This document defines the core data structures, TypeScript interfaces, and database schema for Sparn's context optimization engine.

---

## 1. Memory Entry

**Description**: Represents a single context memory entry with neuroscience-inspired metadata.

**Source**: FR-3 (KV Memory Store), clarification Q1

### TypeScript Interface

```typescript
export interface MemoryEntry {
  /** Unique identifier (UUID v4) */
  id: string;

  /** The actual memory content/context data */
  content: string;

  /** SHA-256 hash of content for deduplication */
  hash: string;

  /** Unix timestamp (seconds) of creation */
  timestamp: number;

  /** Current engram score (0.0-1.0) */
  score: number;

  /** Time-to-live in seconds remaining */
  ttl: number;

  /** Confidence state */
  state: ConfidenceState;

  /** Number of times accessed/retrieved */
  accessCount: number;

  /** User-defined tags for categorization */
  tags: string[];

  /** Additional key-value pairs */
  metadata: Record<string, unknown>;

  /** Flag indicating one-shot learned entry (BTSP) */
  isBTSP: boolean;
}

export type ConfidenceState = 'silent' | 'ready' | 'active';
```

### Validation Rules

- `id`: Must be valid UUID v4
- `content`: Non-empty string, max 1MB per entry
- `hash`: 64-character hex string (SHA-256)
- `timestamp`: Positive integer, not future-dated
- `score`: Float between 0.0 and 1.0 (inclusive)
- `ttl`: Non-negative integer (seconds)
- `state`: Enum value (silent, ready, active)
- `accessCount`: Non-negative integer
- `tags`: Array of non-empty strings, max 10 tags per entry
- `metadata`: JSON-serializable object, max 10KB
- `isBTSP`: Boolean

### State Transitions

From clarification Q5:

```
score ≤ 0.3   → state = 'silent'
0.3 < score ≤ 0.7 → state = 'ready'
score > 0.7   → state = 'active'

Special case: isBTSP = true → state = 'active' (bypass score check)
```

---

## 2. SQLite Database Schema

**Database File**: `.sparn/memory.db`

### Table: entries_index

Fast key-lookup table for memory entries.

```sql
CREATE TABLE entries_index (
  id TEXT PRIMARY KEY NOT NULL,
  hash TEXT UNIQUE NOT NULL,
  timestamp INTEGER NOT NULL,
  score REAL NOT NULL DEFAULT 0.0 CHECK(score >= 0.0 AND score <= 1.0),
  ttl INTEGER NOT NULL CHECK(ttl >= 0),
  state TEXT NOT NULL CHECK(state IN ('silent', 'ready', 'active')),
  accessCount INTEGER NOT NULL DEFAULT 0 CHECK(accessCount >= 0),
  isBTSP INTEGER NOT NULL DEFAULT 0 CHECK(isBTSP IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_entries_state ON entries_index(state);
CREATE INDEX idx_entries_score ON entries_index(score DESC);
CREATE INDEX idx_entries_hash ON entries_index(hash);
CREATE INDEX idx_entries_timestamp ON entries_index(timestamp DESC);
```

### Table: entries_value

Content storage table (1:1 with entries_index).

```sql
CREATE TABLE entries_value (
  id TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,      -- JSON array string
  metadata TEXT,  -- JSON object string
  FOREIGN KEY (id) REFERENCES entries_index(id) ON DELETE CASCADE
);
```

### Table: optimization_stats

Tracks optimization history for `sparn stats`.

```sql
CREATE TABLE optimization_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  tokens_before INTEGER NOT NULL,
  tokens_after INTEGER NOT NULL,
  entries_pruned INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL
);

CREATE INDEX idx_stats_timestamp ON optimization_stats(timestamp DESC);
```

### Indexes Rationale

- `idx_entries_state`: Fast filtering for Active/Ready entries during optimization
- `idx_entries_score`: Top-k queries for pruning threshold
- `idx_entries_hash`: Deduplication lookups
- `idx_entries_timestamp`: Chronological queries, decay calculation
- `idx_stats_timestamp`: Recent stats retrieval

---

## 3. Configuration

**Description**: User-configurable settings for Sparn behavior.

**Source**: FR-6 (Configure sparn behavior), research decision #9

### TypeScript Interface

```typescript
export interface SparnConfig {
  pruning: PruningConfig;
  decay: DecayConfig;
  states: StatesConfig;
  agent: AgentType;
  ui: UIConfig;
  autoConsolidate: number | null;
}

export interface PruningConfig {
  /** Percentage of top-scored entries to keep (default: 5) */
  threshold: number;

  /** Aggressiveness scale 0-100 (affects TF-IDF weighting, default: 50) */
  aggressiveness: number;
}

export interface DecayConfig {
  /** Default TTL in hours (default: 24) */
  defaultTTL: number;

  /** Decay threshold for pruning (default: 0.95) */
  decayThreshold: number;
}

export interface StatesConfig {
  /** Score threshold for active state (default: 0.7) */
  activeThreshold: number;

  /** Score threshold for ready state (default: 0.3) */
  readyThreshold: number;
}

export type AgentType = 'claude-code' | 'generic';

export interface UIConfig {
  /** Enable colored output (default: true) */
  colors: boolean;

  /** Enable sound effects (default: false) */
  sounds: boolean;

  /** Verbose logging (default: false) */
  verbose: boolean;
}
```

### Validation Rules

- `pruning.threshold`: Integer 1-100
- `pruning.aggressiveness`: Integer 0-100
- `decay.defaultTTL`: Positive number (hours)
- `decay.decayThreshold`: Float 0.0-1.0
- `states.activeThreshold`: Float 0.0-1.0, must be > readyThreshold
- `states.readyThreshold`: Float 0.0-1.0, must be > 0
- `agent`: Enum value
- `ui.*`: Booleans
- `autoConsolidate`: Positive number (hours) or null

---

## 4. Adapter Interface

**Description**: Contract for agent-specific adapters.

**Source**: FR-8 (Agent Adapters), Article IV (Agent-Agnostic Design)

### TypeScript Interface

```typescript
export interface AgentAdapter {
  /** Adapter name (e.g., "claude-code", "generic") */
  readonly name: string;

  /** Optimize context using this agent's strategy */
  optimize(context: string, options?: OptimizeOptions): Promise<OptimizationResult>;

  /** Optional: Hook into agent lifecycle events */
  onInit?(): Promise<void>;
  onShutdown?(): Promise<void>;
}

export interface OptimizeOptions {
  /** Dry-run mode (don't modify memory store) */
  dryRun?: boolean;

  /** Verbose output */
  verbose?: boolean;

  /** Custom pruning threshold (overrides config) */
  threshold?: number;
}

export interface OptimizationResult {
  /** Optimized context text */
  optimizedContext: string;

  /** Token count before optimization */
  tokensBefore: number;

  /** Token count after optimization */
  tokensAfter: number;

  /** Entries pruned */
  entriesPruned: number;

  /** Optimization duration in milliseconds */
  durationMs: number;

  /** State distribution after optimization */
  stateDistribution: {
    active: number;
    ready: number;
    silent: number;
  };
}
```

---

## 5. CLI Command Schemas

**Description**: Input/output contracts for CLI commands.

**Source**: FR-7 (CLI Interface)

### Command: init

```typescript
export interface InitOptions {
  /** Force overwrite if .sparn/ exists */
  force?: boolean;
}

export interface InitResult {
  /** Path to created config file */
  configPath: string;

  /** Path to created database */
  dbPath: string;

  /** Initialization duration (ms) */
  durationMs: number;
}
```

### Command: optimize

```typescript
export interface OptimizeOptions {
  /** Input file path (or stdin if not provided) */
  input?: string;

  /** Output file path (or stdout if not provided) */
  output?: string;

  /** Agent adapter to use */
  agent?: AgentType;

  /** Dry-run mode */
  dryRun?: boolean;

  /** Verbose logging */
  verbose?: boolean;

  /** JSON output */
  json?: boolean;
}

// Returns OptimizationResult (defined above)
```

### Command: stats

```typescript
export interface StatsOptions {
  /** Show graph (bar chart) */
  graph?: boolean;

  /** Reset all statistics */
  reset?: boolean;

  /** JSON output */
  json?: boolean;
}

export interface StatsResult {
  /** Total optimization commands run */
  totalCommands: number;

  /** Total tokens saved (cumulative) */
  totalTokensSaved: number;

  /** Average reduction percentage */
  averageReduction: number;

  /** Number of optimization sessions */
  sessionCount: number;

  /** History (last 20 sessions or 7 days) */
  history?: StatsHistoryEntry[];
}

export interface StatsHistoryEntry {
  timestamp: number;
  tokensSaved: number;
  reductionPercent: number;
}
```

### Command: consolidate

```typescript
export interface ConsolidateOptions {
  /** JSON output */
  json?: boolean;
}

export interface ConsolidateResult {
  /** Entries before consolidation */
  entriesBefore: number;

  /** Entries after consolidation */
  entriesAfter: number;

  /** Compression ratio */
  compressionRatio: number;

  /** Consolidation duration (ms) */
  durationMs: number;
}
```

### Command: relay

```typescript
export interface RelayOptions {
  /** Suppress savings summary */
  silent?: boolean;

  /** JSON output */
  json?: boolean;
}

export interface RelayResult extends OptimizationResult {
  /** Exit code of proxied command */
  exitCode: number;

  /** Proxied command output (optimized) */
  output: string;
}
```

### Command: config

```typescript
export interface ConfigGetOptions {
  /** Key to retrieve (or all if not provided) */
  key?: string;

  /** JSON output */
  json?: boolean;
}

export interface ConfigSetOptions {
  /** Key to set */
  key: string;

  /** Value to set */
  value: string | number | boolean;
}
```

---

## 6. Core Module Interfaces

### SparsePruner

```typescript
export interface SparsePruner {
  /** Prune context to top-k entries by relevance */
  prune(context: string, threshold: number): PruneResult;
}

export interface PruneResult {
  /** Pruned context */
  prunedContext: string;

  /** Entries kept */
  entriesKept: string[];

  /** Entries removed */
  entriesRemoved: string[];

  /** Relevance scores */
  scores: Map<string, number>;
}
```

### EngramScorer

```typescript
export interface EngramScorer {
  /** Calculate decay score for a memory entry */
  calculateScore(entry: MemoryEntry): number;

  /** Update TTL after access (reinforcement) */
  refreshTTL(entry: MemoryEntry): MemoryEntry;
}
```

### KVMemory

```typescript
export interface KVMemory {
  /** Store a memory entry */
  put(entry: MemoryEntry): Promise<void>;

  /** Retrieve a memory entry by ID */
  get(id: string): Promise<MemoryEntry | null>;

  /** Query entries by filters */
  query(filters: MemoryQueryFilters): Promise<MemoryEntry[]>;

  /** Delete a memory entry */
  delete(id: string): Promise<void>;

  /** List all entry IDs */
  list(): Promise<string[]>;

  /** Compact database (remove expired entries) */
  compact(): Promise<number>;
}

export interface MemoryQueryFilters {
  state?: ConfidenceState;
  minScore?: number;
  maxScore?: number;
  tags?: string[];
  isBTSP?: boolean;
  limit?: number;
  offset?: number;
}
```

### ConfidenceStates

```typescript
export interface ConfidenceStates {
  /** Calculate state for an entry based on score */
  calculateState(score: number, isBTSP: boolean): ConfidenceState;

  /** Transition entry to new state */
  transition(entry: MemoryEntry): MemoryEntry;

  /** Get state distribution */
  getDistribution(entries: MemoryEntry[]): StateDistribution;
}

export interface StateDistribution {
  active: number;
  ready: number;
  silent: number;
}
```

### SleepCompressor

```typescript
export interface SleepCompressor {
  /** Run full consolidation cycle */
  consolidate(): Promise<ConsolidateResult>;

  /** Detect near-duplicates */
  findDuplicates(entries: MemoryEntry[], threshold: number): DuplicateGroup[];

  /** Merge duplicate entries */
  mergeDuplicates(group: DuplicateGroup): MemoryEntry;
}

export interface DuplicateGroup {
  entries: MemoryEntry[];
  similarity: number;
}
```

### BTSPEmbedder

```typescript
export interface BTSPEmbedder {
  /** Detect if entry matches high-signal patterns */
  detectBTSP(content: string): boolean;

  /** Create a BTSP-flagged entry */
  createBTSPEntry(content: string): MemoryEntry;
}
```

---

## 7. Relationships & Constraints

### Entity Relationships

```
MemoryEntry 1:1 entries_index (id)
MemoryEntry 1:1 entries_value (id)
OptimizationStats N:1 optimization run
Config 1:1 .sparn/config.yaml file
```

### Referential Integrity

- `entries_value.id` → `entries_index.id` (CASCADE DELETE)
- Hash uniqueness enforced in `entries_index.hash` UNIQUE constraint
- State transitions enforce threshold rules programmatically

### Lifecycle

```
New context line → BTSP detection →
  if BTSP: Create entry with isBTSP=true, state='active'
  else: Calculate score → Determine state → Create entry

Access → Increment accessCount → Refresh TTL → Recalculate score → Update state

Consolidation →
  Prune decayed entries (decay ≥ 0.95) →
  Deduplicate (hash + near-duplicate) →
  Merge groups →
  Compact database
```

---

## Summary

All data structures defined with TypeScript interfaces and SQL schema. Relationships clarified. Ready for contract generation (Phase 1b) and implementation (Phase 2).
