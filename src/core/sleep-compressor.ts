/**
 * Sleep Compressor - Implements sleep replay principle
 *
 * Neuroscience: During sleep, the brain consolidates memories by replaying important ones
 * and discarding irrelevant information.
 * Application: Periodic consolidation removes decayed entries and merges duplicates.
 */

import type { ConsolidateResult, DuplicateGroup } from '../types/consolidate.js';
import type { MemoryEntry } from '../types/memory.js';
import { createEngramScorer } from './engram-scorer.js';

export interface SleepCompressor {
  /**
   * Consolidate entries: remove decayed, merge duplicates
   * @param entries - All memory entries
   * @returns Consolidation result
   */
  consolidate(entries: MemoryEntry[]): ConsolidateResult;

  /**
   * Find duplicate entries (exact hash or near-duplicate by similarity)
   * @param entries - Memory entries
   * @returns Groups of duplicates
   */
  findDuplicates(entries: MemoryEntry[]): DuplicateGroup[];

  /**
   * Merge duplicate entries, keeping highest score
   * @param groups - Duplicate groups
   * @returns Merged entries
   */
  mergeDuplicates(groups: DuplicateGroup[]): MemoryEntry[];
}

/**
 * Create a sleep compressor instance
 * @returns SleepCompressor instance
 */
export function createSleepCompressor(): SleepCompressor {
  const scorer = createEngramScorer({ defaultTTL: 24, decayThreshold: 0.95 });

  function consolidate(entries: MemoryEntry[]): ConsolidateResult {
    const startTime = Date.now();
    const originalCount = entries.length;

    // Step 1: Remove fully decayed entries (decay ≥ 0.95)
    const now = Date.now();
    const nonDecayed = entries.filter((entry) => {
      const ageInSeconds = (now - entry.timestamp) / 1000;
      const decay = scorer.calculateDecay(ageInSeconds, entry.ttl);
      return decay < 0.95; // Keep entries with decay < 0.95
    });

    const decayedRemoved = originalCount - nonDecayed.length;

    // Step 2: Find and merge duplicates
    const duplicateGroups = findDuplicates(nonDecayed);
    const merged = mergeDuplicates(duplicateGroups);

    // Step 3: Keep non-duplicates
    const duplicateIds = new Set(duplicateGroups.flatMap((g) => g.entries.map((e) => e.id)));
    const nonDuplicates = nonDecayed.filter((e) => !duplicateIds.has(e.id));

    // Combine merged duplicates with non-duplicates
    const kept = [...merged, ...nonDuplicates];
    const removed = entries.filter((e) => !kept.some((k) => k.id === e.id));

    const duplicatesRemoved = duplicateGroups.reduce((sum, g) => sum + (g.entries.length - 1), 0);

    return {
      kept,
      removed,
      entriesBefore: originalCount,
      entriesAfter: kept.length,
      decayedRemoved,
      duplicatesRemoved,
      compressionRatio: originalCount > 0 ? kept.length / originalCount : 0,
      durationMs: Date.now() - startTime,
    };
  }

  function findDuplicates(entries: MemoryEntry[]): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    // Find exact hash matches
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry || processed.has(entry.id)) continue;

      const duplicates = entries.filter((e, idx) => idx !== i && e.hash === entry.hash);

      if (duplicates.length > 0) {
        const group: DuplicateGroup = {
          entries: [entry, ...duplicates],
          similarity: 1.0, // Exact match
        };
        groups.push(group);

        // Mark as processed
        processed.add(entry.id);
        for (const dup of duplicates) {
          processed.add(dup.id);
        }
      }
    }

    // Find near-duplicates (cosine similarity ≥ 0.85)
    for (let i = 0; i < entries.length; i++) {
      const entryI = entries[i];
      if (!entryI || processed.has(entryI.id)) continue;

      for (let j = i + 1; j < entries.length; j++) {
        const entryJ = entries[j];
        if (!entryJ || processed.has(entryJ.id)) continue;

        const similarity = cosineSimilarity(entryI.content, entryJ.content);

        if (similarity >= 0.85) {
          const group: DuplicateGroup = {
            entries: [entryI, entryJ],
            similarity,
          };
          groups.push(group);

          processed.add(entryI.id);
          processed.add(entryJ.id);
          break; // Move to next i
        }
      }
    }

    return groups;
  }

  function mergeDuplicates(groups: DuplicateGroup[]): MemoryEntry[] {
    const merged: MemoryEntry[] = [];

    for (const group of groups) {
      // Keep entry with highest score
      const sorted = [...group.entries].sort((a, b) => b.score - a.score);
      const best = sorted[0];
      if (!best) continue; // Skip empty groups

      // Sum access counts
      const totalAccessCount = group.entries.reduce((sum, e) => sum + e.accessCount, 0);

      // Merge tags
      const allTags = new Set(group.entries.flatMap((e) => e.tags));

      merged.push({
        ...best,
        accessCount: totalAccessCount,
        tags: Array.from(allTags),
      });
    }

    return merged;
  }

  /**
   * Calculate cosine similarity between two text strings
   * @param text1 - First text
   * @param text2 - Second text
   * @returns Similarity score (0.0-1.0)
   */
  function cosineSimilarity(text1: string, text2: string): number {
    const words1 = tokenize(text1);
    const words2 = tokenize(text2);

    // Build vocabulary
    const vocab = new Set([...words1, ...words2]);

    // Build word frequency vectors
    const vec1: Record<string, number> = {};
    const vec2: Record<string, number> = {};

    for (const word of vocab) {
      vec1[word] = words1.filter((w) => w === word).length;
      vec2[word] = words2.filter((w) => w === word).length;
    }

    // Calculate dot product and magnitudes
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (const word of vocab) {
      const count1 = vec1[word] ?? 0;
      const count2 = vec2[word] ?? 0;
      dotProduct += count1 * count2;
      mag1 += count1 * count1;
      mag2 += count2 * count2;
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) return 0;

    return dotProduct / (mag1 * mag2);
  }

  function tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 0);
  }

  return {
    consolidate,
    findDuplicates,
    mergeDuplicates,
  };
}
