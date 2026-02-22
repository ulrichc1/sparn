/**
 * Claude Code Adapter - Claude Code-specific optimization pipeline
 *
 * Optimized for Claude Code's conversation patterns, tool use, and context management.
 * Implements the same AgentAdapter interface as GenericAdapter but with Claude-specific tuning.
 */

import { randomUUID } from 'node:crypto';
import { createBTSPEmbedder } from '../core/btsp-embedder.js';
import { createConfidenceStates } from '../core/confidence-states.js';
import { createEngramScorer } from '../core/engram-scorer.js';
import type { KVMemory } from '../core/kv-memory.js';
import { createSparsePruner } from '../core/sparse-pruner.js';
import type { AgentAdapter, OptimizationResult, OptimizeOptions } from '../types/adapter.js';
import type { SparnConfig } from '../types/config.js';
import type { MemoryEntry } from '../types/memory.js';
import { hashContent } from '../utils/hash.js';
import { estimateTokens } from '../utils/tokenizer.js';

/**
 * Claude Code-specific optimization profile
 * Tuned for Claude's conversation patterns and tool use
 */
const CLAUDE_CODE_PROFILE = {
  // More aggressive pruning for tool results (they can be verbose)
  toolResultThreshold: 3, // Keep top 3% of tool results

  // Preserve conversation turns more aggressively
  conversationBoost: 1.5, // 50% boost for User/Assistant exchanges

  // Prioritize recent context (Claude Code sessions are typically focused)
  recentContextWindow: 10 * 60, // Last 10 minutes gets priority

  // BTSP patterns specific to Claude Code
  btspPatterns: [
    // Error patterns
    /\b(error|exception|failure|fatal|critical|panic)\b/i,
    /^\s+at\s+.*\(.*:\d+:\d+\)/m, // Stack traces
    /^Error:/m,

    // Git conflict markers
    /^<<<<<<< /m,
    /^=======/m,
    /^>>>>>>> /m,

    // Tool use patterns (important for context)
    /<function_calls>/,
    /<invoke>/,
    /<tool_use>/,

    // File operation results (often critical)
    /ENOENT|EACCES|EISDIR|EEXIST/,
  ],
};

/**
 * Create a Claude Code adapter instance
 * @param memory - KV memory store
 * @param config - Sparn configuration
 * @returns AgentAdapter instance optimized for Claude Code
 */
export function createClaudeCodeAdapter(memory: KVMemory, config: SparnConfig): AgentAdapter {
  // Create core modules with Claude Code-optimized settings
  const pruner = createSparsePruner({
    threshold: config.pruning.threshold,
  });

  const scorer = createEngramScorer(config.decay);
  const states = createConfidenceStates(config.states);
  const btsp = createBTSPEmbedder();

  async function optimize(
    context: string,
    options: OptimizeOptions = {},
  ): Promise<OptimizationResult> {
    const startTime = Date.now();

    // Parse context into entries
    // For Claude Code, we parse by conversation turns and tool uses
    const entries = parseClaudeCodeContext(context);

    // Apply BTSP detection with Claude Code-specific patterns
    const entriesWithBTSP = entries.map((entry) => {
      const isBTSP = CLAUDE_CODE_PROFILE.btspPatterns.some((pattern) =>
        pattern.test(entry.content),
      );

      if (isBTSP) {
        const btspEntry = btsp.createBTSPEntry(entry.content, [...entry.tags, 'claude-code'], {
          originalTimestamp: entry.timestamp,
        });
        // Preserve original timestamp
        return {
          ...btspEntry,
          timestamp: entry.timestamp,
        };
      }

      return entry;
    });

    // Apply conversation boost to User/Assistant exchanges
    const boostedEntries = entriesWithBTSP.map((entry) => {
      const isConversationTurn =
        entry.content.trim().startsWith('User:') || entry.content.trim().startsWith('Assistant:');

      if (isConversationTurn) {
        return {
          ...entry,
          score: entry.score * CLAUDE_CODE_PROFILE.conversationBoost,
        };
      }

      return entry;
    });

    // Score entries with decay
    const scoredEntries = boostedEntries.map((entry) => {
      const decayScore = scorer.calculateScore(entry);
      return {
        ...entry,
        score: decayScore,
      };
    });

    // Calculate states
    const entriesWithStates = scoredEntries.map((entry) => {
      const state = states.calculateState(entry);
      return {
        ...entry,
        state,
      };
    });

    // Prune entries (keep top N%)
    const pruneResult = pruner.prune(entriesWithStates);

    // Store kept entries in memory (if not dry-run)
    if (!options.dryRun) {
      for (const entry of pruneResult.kept) {
        await memory.put(entry);
      }

      // Record optimization stats
      await memory.recordOptimization({
        timestamp: Date.now(),
        tokens_before: pruneResult.originalTokens,
        tokens_after: pruneResult.prunedTokens,
        entries_pruned: pruneResult.removed.length,
        duration_ms: Date.now() - startTime,
      });
    }

    // Build optimized context from kept entries
    const optimizedContext = pruneResult.kept.map((entry) => entry.content).join('\n');

    // Calculate state distribution
    const stateDistribution = states.getDistribution(pruneResult.kept);

    // Build result
    const result: OptimizationResult = {
      optimizedContext,
      tokensBefore: pruneResult.originalTokens,
      tokensAfter: pruneResult.prunedTokens,
      reduction:
        pruneResult.originalTokens > 0
          ? (pruneResult.originalTokens - pruneResult.prunedTokens) / pruneResult.originalTokens
          : 0,
      entriesProcessed: entries.length,
      entriesKept: pruneResult.kept.length,
      durationMs: Date.now() - startTime,
      stateDistribution,
    };

    // Add verbose details if requested
    if (options.verbose) {
      result.details = pruneResult.kept.map((entry) => ({
        id: entry.id,
        score: entry.score,
        state: entry.state || 'unknown',
        isBTSP: entry.tags.includes('btsp'),
        tokens: estimateTokens(entry.content),
      }));
    }

    return result;
  }

  return {
    optimize,
  };
}

/**
 * Parse Claude Code context into memory entries
 * Handles conversation turns, tool uses, and results
 * @param context - Raw context string
 * @returns Array of memory entries
 */
function parseClaudeCodeContext(context: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const now = Date.now();

  // Split by conversation turns and tool boundaries
  const lines = context.split('\n');
  let currentBlock: string[] = [];
  let blockType: 'conversation' | 'tool' | 'result' | 'other' = 'other';

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect conversation turns
    if (trimmed.startsWith('User:') || trimmed.startsWith('Assistant:')) {
      if (currentBlock.length > 0) {
        entries.push(createEntry(currentBlock.join('\n'), blockType, now));
        currentBlock = [];
      }
      blockType = 'conversation';
      currentBlock.push(line);
    }
    // Detect tool calls
    else if (
      trimmed.includes('<function_calls>') ||
      trimmed.includes('<invoke>') ||
      trimmed.includes('<tool_use>')
    ) {
      if (currentBlock.length > 0) {
        entries.push(createEntry(currentBlock.join('\n'), blockType, now));
        currentBlock = [];
      }
      blockType = 'tool';
      currentBlock.push(line);
    }
    // Detect tool results
    else if (trimmed.includes('<function_results>') || trimmed.includes('</function_results>')) {
      if (currentBlock.length > 0 && blockType !== 'result') {
        entries.push(createEntry(currentBlock.join('\n'), blockType, now));
        currentBlock = [];
      }
      blockType = 'result';
      currentBlock.push(line);
    }
    // Continue current block
    else if (currentBlock.length > 0) {
      currentBlock.push(line);
    }
    // Start new block if line has content
    else if (trimmed.length > 0) {
      currentBlock.push(line);
      blockType = 'other';
    }
  }

  // Add final block
  if (currentBlock.length > 0) {
    entries.push(createEntry(currentBlock.join('\n'), blockType, now));
  }

  return entries.filter((e) => e.content.trim().length > 0);
}

/**
 * Create a memory entry from a content block
 * @param content - Block content
 * @param type - Block type
 * @param baseTime - Base timestamp
 * @returns Memory entry
 */
function createEntry(
  content: string,
  type: 'conversation' | 'tool' | 'result' | 'other',
  baseTime: number,
): MemoryEntry {
  const tags: string[] = [type];

  // Assign initial score based on type
  let initialScore = 0.5;
  if (type === 'conversation') initialScore = 0.8; // Prioritize conversation
  if (type === 'tool') initialScore = 0.7; // Tool calls are important
  if (type === 'result') initialScore = 0.4; // Results can be verbose

  return {
    id: randomUUID(),
    content,
    hash: hashContent(content),
    timestamp: baseTime,
    score: initialScore,
    state: initialScore > 0.7 ? 'active' : initialScore > 0.3 ? 'ready' : 'silent',
    ttl: 24 * 3600, // 24 hours default
    accessCount: 0,
    tags,
    metadata: { type },
    isBTSP: false,
  };
}
