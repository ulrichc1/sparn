#!/usr/bin/env node
/**
 * PostToolUse Hook - Compresses verbose tool output
 *
 * After tools like Bash, Read, Grep execute, this hook checks if
 * the output is very large and adds a compressed summary as
 * additionalContext so Claude can quickly reference key information.
 *
 * CRITICAL: Always exits 0 (never disrupts Claude Code).
 */

import { appendFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { estimateTokens } from '../utils/tokenizer.js';

const DEBUG = process.env['CORTEX_DEBUG'] === 'true';
const LOG_FILE = process.env['CORTEX_LOG_FILE'] || join(homedir(), '.cortex-hook.log');

// Only add summaries for outputs over this many estimated tokens
const SUMMARY_THRESHOLD = 3000;

function log(message: string): void {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    appendFileSync(LOG_FILE, `[${timestamp}] [post-tool] ${message}\n`);
  }
}

interface HookInput {
  session_id?: string;
  hook_event_name?: string;
  tool_name?: string;
  tool_use_id?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;
}

function extractText(response: unknown): string {
  if (typeof response === 'string') return response;
  if (response && typeof response === 'object') {
    return JSON.stringify(response);
  }
  return String(response ?? '');
}

/**
 * Summarize large bash output
 */
function summarizeBash(text: string, command: string): string {
  const lines = text.split('\n');

  // Check for test results
  if (/\d+ (pass|fail|skip)/i.test(text) || /Tests?:/i.test(text)) {
    const resultLines = lines.filter(
      (l) => /(pass|fail|skip|error|Tests?:|Test Suites?:)/i.test(l) || /^\s*(PASS|FAIL)\s/.test(l),
    );
    if (resultLines.length > 0) {
      return `[cortex] Test output summary (${lines.length} lines):\n${resultLines.slice(0, 15).join('\n')}`;
    }
  }

  // Check for build errors
  if (/(error|warning|failed)/i.test(text)) {
    const errorLines = lines.filter((l) => /(error|warning|failed|fatal)/i.test(l));
    if (errorLines.length > 0) {
      return `[cortex] Build output summary (${errorLines.length} errors/warnings from ${lines.length} lines):\n${errorLines.slice(0, 10).join('\n')}`;
    }
  }

  // Check for git diff
  if (/^diff --git/m.test(text)) {
    const files: string[] = [];
    for (const line of lines) {
      const match = line.match(/^diff --git a\/(.*?) b\/(.*)/);
      if (match?.[2]) files.push(match[2]);
    }
    return `[cortex] Git diff: ${files.length} files changed: ${files.join(', ')}`;
  }

  // Generic: show line count and first/last few lines
  return `[cortex] Command \`${command}\` produced ${lines.length} lines of output. First 3: ${lines.slice(0, 3).join(' | ')}`;
}

/**
 * Summarize large file read
 */
function summarizeFileRead(text: string, filePath: string): string {
  const lines = text.split('\n');
  const tokens = estimateTokens(text);

  // Find key structures
  const exports = lines.filter((l) => /^export\s/.test(l.trim()));
  const functions = lines.filter((l) => /function\s+\w+/.test(l));
  const classes = lines.filter((l) => /class\s+\w+/.test(l));

  const parts = [`[cortex] File ${filePath}: ${lines.length} lines, ~${tokens} tokens.`];

  if (exports.length > 0) {
    parts.push(
      `Exports: ${exports
        .slice(0, 5)
        .map((e) => e.trim().substring(0, 60))
        .join('; ')}`,
    );
  }
  if (functions.length > 0) {
    parts.push(
      `Functions: ${functions
        .slice(0, 5)
        .map((f) => f.trim().substring(0, 40))
        .join(', ')}`,
    );
  }
  if (classes.length > 0) {
    parts.push(`Classes: ${classes.map((c) => c.trim().substring(0, 40)).join(', ')}`);
  }

  return parts.join(' ');
}

/**
 * Summarize grep/search results
 */
function summarizeSearch(text: string, pattern: string): string {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const fileMap = new Map<string, number>();

  for (const line of lines) {
    const match = line.match(/^(.*?):\d+:/);
    if (match?.[1]) {
      fileMap.set(match[1], (fileMap.get(match[1]) || 0) + 1);
    }
  }

  if (fileMap.size > 0) {
    const summary = Array.from(fileMap.entries())
      .slice(0, 5)
      .map(([f, c]) => `${f} (${c})`)
      .join(', ');
    return `[cortex] Search for "${pattern}": ${lines.length} matches across ${fileMap.size} files. Top files: ${summary}`;
  }

  return `[cortex] Search for "${pattern}": ${lines.length} result lines`;
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
      log('Failed to parse JSON input');
      process.exit(0);
      return;
    }

    const toolName = input.tool_name ?? 'unknown';
    const text = extractText(input.tool_response);
    const tokens = estimateTokens(text);

    log(`Tool: ${toolName}, response tokens: ~${tokens}`);

    if (tokens < SUMMARY_THRESHOLD) {
      log('Under threshold, no summary needed');
      process.exit(0);
      return;
    }

    let summary = '';

    switch (toolName) {
      case 'Bash': {
        const command = String(input.tool_input?.['command'] ?? '');
        summary = summarizeBash(text, command);
        break;
      }
      case 'Read': {
        const filePath = String(input.tool_input?.['file_path'] ?? '');
        summary = summarizeFileRead(text, filePath);
        break;
      }
      case 'Grep': {
        const pattern = String(input.tool_input?.['pattern'] ?? '');
        summary = summarizeSearch(text, pattern);
        break;
      }
      default: {
        const lines = text.split('\n');
        summary = `[cortex] ${toolName} output: ${lines.length} lines, ~${tokens} tokens`;
        break;
      }
    }

    if (summary) {
      log(`Summary: ${summary.substring(0, 100)}`);
      const output = JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: summary,
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
