#!/usr/bin/env node
/**
 * UserPromptSubmit Hook - Fires before Claude processes the user's prompt
 *
 * Checks session transcript size and injects optimization hints when
 * the context is getting large. Helps Claude stay focused in long sessions.
 *
 * CRITICAL: Always exits 0 (never disrupts Claude Code).
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { formatDashboardStats } from './dashboard-stats.js';

const DEBUG = process.env['CORTEX_DEBUG'] === 'true';
const LOG_FILE = process.env['CORTEX_LOG_FILE'] || join(homedir(), '.cortex-hook.log');

function log(message: string): void {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    appendFileSync(LOG_FILE, `[${timestamp}] [pre-prompt] ${message}\n`);
  }
}

interface HookInput {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
  prompt?: string;
}

const CACHE_FILE = join(homedir(), '.cortex', 'hook-state-cache.json');
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  key: string;
  hint: string;
  timestamp: number;
}

function getCacheKey(sessionId: string, size: number, mtimeMs: number): string {
  return `${sessionId}:${size}:${Math.floor(mtimeMs)}`;
}

function readCache(key: string): string | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const data = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as CacheEntry;
    if (data.key !== key) return null;
    if (Date.now() - data.timestamp > CACHE_TTL_MS) return null;
    return data.hint;
  } catch {
    return null;
  }
}

function writeCache(key: string, hint: string): void {
  try {
    const dir = dirname(CACHE_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const entry: CacheEntry = { key, hint, timestamp: Date.now() };
    writeFileSync(CACHE_FILE, JSON.stringify(entry), 'utf-8');
  } catch {
    // Fail silently — cache is best-effort
  }
}

async function main(): Promise<void> {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf-8');

    let input: HookInput;
    try {
      input = JSON.parse(raw);
    } catch {
      log('Failed to parse JSON input, passing through');
      process.exit(0);
      return;
    }

    log(`Session: ${input.session_id}, prompt length: ${input.prompt?.length ?? 0}`);

    // --- Dashboard stats (always attempted, not cached) ---
    const cwd = input.cwd || process.cwd();
    const dbPath = resolve(cwd, '.cortex/memory.db');
    let dashboardStats: string | null = null;
    try {
      dashboardStats = formatDashboardStats(dbPath, cwd);
      if (dashboardStats) {
        log(`Dashboard stats: ${dashboardStats.split('\n').length} lines`);
      }
    } catch (err) {
      log(`Dashboard stats error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // --- Transcript size hint (cached) ---
    let sizeHint: string | null = null;
    const transcriptPath = input.transcript_path;
    if (transcriptPath && existsSync(transcriptPath)) {
      const stats = statSync(transcriptPath);
      const sizeMB = stats.size / (1024 * 1024);
      log(`Transcript size: ${sizeMB.toFixed(2)} MB`);

      const cacheKey = getCacheKey(input.session_id || 'unknown', stats.size, stats.mtimeMs);
      const cachedHint = readCache(cacheKey);
      if (cachedHint) {
        log('Cache hit for transcript hint');
        sizeHint = cachedHint;
      } else if (sizeMB > 2) {
        sizeHint =
          sizeMB > 5
            ? `[cortex] Session transcript is ${sizeMB.toFixed(1)}MB. Context is very large. Prefer concise responses and avoid re-reading files already in context.`
            : `[cortex] Session transcript is ${sizeMB.toFixed(1)}MB. Context is growing. Be concise where possible.`;
        writeCache(cacheKey, sizeHint);
        log(`Injecting optimization hint: ${sizeHint}`);
      }
    }

    // --- Combine and output ---
    const parts = [dashboardStats, sizeHint].filter(Boolean);
    if (parts.length > 0) {
      const combined = parts.join('\n');
      const output = JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: combined,
        },
      });
      process.stdout.write(output);
    }

    process.exit(0);
  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(0);
  }
}

main();
