/**
 * Sparn - Neuroscience-inspired context optimization
 *
 * Main library export for programmatic API usage.
 * Per Article I: CLI-First, Library-Second - all core modules are importable.
 */

export { createClaudeCodeAdapter } from './adapters/claude-code.js';
export { createGenericAdapter } from './adapters/generic.js';
export type { BTSPEmbedder } from './core/btsp-embedder.js';
export { createBTSPEmbedder } from './core/btsp-embedder.js';
export type { ConfidenceStates, ConfidenceStatesConfig } from './core/confidence-states.js';
export { createConfidenceStates } from './core/confidence-states.js';
export type { EngramScorer, EngramScorerConfig } from './core/engram-scorer.js';
export { createEngramScorer } from './core/engram-scorer.js';
export type { KVMemory } from './core/kv-memory.js';
// Core modules
export { createKVMemory } from './core/kv-memory.js';
export type { SleepCompressor } from './core/sleep-compressor.js';

export { createSleepCompressor } from './core/sleep-compressor.js';
export type { SparsePruner, SparsePrunerConfig } from './core/sparse-pruner.js';
export { createSparsePruner } from './core/sparse-pruner.js';
export type {
  AgentAdapter,
  OptimizationResult,
  OptimizeOptions,
} from './types/adapter.js';

export type {
  AgentType,
  DecayConfig,
  PruningConfig,
  SparnConfig,
  StatesConfig,
  UIConfig,
} from './types/config.js';

export { DEFAULT_CONFIG } from './types/config.js';
export type { ConsolidateResult, DuplicateGroup } from './types/consolidate.js';
// Types
export type {
  ConfidenceState,
  MemoryEntry,
  MemoryQueryFilters,
  StateDistribution,
} from './types/memory.js';
export type { PruneResult } from './types/pruner.js';
export { hashContent } from './utils/hash.js';
export type { Logger, LogLevel } from './utils/logger.js';
export { createLogger } from './utils/logger.js';
// Utilities
export { estimateTokens } from './utils/tokenizer.js';
