# Research: Sparn Core

**Feature**: Sparn Core
**Branch**: 001-sparn-core
**Date**: 2026-02-22

## Overview

This document captures key technical research decisions for implementing Sparn's neuroscience-inspired context optimization engine.

---

## 1. SQLite Schema Design for Dual Index/Value Tables

**Decision**: Use separate `entries_index` and `entries_value` tables with foreign key relationship.

**Rationale**:
- Mirrors hippocampal architecture (Article II: separate what-to-store from how-to-retrieve)
- Enables fast key lookups without loading full content
- Allows index-only queries for stats (count, state distribution) without deserializing large content blobs
- SQLite query planner can optimize index-only scans

**Schema**:
```sql
CREATE TABLE entries_index (
  id TEXT PRIMARY KEY,
  hash TEXT UNIQUE NOT NULL,
  timestamp INTEGER NOT NULL,
  score REAL NOT NULL DEFAULT 0.0,
  ttl INTEGER NOT NULL,
  state TEXT CHECK(state IN ('silent', 'ready', 'active')) NOT NULL,
  accessCount INTEGER NOT NULL DEFAULT 0,
  isBTSP INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_state ON entries_index(state);
CREATE INDEX idx_score ON entries_index(score DESC);
CREATE INDEX idx_hash ON entries_index(hash);

CREATE TABLE entries_value (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  tags TEXT,      -- JSON array
  metadata TEXT,  -- JSON object
  FOREIGN KEY (id) REFERENCES entries_index(id) ON DELETE CASCADE
);
```

**Alternatives Considered**:
- Single denormalized table: Rejected due to poor query performance for index-only operations
- Separate databases: Rejected due to transaction complexity and Article VII simplicity requirement

---

## 2. Token Counting Strategy

**Decision**: Use simple whitespace + punctuation splitting heuristic (approximates GPT tokenization within 10%).

**Rationale**:
- Sub-500ms latency requirement precludes external tokenizer API calls
- Tiktoken (OpenAI's tokenizer) requires native bindings or WASM, conflicts with minimal dependencies (Article VI)
- Accuracy within 10% sufficient for optimization heuristics (not billing)
- Plain text format (clarification Q3) makes character/word-based splitting viable

**Implementation**:
```typescript
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters or 0.75 words
  const words = text.split(/\s+/).length;
  const chars = text.length;
  return Math.ceil(Math.max(words * 0.75, chars / 4));
}
```

**Alternatives Considered**:
- Tiktoken library: Rejected due to native dependency constraint
- GPT-tokenizer npm package: Rejected due to bundle size (~500KB) impacting CLI startup time
- External API tokenization: Rejected due to network call prohibition (Article VI)

---

## 3. TF-IDF Implementation for Sparse Pruning

**Decision**: Use in-memory TF-IDF with term frequency capped at sqrt(count) and IDF based on entry-level document frequency.

**Rationale**:
- Sparse coding (Article II) requires relevance scoring across context segments
- TF-IDF provides established, explainable relevance metric
- Sqrt capping prevents common words from dominating score
- Entry-level IDF (vs line-level) reduces computation for 500K token contexts
- No external NLP library needed (Article VI: minimal dependencies)

**Formula**:
```
TF(term, entry) = sqrt(count(term in entry))
IDF(term) = log(total_entries / entries_containing_term)
Relevance(entry) = sum(TF * IDF for all terms in entry) / entry_length
```

**Alternatives Considered**:
- BM25: Rejected as more complex, requires tuning k1/b parameters
- Embedding-based similarity: Rejected due to model size and inference latency
- Simple keyword matching: Rejected as too naive, poor recall

---

## 4. Exponential Decay Implementation

**Decision**: Precompute decay score on each access/consolidation cycle using `decay = 1 - e^(-age_hours / TTL_hours)`.

**Rationale**:
- Exponential decay models biological memory better than linear (Article II: neuroscience fidelity)
- Clarification Q4 specified hours-based TTL with exponential decay
- Precomputation avoids recalculating on every query
- Decay threshold 0.95 means entries live ~3x TTL before pruning (e.g., 72 hours for default 24h TTL)

**Aging Trigger**:
- On consolidation (`sparn consolidate`)
- On optimization (`sparn optimize`)
- Background: Never (manual or config-scheduled only)

**Alternatives Considered**:
- Linear decay: Rejected as biologically inaccurate, creates cliff effect at TTL boundary
- Logarithmic decay: Rejected as too slow, never reaches full decay
- Real-time decay calculation: Rejected due to query overhead

---

## 5. Confidence State Transition Logic

**Decision**: Recalculate state on every engram score update using thresholds from clarification Q5.

**Rationale**:
- Clear thresholds: Silent (<0.3), Ready (0.3-0.7), Active (>0.7)
- BTSP entries bypass and start Active (one-shot learning principle)
- State stored denormalized in index table for fast filtering
- State transitions logged for stats tracking

**State Machine**:
```
Initial (new entry) → Active (if isBTSP) | Ready (if 0.3 ≤ score ≤ 0.7) | Silent (if score < 0.3)
After access → Recalculate score → Update state
After consolidation → Recalculate score → Update state
```

**Alternatives Considered**:
- Hysteresis bands: Rejected as premature optimization
- Manual state control: Rejected as violates automated principle
- Probabilistic state: Rejected as adds complexity without neuroscience justification

---

## 6. BTSP Detection Heuristics

**Decision**: Flag entries as BTSP if they match high-signal patterns: error messages, stack traces, new file paths, git conflicts, package.json changes.

**Rationale**:
- One-shot learning (Article II: BTSP) should capture critical events
- Error messages are high-value for debugging context
- New file structures indicate architectural changes
- Pattern-based detection avoids ML inference latency

**Patterns**:
```typescript
const BTSP_PATTERNS = [
  /Error:|Exception:|Failed:/i,
  /at\s+\S+\s+\(.*:\d+:\d+\)/,  // Stack trace
  /^\s*[+]{3}\s+.*\.ts$/m,       // Git diff new file
  /<<<<<<|======|>>>>>>/,        // Merge conflict
  /"(dependencies|devDependencies)":\s*{/  // package.json deps
];
```

**Alternatives Considered**:
- ML-based novelty detection: Rejected due to model size and latency
- User manual tagging: Rejected as not zero-config (success criteria)
- All entries BTSP: Rejected as defeats sparse coding principle

---

## 7. Sleep Compression Deduplication Strategy

**Decision**: Use SHA-256 content hash for exact deduplication, cosine similarity (TF-IDF vectors) for near-duplicate detection (threshold 0.85).

**Rationale**:
- SHA-256 already computed for entry hash field (deduplication key)
- Exact duplicates: Simple hash comparison
- Near-duplicates (e.g., same error with different timestamps): TF-IDF cosine similarity
- Threshold 0.85 balances false positives/negatives
- Merge strategy: Keep highest-scored entry, sum access counts

**Alternatives Considered**:
- Levenshtein distance: Rejected as O(n²) for large entries
- MinHash/LSH: Rejected as adds dependency complexity
- No near-duplicate detection: Rejected as sleep compression goal is consolidation

---

## 8. CLI Framework Choice: Commander.js

**Decision**: Use commander.js for CLI parsing, chalk for colors, ora for spinners, boxen for frames.

**Rationale**:
- Commander: Industry standard, minimal API, subcommand support
- Chalk: Widely used, no dependencies, supports hex colors for brand consistency (Article VIII)
- Ora: Elegant spinners for async operations (e.g., consolidation)
- Boxen: Terminal frames for banner and success messages
- All have TypeScript types available

**Alternatives Considered**:
- Yargs: Rejected as more complex API
- Oclif: Rejected as heavy framework (conflicts with Article VII simplicity)
- Raw process.argv parsing: Rejected as reinventing wheel

---

## 9. Config Management: Cosmiconfig + YAML

**Decision**: Use cosmiconfig to load `.sparn/config.yaml`, with fallback to defaults.

**Rationale**:
- Cosmiconfig supports multiple formats but we enforce YAML (Article VII: human-readable)
- YAML chosen over JSON for comments and readability
- Defaults embedded in code ensure zero-config works
- Config validation with zod (or similar) ensures type safety

**Default Config**:
```yaml
# .sparn/config.yaml
pruning:
  threshold: 5  # Keep top 5% (sparse coding principle)
  aggressiveness: 50  # 0-100 scale

decay:
  defaultTTL: 24  # hours
  decayThreshold: 0.95

states:
  activeThreshold: 0.7
  readyThreshold: 0.3

agent: generic  # or "claude-code"

ui:
  colors: true
  sounds: false
  verbose: false

autoConsolidate: null  # Interval in hours, or null for manual
```

**Alternatives Considered**:
- JSON config: Rejected as no comments support
- TOML: Rejected as less familiar to JS ecosystem
- Programmatic-only config: Rejected as fails zero-config requirement

---

## 10. Cross-Platform Path Handling

**Decision**: Use Node.js `path` module for all path operations, normalize to forward slashes for storage.

**Rationale**:
- Windows uses backslashes, macOS/Linux use forward slashes
- Storing normalized paths ensures hash consistency across platforms
- `path.normalize()`, `path.join()`, `path.resolve()` handle platform differences
- SQLite paths use forward slashes universally

**Alternatives Considered**:
- Platform-specific code branches: Rejected as unmaintainable
- Assuming POSIX paths: Rejected as breaks Windows native Node.js (non-WSL)

---

## Summary

All technical unknowns resolved. No blocking issues identified. Constitution compliance verified. Ready to proceed to Phase 1 (Data Model & Contracts).

**Next Steps**:
1. Generate data-model.md (TypeScript interfaces for memory entries, config, adapters)
2. Generate contracts/ (CLI command schemas, library API signatures)
3. Generate quickstart.md (getting started guide)
4. Update agent context (.claude/CLAUDE.md)
