/**
 * Sparn MCP Server - Model Context Protocol server implementation
 *
 * Exposes Sparn's neuroscience-inspired context optimization as MCP tools,
 * enabling integration with Claude Desktop, VS Code, and other MCP clients.
 *
 * Tools:
 * - sparn_optimize: Optimize context with configurable options
 * - sparn_stats: Get optimization statistics
 * - sparn_consolidate: Run memory consolidation (sleep replay)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createGenericAdapter } from '../adapters/generic.js';
import type { KVMemory } from '../core/kv-memory.js';
import { createSleepCompressor } from '../core/sleep-compressor.js';
import type { SparnConfig } from '../types/config.js';
import { DEFAULT_CONFIG } from '../types/config.js';

/**
 * Options for creating the Sparn MCP server.
 */
export interface SparnMcpServerOptions {
  /** KV memory store instance */
  memory: KVMemory;
  /** Sparn configuration (defaults to DEFAULT_CONFIG) */
  config?: SparnConfig;
}

/**
 * Create and configure the Sparn MCP server with all tools registered.
 *
 * @param options - Server options including memory store and config
 * @returns Configured McpServer instance ready to connect to a transport
 */
export function createSparnMcpServer(options: SparnMcpServerOptions): McpServer {
  const { memory, config = DEFAULT_CONFIG } = options;

  const server = new McpServer({
    name: 'sparn',
    version: '1.1.1',
  });

  registerOptimizeTool(server, memory, config);
  registerStatsTool(server, memory);
  registerConsolidateTool(server, memory);

  return server;
}

/**
 * Register the sparn_optimize tool.
 *
 * Optimizes input context using the neuroscience-inspired pipeline:
 * BTSP detection, engram scoring, confidence states, and sparse pruning.
 */
function registerOptimizeTool(server: McpServer, memory: KVMemory, config: SparnConfig): void {
  server.registerTool(
    'sparn_optimize',
    {
      title: 'Sparn Optimize',
      description:
        'Optimize context using neuroscience-inspired pruning. ' +
        'Applies BTSP detection, engram scoring, confidence states, ' +
        'and sparse pruning to reduce token usage while preserving important information.',
      inputSchema: {
        context: z.string().describe('The context text to optimize'),
        dryRun: z
          .boolean()
          .optional()
          .default(false)
          .describe('If true, do not persist changes to the memory store'),
        verbose: z
          .boolean()
          .optional()
          .default(false)
          .describe('If true, include per-entry details in the response'),
        threshold: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe('Custom pruning threshold (1-100, overrides config)'),
      },
    },
    async ({ context, dryRun, verbose, threshold }) => {
      try {
        const effectiveConfig = threshold
          ? { ...config, pruning: { ...config.pruning, threshold } }
          : config;

        const adapter = createGenericAdapter(memory, effectiveConfig);
        const result = await adapter.optimize(context, {
          dryRun,
          verbose,
          threshold,
        });

        const response = {
          optimizedContext: result.optimizedContext,
          tokensBefore: result.tokensBefore,
          tokensAfter: result.tokensAfter,
          reduction: `${(result.reduction * 100).toFixed(1)}%`,
          entriesProcessed: result.entriesProcessed,
          entriesKept: result.entriesKept,
          durationMs: result.durationMs,
          stateDistribution: result.stateDistribution,
          ...(verbose && result.details ? { details: result.details } : {}),
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: message }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}

/**
 * Register the sparn_stats tool.
 *
 * Returns optimization statistics from the memory store, including
 * total commands run, tokens saved, and average reduction.
 */
function registerStatsTool(server: McpServer, memory: KVMemory): void {
  server.registerTool(
    'sparn_stats',
    {
      title: 'Sparn Stats',
      description:
        'Get optimization statistics including total commands run, ' +
        'tokens saved, and average reduction percentage.',
      inputSchema: {
        reset: z
          .boolean()
          .optional()
          .default(false)
          .describe('If true, reset all optimization statistics'),
      },
    },
    async ({ reset }) => {
      try {
        if (reset) {
          await memory.clearOptimizationStats();
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    message: 'Optimization statistics have been reset.',
                    totalCommands: 0,
                    totalTokensSaved: 0,
                    averageReduction: '0.0%',
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const stats = await memory.getOptimizationStats();
        const totalCommands = stats.length;

        const totalTokensSaved = stats.reduce(
          (sum, s) => sum + (s.tokens_before - s.tokens_after),
          0,
        );

        const averageReduction =
          totalCommands > 0
            ? stats.reduce((sum, s) => {
                const reduction =
                  s.tokens_before > 0 ? (s.tokens_before - s.tokens_after) / s.tokens_before : 0;
                return sum + reduction;
              }, 0) / totalCommands
            : 0;

        const recentOptimizations = stats.slice(0, 10).map((s) => ({
          timestamp: new Date(s.timestamp).toISOString(),
          tokensBefore: s.tokens_before,
          tokensAfter: s.tokens_after,
          entriesPruned: s.entries_pruned,
          durationMs: s.duration_ms,
          reduction: `${(
            ((s.tokens_before - s.tokens_after) / Math.max(s.tokens_before, 1)) * 100
          ).toFixed(1)}%`,
        }));

        const response = {
          totalCommands,
          totalTokensSaved,
          averageReduction: `${(averageReduction * 100).toFixed(1)}%`,
          recentOptimizations,
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: message }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}

/**
 * Register the sparn_consolidate tool.
 *
 * Runs the sleep-compressor consolidation process, which removes
 * decayed entries and merges duplicates in the memory store.
 */
function registerConsolidateTool(server: McpServer, memory: KVMemory): void {
  server.registerTool(
    'sparn_consolidate',
    {
      title: 'Sparn Consolidate',
      description:
        'Run memory consolidation (sleep replay). ' +
        'Removes decayed entries and merges duplicates to reclaim space. ' +
        'Inspired by the neuroscience principle of sleep-based memory consolidation.',
    },
    async () => {
      try {
        const allIds = await memory.list();
        const allEntries = await Promise.all(
          allIds.map(async (id) => {
            const entry = await memory.get(id);
            return entry;
          }),
        );

        const entries = allEntries.filter((e) => e !== null);

        const compressor = createSleepCompressor();
        const result = compressor.consolidate(entries);

        // Apply changes to memory store
        for (const removed of result.removed) {
          await memory.delete(removed.id);
        }

        for (const kept of result.kept) {
          await memory.put(kept);
        }

        // Run VACUUM to reclaim disk space
        await memory.compact();

        const response = {
          entriesBefore: result.entriesBefore,
          entriesAfter: result.entriesAfter,
          decayedRemoved: result.decayedRemoved,
          duplicatesRemoved: result.duplicatesRemoved,
          compressionRatio: `${(result.compressionRatio * 100).toFixed(1)}%`,
          durationMs: result.durationMs,
          vacuumCompleted: true,
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: message }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
