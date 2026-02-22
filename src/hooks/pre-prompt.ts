#!/usr/bin/env node
/**
 * Pre-Prompt Hook - Claude Code hook for real-time context optimization
 *
 * Reads context from stdin, checks if tokens exceed threshold,
 * optimizes if needed, writes to stdout.
 *
 * CRITICAL: Always exits 0 (never disrupts Claude Code).
 * Falls through unmodified if under threshold or on error.
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { load as parseYAML } from 'js-yaml';
import { createBudgetPrunerFromConfig } from '../core/budget-pruner.js';
import type { SparnConfig } from '../types/config.js';
import { parseClaudeCodeContext } from '../utils/context-parser.js';
import { estimateTokens } from '../utils/tokenizer.js';

// Exit 0 wrapper for all errors
function exitSuccess(output: string): void {
  process.stdout.write(output);
  process.exit(0);
}

// Main hook logic
async function main(): Promise<void> {
  try {
    // Read stdin (context)
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = Buffer.concat(chunks).toString('utf-8');

    // Estimate tokens
    const tokens = estimateTokens(input);

    // Load config
    const configPath = join(homedir(), '.sparn', 'config.yaml');
    let config: SparnConfig;

    try {
      const configYAML = readFileSync(configPath, 'utf-8');
      config = parseYAML(configYAML) as SparnConfig;
    } catch {
      // Config not found or invalid, fall through
      exitSuccess(input);
      return;
    }

    const { autoOptimizeThreshold, tokenBudget } = config.realtime;

    // Check if optimization needed
    if (tokens < autoOptimizeThreshold) {
      // Under threshold, pass through unmodified
      exitSuccess(input);
      return;
    }

    // Parse context into entries
    const entries = parseClaudeCodeContext(input);

    if (entries.length === 0) {
      // No entries to optimize, pass through
      exitSuccess(input);
      return;
    }

    // Create budget pruner
    const pruner = createBudgetPrunerFromConfig(config.realtime, config.decay, config.states);

    // Prune to fit budget
    const result = pruner.pruneToFit(entries, tokenBudget);

    // Build optimized context (chronologically ordered)
    const sorted = [...result.kept].sort((a, b) => a.timestamp - b.timestamp);
    const optimizedContext = sorted.map((e) => e.content).join('\n\n');

    // Output optimized context
    exitSuccess(optimizedContext);
  } catch (_error) {
    // On any error, pass through original input
    // Read stdin again if needed (shouldn't happen, but safety fallback)
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = Buffer.concat(chunks).toString('utf-8');
    exitSuccess(input);
  }
}

// Run hook
main();
