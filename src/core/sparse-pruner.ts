/**
 * Sparse Pruner - Implements sparse coding principle
 *
 * Neuroscience: Only 2-5% of neurons fire at any given time.
 * Application: Keep only top 5% most relevant context entries by TF-IDF score.
 */

import type { MemoryEntry } from '../types/memory.js';
import type { PruneResult } from '../types/pruner.js';
import { estimateTokens } from '../utils/tokenizer.js';

export interface SparsePrunerConfig {
  /** Percentage threshold for pruning (e.g., 5 = keep top 5%) */
  threshold: number;
}

export interface SparsePruner {
  /**
   * Prune entries to keep only top N% by relevance score
   * @param entries - Memory entries to prune
   * @returns Result with kept/removed entries and token counts
   */
  prune(entries: MemoryEntry[]): PruneResult;

  /**
   * Calculate TF-IDF relevance score for a single entry
   * @param entry - Entry to score
   * @param allEntries - All entries for IDF calculation
   * @returns Relevance score (0.0-1.0)
   */
  scoreEntry(entry: MemoryEntry, allEntries: MemoryEntry[]): number;
}

/**
 * Create a sparse pruner instance
 * @param config - Pruner configuration
 * @returns SparsePruner instance
 */
export function createSparsePruner(config: SparsePrunerConfig): SparsePruner {
  const { threshold } = config;

  function tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 0);
  }

  function calculateTF(term: string, tokens: string[]): number {
    const count = tokens.filter((t) => t === term).length;
    // Sqrt capping to prevent common words from dominating
    return Math.sqrt(count);
  }

  function calculateIDF(term: string, allEntries: MemoryEntry[]): number {
    const totalDocs = allEntries.length;
    const docsWithTerm = allEntries.filter((entry) => {
      const tokens = tokenize(entry.content);
      return tokens.includes(term);
    }).length;

    if (docsWithTerm === 0) return 0;

    return Math.log(totalDocs / docsWithTerm);
  }

  function scoreEntry(entry: MemoryEntry, allEntries: MemoryEntry[]): number {
    const tokens = tokenize(entry.content);
    if (tokens.length === 0) return 0;

    const uniqueTerms = [...new Set(tokens)];
    let totalScore = 0;

    for (const term of uniqueTerms) {
      const tf = calculateTF(term, tokens);
      const idf = calculateIDF(term, allEntries);
      totalScore += tf * idf;
    }

    // Normalize by entry length
    return totalScore / tokens.length;
  }

  function prune(entries: MemoryEntry[]): PruneResult {
    if (entries.length === 0) {
      return {
        kept: [],
        removed: [],
        originalTokens: 0,
        prunedTokens: 0,
      };
    }

    // Calculate original token count
    const originalTokens = entries.reduce((sum, e) => sum + estimateTokens(e.content), 0);

    // Score all entries
    const scored = entries.map((entry) => ({
      entry,
      score: scoreEntry(entry, entries),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Keep top N% (minimum 1 entry)
    const keepCount = Math.max(1, Math.ceil(entries.length * (threshold / 100)));
    const kept = scored.slice(0, keepCount).map((s) => s.entry);
    const removed = scored.slice(keepCount).map((s) => s.entry);

    // Calculate pruned token count
    const prunedTokens = kept.reduce((sum, e) => sum + estimateTokens(e.content), 0);

    return {
      kept,
      removed,
      originalTokens,
      prunedTokens,
    };
  }

  return {
    prune,
    scoreEntry,
  };
}
