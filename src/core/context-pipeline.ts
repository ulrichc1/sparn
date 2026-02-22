/**
 * Streaming Context Pipeline - Real-time sliding window buffer
 *
 * Maintains an optimized context in real-time by:
 * - Ingesting new content as it arrives
 * - Storing entries by priority internally (for eviction decisions)
 * - Outputting in chronological order (for conversation coherence)
 * - Evicting lowest-priority entries when budget exceeded
 * - Using IncrementalOptimizer for fast delta processing
 */

import type { MemoryEntry } from '../types/memory.js';
import { parseClaudeCodeContext } from '../utils/context-parser.js';
import { estimateTokens } from '../utils/tokenizer.js';
import {
  createIncrementalOptimizer,
  type IncrementalOptimizerConfig,
} from './incremental-optimizer.js';

export interface ContextPipelineConfig extends IncrementalOptimizerConfig {
  /** Sliding window size (max entries to keep) */
  windowSize: number;
}

export interface ContextPipelineStats {
  /** Total entries ingested */
  totalIngested: number;
  /** Current entry count */
  currentEntries: number;
  /** Current token count */
  currentTokens: number;
  /** Budget utilization (0.0-1.0) */
  budgetUtilization: number;
  /** Evicted entry count */
  evictedEntries: number;
  /** Optimizer stats */
  optimizer: {
    cachedEntries: number;
    uniqueTerms: number;
    updateCount: number;
  };
}

export interface ContextPipeline {
  /**
   * Ingest new content into the pipeline
   * @param content - Raw content string
   * @param metadata - Optional metadata to attach to entries
   * @returns Number of entries ingested
   */
  ingest(content: string, metadata?: Record<string, unknown>): number;

  /**
   * Get current optimized context (chronologically ordered)
   * @returns Optimized context string
   */
  getContext(): string;

  /**
   * Get current entries (chronologically ordered)
   * @returns Array of memory entries
   */
  getEntries(): MemoryEntry[];

  /**
   * Get pipeline statistics
   * @returns Pipeline stats
   */
  getStats(): ContextPipelineStats;

  /**
   * Clear all entries and reset state
   */
  clear(): void;
}

/**
 * Create a context pipeline instance
 * @param config - Pipeline configuration
 * @returns ContextPipeline instance
 */
export function createContextPipeline(config: ContextPipelineConfig): ContextPipeline {
  const optimizer = createIncrementalOptimizer(config);
  const { windowSize, tokenBudget } = config;

  // Internal state
  let totalIngested = 0;
  let evictedEntries = 0;
  let currentEntries: MemoryEntry[] = [];
  let budgetUtilization = 0;

  function ingest(content: string, metadata: Record<string, unknown> = {}): number {
    // Parse content into entries
    const newEntries = parseClaudeCodeContext(content);

    if (newEntries.length === 0) return 0;

    // Attach metadata to entries
    const entriesWithMetadata = newEntries.map((entry) => ({
      ...entry,
      metadata: { ...entry.metadata, ...metadata },
    }));

    // Optimize incrementally
    const result = optimizer.optimizeIncremental(entriesWithMetadata, tokenBudget);

    // Update statistics
    totalIngested += newEntries.length;
    evictedEntries += result.removed.length;
    currentEntries = result.kept;
    budgetUtilization = result.budgetUtilization;

    // Enforce window size limit (keep most recent if exceeded)
    if (currentEntries.length > windowSize) {
      // Sort by timestamp descending (newest first)
      const sorted = [...currentEntries].sort((a, b) => b.timestamp - a.timestamp);
      const toKeep = sorted.slice(0, windowSize);
      const toRemove = sorted.slice(windowSize);

      currentEntries = toKeep;
      evictedEntries += toRemove.length;
    }

    return newEntries.length;
  }

  function getContext(): string {
    // Sort entries chronologically (oldest first)
    const sorted = [...currentEntries].sort((a, b) => a.timestamp - b.timestamp);
    return sorted.map((e) => e.content).join('\n\n');
  }

  function getEntries(): MemoryEntry[] {
    // Return entries chronologically (oldest first)
    return [...currentEntries].sort((a, b) => a.timestamp - b.timestamp);
  }

  function getStats(): ContextPipelineStats {
    const optimizerStats = optimizer.getStats();
    const currentTokens = currentEntries.reduce((sum, e) => sum + estimateTokens(e.content), 0);

    return {
      totalIngested,
      currentEntries: currentEntries.length,
      currentTokens,
      budgetUtilization,
      evictedEntries,
      optimizer: {
        cachedEntries: optimizerStats.cachedEntries,
        uniqueTerms: optimizerStats.uniqueTerms,
        updateCount: optimizerStats.updateCount,
      },
    };
  }

  function clear(): void {
    totalIngested = 0;
    evictedEntries = 0;
    currentEntries = [];
    budgetUtilization = 0;
    optimizer.reset();
  }

  return {
    ingest,
    getContext,
    getEntries,
    getStats,
    clear,
  };
}
