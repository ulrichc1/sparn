# Library API Contract

**Package**: sparn
**Entry Point**: `import { ... } from 'sparn'`
**Version**: 0.1.0
**License**: MIT

## Overview

This document defines the programmatic API contract for Sparn's core modules. All modules can be imported independently (no forced coupling, per US-7 acceptance criteria).

---

## Package Exports

### Main Export (src/index.ts)

```typescript
// Core modules
export { SparsePruner, createSparsePruner } from './core/sparse-pruner';
export { EngramScorer, createEngramScorer } from './core/engram-scorer';
export { KVMemory, createKVMemory } from './core/kv-memory';
export { ConfidenceStates, createConfidenceStates } from './core/confidence-states';
export { SleepCompressor, createSleepCompressor } from './core/sleep-compressor';
export { BTSPEmbedder, createBTSPEmbedder } from './core/btsp-embedder';

// Adapters
export { AgentAdapter, ClaudeCodeAdapter, GenericAdapter } from './adapters';

// Types
export type {
  MemoryEntry,
  ConfidenceState,
  SparnConfig,
  OptimizationResult,
  PruneResult,
  ConsolidateResult,
  StateDistribution,
} from './types';

// Utilities
export { estimateTokens, hashContent } from './utils';
```

---

## Core Modules

### 1. SparsePruner

**Purpose**: Implements sparse coding principle (keep top 2-5% relevant context).

**Factory**:
```typescript
export function createSparsePruner(config?: Partial<PruningConfig>): SparsePruner;
```

**Interface**:
```typescript
export interface SparsePruner {
  /**
   * Prune context to top-k entries by TF-IDF relevance.
   *
   * @param context - Input context (plain text, line-separated)
   * @param threshold - Percentage to keep (1-100, default: 5)
   * @returns Pruning result with kept/removed entries and scores
   *
   * @example
   * const pruner = createSparsePruner();
   * const result = pruner.prune(context, 5);
   * console.log(result.prunedContext);
   */
  prune(context: string, threshold: number): PruneResult;

  /**
   * Calculate relevance score for a single entry.
   *
   * @param entry - Text entry to score
   * @param corpus - Full corpus for IDF calculation
   * @returns Relevance score (0.0-1.0)
   */
  scoreEntry(entry: string, corpus: string[]): number;
}

export interface PruneResult {
  /** Pruned context (top-k entries joined) */
  prunedContext: string;

  /** Entries kept (by content) */
  entriesKept: string[];

  /** Entries removed (by content) */
  entriesRemoved: string[];

  /** Relevance scores (entry → score) */
  scores: Map<string, number>;
}
```

**Usage Example**:
```typescript
import { createSparsePruner } from 'sparn';

const pruner = createSparsePruner({ threshold: 5, aggressiveness: 60 });
const context = `
Line 1: Some context
Line 2: More context
Line 3: Important error message
...
`;

const result = pruner.prune(context, 5);
console.log(`Kept ${result.entriesKept.length} entries`);
console.log(result.prunedContext);
```

---

### 2. EngramScorer

**Purpose**: Implements engram theory (memory decay over time).

**Factory**:
```typescript
export function createEngramScorer(config?: Partial<DecayConfig>): EngramScorer;
```

**Interface**:
```typescript
export interface EngramScorer {
  /**
   * Calculate engram score for a memory entry.
   *
   * Formula: score = baseRelevance * recencyBoost * accessFrequency * (1 - decay)
   * Decay: 1 - e^(-age_hours / TTL_hours)
   *
   * @param entry - Memory entry with timestamp, ttl, accessCount
   * @returns Computed score (0.0-1.0)
   */
  calculateScore(entry: MemoryEntry): number;

  /**
   * Refresh TTL after access (reinforcement learning).
   *
   * @param entry - Memory entry to refresh
   * @returns Updated entry with reset TTL
   */
  refreshTTL(entry: MemoryEntry): MemoryEntry;

  /**
   * Calculate decay factor for an entry.
   *
   * @param ageHours - Age in hours since creation
   * @param ttlHours - TTL in hours
   * @returns Decay factor (0.0-1.0, where 1.0 = fully decayed)
   */
  calculateDecay(ageHours: number, ttlHours: number): number;
}
```

**Usage Example**:
```typescript
import { createEngramScorer } from 'sparn';

const scorer = createEngramScorer({ defaultTTL: 24, decayThreshold: 0.95 });

const entry: MemoryEntry = {
  id: 'abc-123',
  content: 'Error: Connection timeout',
  timestamp: Date.now() / 1000 - 3600, // 1 hour ago
  ttl: 24 * 3600,
  accessCount: 5,
  // ... other fields
};

const score = scorer.calculateScore(entry);
if (score < 0.3) {
  console.log('Entry should be marked silent');
}
```

---

### 3. KVMemory

**Purpose**: Implements hippocampal KV storage (separate index/value tables).

**Factory**:
```typescript
export function createKVMemory(dbPath?: string): Promise<KVMemory>;
```

**Interface**:
```typescript
export interface KVMemory {
  /**
   * Store a memory entry in the database.
   *
   * @param entry - Memory entry to store
   * @throws If entry validation fails or DB error
   */
  put(entry: MemoryEntry): Promise<void>;

  /**
   * Retrieve a memory entry by ID.
   *
   * @param id - Entry ID (UUID)
   * @returns Memory entry or null if not found
   */
  get(id: string): Promise<MemoryEntry | null>;

  /**
   * Query entries with filters.
   *
   * @param filters - Query filters (state, score range, tags, etc.)
   * @returns Matching memory entries
   */
  query(filters: MemoryQueryFilters): Promise<MemoryEntry[]>;

  /**
   * Delete a memory entry.
   *
   * @param id - Entry ID to delete
   * @throws If entry not found
   */
  delete(id: string): Promise<void>;

  /**
   * List all entry IDs.
   *
   * @returns Array of entry IDs
   */
  list(): Promise<string[]>;

  /**
   * Compact database (remove expired/orphaned entries, VACUUM).
   *
   * @returns Number of entries removed
   */
  compact(): Promise<number>;

  /**
   * Close database connection.
   */
  close(): Promise<void>;
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

**Usage Example**:
```typescript
import { createKVMemory } from 'sparn';

const memory = await createKVMemory('./.sparn/memory.db');

// Store entry
await memory.put({
  id: 'entry-123',
  content: 'Important context',
  hash: '...',
  timestamp: Date.now() / 1000,
  score: 0.85,
  ttl: 86400,
  state: 'active',
  accessCount: 0,
  tags: ['error'],
  metadata: {},
  isBTSP: true,
});

// Query active entries
const activeEntries = await memory.query({ state: 'active', limit: 10 });
console.log(`Found ${activeEntries.length} active entries`);

// Cleanup
await memory.close();
```

---

### 4. ConfidenceStates

**Purpose**: Implements multi-state synapses (silent, ready, active).

**Factory**:
```typescript
export function createConfidenceStates(config?: Partial<StatesConfig>): ConfidenceStates;
```

**Interface**:
```typescript
export interface ConfidenceStates {
  /**
   * Calculate confidence state based on score.
   *
   * Rules:
   * - score ≤ 0.3 → silent
   * - 0.3 < score ≤ 0.7 → ready
   * - score > 0.7 → active
   * - isBTSP = true → always active
   *
   * @param score - Engram score (0.0-1.0)
   * @param isBTSP - BTSP flag
   * @returns Confidence state
   */
  calculateState(score: number, isBTSP: boolean): ConfidenceState;

  /**
   * Transition entry to new state based on current score.
   *
   * @param entry - Memory entry to transition
   * @returns Updated entry with new state
   */
  transition(entry: MemoryEntry): MemoryEntry;

  /**
   * Get state distribution for a set of entries.
   *
   * @param entries - Array of memory entries
   * @returns Count of entries in each state
   */
  getDistribution(entries: MemoryEntry[]): StateDistribution;
}

export interface StateDistribution {
  active: number;
  ready: number;
  silent: number;
}
```

---

### 5. SleepCompressor

**Purpose**: Implements sleep replay (periodic memory consolidation).

**Factory**:
```typescript
export function createSleepCompressor(memory: KVMemory): SleepCompressor;
```

**Interface**:
```typescript
export interface SleepCompressor {
  /**
   * Run full consolidation cycle.
   *
   * Steps:
   * 1. Remove fully decayed entries (decay ≥ 0.95)
   * 2. Deduplicate exact matches (by hash)
   * 3. Find near-duplicates (cosine similarity ≥ 0.85)
   * 4. Merge duplicate groups
   * 5. Compact database
   *
   * @returns Consolidation result
   */
  consolidate(): Promise<ConsolidateResult>;

  /**
   * Find near-duplicate entry groups.
   *
   * @param entries - Entries to check
   * @param threshold - Similarity threshold (0.0-1.0, default: 0.85)
   * @returns Groups of duplicate entries
   */
  findDuplicates(entries: MemoryEntry[], threshold: number): DuplicateGroup[];

  /**
   * Merge a group of duplicate entries.
   *
   * Strategy: Keep highest score, sum access counts, merge tags
   *
   * @param group - Duplicate group to merge
   * @returns Merged entry
   */
  mergeDuplicates(group: DuplicateGroup): MemoryEntry;
}

export interface DuplicateGroup {
  entries: MemoryEntry[];
  similarity: number;
}
```

---

### 6. BTSPEmbedder

**Purpose**: Implements BTSP (one-shot learning for high-signal events).

**Factory**:
```typescript
export function createBTSPEmbedder(): BTSPEmbedder;
```

**Interface**:
```typescript
export interface BTSPEmbedder {
  /**
   * Detect if content matches high-signal patterns.
   *
   * Patterns:
   * - Error messages (Error:, Exception:, Failed:)
   * - Stack traces (at ... (file:line:col))
   * - Git diff new files (+++ path)
   * - Merge conflicts (<<<<<< ====== >>>>>>)
   * - package.json dependency changes
   *
   * @param content - Text content to check
   * @returns true if BTSP pattern detected
   */
  detectBTSP(content: string): boolean;

  /**
   * Create a BTSP-flagged memory entry.
   *
   * Entry starts with:
   * - isBTSP = true
   * - state = 'active'
   * - score = 1.0
   * - ttl = 2x default TTL (extended retention)
   *
   * @param content - Entry content
   * @returns BTSP memory entry
   */
  createBTSPEntry(content: string): MemoryEntry;
}
```

---

## Utility Functions

### estimateTokens

```typescript
/**
 * Estimate token count for text using heuristic.
 *
 * Approximation: 1 token ≈ 4 chars or 0.75 words
 * Accuracy: ~90% vs GPT tokenizer
 *
 * @param text - Text to count
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number;
```

### hashContent

```typescript
/**
 * Generate SHA-256 hash of content for deduplication.
 *
 * @param content - Content to hash
 * @returns 64-character hex string
 */
export function hashContent(content: string): string;
```

---

## TypeScript Type Exports

All types from `data-model.md` are exported:

```typescript
export type {
  MemoryEntry,
  ConfidenceState,
  SparnConfig,
  PruningConfig,
  DecayConfig,
  StatesConfig,
  AgentType,
  UIConfig,
  OptimizationResult,
  OptimizeOptions,
  PruneResult,
  ConsolidateResult,
  StateDistribution,
  MemoryQueryFilters,
  DuplicateGroup,
};
```

---

## Full Example: Custom Optimization Pipeline

```typescript
import {
  createSparsePruner,
  createEngramScorer,
  createKVMemory,
  createConfidenceStates,
  createBTSPEmbedder,
  estimateTokens,
  hashContent,
  type MemoryEntry,
} from 'sparn';

async function customPipeline(context: string) {
  // Initialize modules
  const memory = await createKVMemory('./.sparn/memory.db');
  const pruner = createSparsePruner();
  const scorer = createEngramScorer();
  const states = createConfidenceStates();
  const btsp = createBTSPEmbedder();

  // Split context into lines
  const lines = context.split('\n').filter(line => line.trim());

  // Create entries
  const entries: MemoryEntry[] = lines.map(line => {
    const isBTSP = btsp.detectBTSP(line);
    if (isBTSP) {
      return btsp.createBTSPEntry(line);
    }

    return {
      id: crypto.randomUUID(),
      content: line,
      hash: hashContent(line),
      timestamp: Date.now() / 1000,
      score: 0.5,
      ttl: 86400,
      state: 'ready',
      accessCount: 0,
      tags: [],
      metadata: {},
      isBTSP: false,
    };
  });

  // Store entries
  for (const entry of entries) {
    await memory.put(entry);
  }

  // Prune to top 5%
  const pruneResult = pruner.prune(context, 5);

  // Score and transition remaining entries
  const keptIds = new Set(pruneResult.entriesKept.map(e => hashContent(e)));
  const keptEntries = entries.filter(e => keptIds.has(e.hash));

  for (const entry of keptEntries) {
    entry.score = scorer.calculateScore(entry);
    states.transition(entry);
    await memory.put(entry); // Update
  }

  // Get distribution
  const distribution = states.getDistribution(keptEntries);
  console.log('Distribution:', distribution);

  // Cleanup
  await memory.close();

  return {
    optimizedContext: pruneResult.prunedContext,
    tokensBefore: estimateTokens(context),
    tokensAfter: estimateTokens(pruneResult.prunedContext),
    distribution,
  };
}
```

---

## JSDoc Requirement

All public APIs MUST have JSDoc comments (Article IX compliance). Example:

```typescript
/**
 * Prune context to top-k entries by TF-IDF relevance.
 *
 * Implements sparse coding principle: only 2-5% of neurons fire for any given stimulus.
 * Uses TF-IDF with sqrt term frequency capping and entry-level IDF.
 *
 * @param context - Input context (plain text, line-separated)
 * @param threshold - Percentage of entries to keep (1-100)
 * @returns Pruning result with kept/removed entries and relevance scores
 *
 * @throws {Error} If threshold is out of range
 *
 * @example
 * ```typescript
 * const pruner = createSparsePruner();
 * const result = pruner.prune(largeContext, 5);
 * console.log(`Kept ${result.entriesKept.length} of ${largeContext.split('\n').length} entries`);
 * ```
 */
prune(context: string, threshold: number): PruneResult;
```

---

## Summary

All 6 core modules + utilities defined with TypeScript interfaces, JSDoc, usage examples. Library API contract complete. Ready for TDD implementation (Article III).
