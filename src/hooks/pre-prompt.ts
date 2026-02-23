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

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { load as parseYAML } from 'js-yaml';
import { createBudgetPrunerFromConfig } from '../core/budget-pruner.js';
import type { SparnConfig } from '../types/config.js';
import { parseClaudeCodeContext } from '../utils/context-parser.js';
import { estimateTokens } from '../utils/tokenizer.js';

// Debug logging (optional, set via env var)
const DEBUG = process.env['SPARN_DEBUG'] === 'true';
const LOG_FILE = process.env['SPARN_LOG_FILE'] || join(homedir(), '.sparn-hook.log');

function log(message: string): void {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    appendFileSync(LOG_FILE, `[${timestamp}] [pre-prompt] ${message}\n`);
  }
}

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
    log(`Input tokens: ${tokens}`);

    // Load config (check project dir first, then global)
    const projectConfigPath = join(process.cwd(), '.sparn', 'config.yaml');
    const globalConfigPath = join(homedir(), '.sparn', 'config.yaml');
    let config: SparnConfig;
    let configPath: string;

    if (existsSync(projectConfigPath)) {
      configPath = projectConfigPath;
      log(`Using project config: ${configPath}`);
    } else if (existsSync(globalConfigPath)) {
      configPath = globalConfigPath;
      log(`Using global config: ${configPath}`);
    } else {
      log('No config found, passing through');
      exitSuccess(input);
      return;
    }

    try {
      const configYAML = readFileSync(configPath, 'utf-8');
      config = parseYAML(configYAML) as SparnConfig;
    } catch (err) {
      log(`Config parse error: ${err}`);
      exitSuccess(input);
      return;
    }

    const { autoOptimizeThreshold, tokenBudget } = config.realtime;
    log(`Threshold: ${autoOptimizeThreshold}, Budget: ${tokenBudget}`);

    // Check if optimization needed
    if (tokens < autoOptimizeThreshold) {
      log(`Under threshold (${tokens} < ${autoOptimizeThreshold}), passing through`);
      exitSuccess(input);
      return;
    }

    log(`Over threshold! Optimizing ${tokens} tokens to fit ${tokenBudget} budget`);

    // Parse context into entries
    const entries = parseClaudeCodeContext(input);
    log(`Parsed ${entries.length} context entries`);

    if (entries.length === 0) {
      log('No entries to optimize, passing through');
      exitSuccess(input);
      return;
    }

    // Create budget pruner
    const pruner = createBudgetPrunerFromConfig(config.realtime, config.decay, config.states);

    // Prune to fit budget
    const result = pruner.pruneToFit(entries, tokenBudget);
    const outputTokens = estimateTokens(result.kept.map((e) => e.content).join('\n\n'));
    const saved = tokens - outputTokens;
    const reduction = ((saved / tokens) * 100).toFixed(1);

    log(`Optimization complete: ${tokens} → ${outputTokens} tokens (${reduction}% reduction)`);
    log(`Kept ${result.kept.length}/${entries.length} entries`);

    // Build optimized context (chronologically ordered)
    const sorted = [...result.kept].sort((a, b) => a.timestamp - b.timestamp);
    const optimizedContext = sorted.map((e) => e.content).join('\n\n');

    // Output optimized context
    exitSuccess(optimizedContext);
  } catch (error) {
    // On any error, pass through original input
    log(`Error in pre-prompt hook: ${error instanceof Error ? error.message : String(error)}`);
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
