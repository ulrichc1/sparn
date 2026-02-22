#!/usr/bin/env node
/**
 * Post-Tool-Result Hook - Claude Code hook for compressing verbose tool output
 *
 * Compresses large tool results using type-specific strategies:
 * - File reads: Truncate long files, show first/last N lines
 * - Grep results: Group by file, show match count + samples
 * - Git diffs: Summarize file changes, show stats
 * - Build output: Extract errors/warnings only
 *
 * CRITICAL: Always exits 0 (never disrupts Claude Code).
 * Falls through unmodified on error or if already small.
 */

import { estimateTokens } from '../utils/tokenizer.js';

// Exit 0 wrapper for all errors
function exitSuccess(output: string): void {
  process.stdout.write(output);
  process.exit(0);
}

// Compression threshold (only compress if over this many tokens)
const COMPRESSION_THRESHOLD = 5000;

// Tool result patterns
const TOOL_PATTERNS = {
  fileRead: /<file_path>(.*?)<\/file_path>[\s\S]*?<content>([\s\S]*?)<\/content>/,
  grepResult: /<pattern>(.*?)<\/pattern>[\s\S]*?<matches>([\s\S]*?)<\/matches>/,
  gitDiff: /^diff --git/m,
  buildOutput: /(error|warning|failed|failure)/i,
  npmInstall: /^(npm|pnpm|yarn) (install|add|i)/m,
  dockerLogs: /^\[?\d{4}-\d{2}-\d{2}/m,
  testResults: /(PASS|FAIL|SKIP).*?\.test\./i,
  typescriptErrors: /^.*\(\d+,\d+\): error TS\d+:/m,
  webpackBuild: /webpack \d+\.\d+\.\d+/i,
};

/**
 * Compress file read results
 */
function compressFileRead(content: string, maxLines = 100): string {
  const lines = content.split('\n');

  if (lines.length <= maxLines * 2) {
    return content; // Already small enough
  }

  const head = lines.slice(0, maxLines);
  const tail = lines.slice(-maxLines);
  const omitted = lines.length - maxLines * 2;

  return [...head, '', `... [${omitted} lines omitted] ...`, '', ...tail].join('\n');
}

/**
 * Compress grep results
 */
function compressGrepResults(content: string, maxMatchesPerFile = 5): string {
  const lines = content.split('\n');
  const fileMatches = new Map<string, string[]>();

  // Group matches by file
  for (const line of lines) {
    const match = line.match(/^(.*?):(\d+):(.*)/);
    if (match?.[1] && match[2] && match[3]) {
      const file = match[1];
      const lineNum = match[2];
      const text = match[3];
      if (!fileMatches.has(file)) {
        fileMatches.set(file, []);
      }
      fileMatches.get(file)?.push(`  Line ${lineNum}: ${text.trim()}`);
    }
  }

  // Build compressed output
  const compressed: string[] = [];

  for (const [file, matches] of fileMatches.entries()) {
    compressed.push(`${file} (${matches.length} matches):`);

    if (matches.length <= maxMatchesPerFile) {
      compressed.push(...matches);
    } else {
      compressed.push(...matches.slice(0, maxMatchesPerFile));
      compressed.push(`  ... and ${matches.length - maxMatchesPerFile} more matches`);
    }

    compressed.push('');
  }

  return compressed.join('\n');
}

/**
 * Compress git diff results
 */
function compressGitDiff(content: string): string {
  const lines = content.split('\n');
  const files = new Map<string, { added: number; removed: number }>();
  let currentFile = '';

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const match = line.match(/diff --git a\/(.*?) b\/(.*)/);
      if (match) {
        currentFile = match[2] || '';
        files.set(currentFile, { added: 0, removed: 0 });
      }
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      const stats = files.get(currentFile);
      if (stats) stats.added++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      const stats = files.get(currentFile);
      if (stats) stats.removed++;
    }
  }

  // Build summary
  const summary: string[] = ['Git diff summary:'];

  for (const [file, stats] of files.entries()) {
    summary.push(`  ${file}: +${stats.added} -${stats.removed}`);
  }

  return summary.join('\n');
}

/**
 * Compress build output (extract errors/warnings only)
 */
function compressBuildOutput(content: string): string {
  const lines = content.split('\n');
  const important: string[] = [];

  for (const line of lines) {
    if (/(error|warning|failed|failure|fatal)/i.test(line)) {
      important.push(line);
    }
  }

  if (important.length === 0) {
    return 'Build output: No errors or warnings found';
  }

  return ['Build errors/warnings:', ...important].join('\n');
}

/**
 * Compress npm/pnpm install output
 */
function compressNpmInstall(content: string): string {
  const lines = content.split('\n');
  const summary: string[] = [];

  // Extract package count and warnings/errors
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    if (/added \d+ packages?/i.test(line)) {
      summary.push(line.trim());
    }
    if (/warn/i.test(line)) {
      warnings.push(line.trim());
    }
    if (/error/i.test(line)) {
      errors.push(line.trim());
    }
  }

  if (errors.length > 0) {
    return ['Package installation errors:', ...errors.slice(0, 5)].join('\n');
  }

  if (warnings.length > 0) {
    return [
      'Package installation completed with warnings:',
      ...warnings.slice(0, 3),
      warnings.length > 3 ? `... and ${warnings.length - 3} more warnings` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return summary.length > 0 ? summary.join('\n') : 'Package installation completed successfully';
}

/**
 * Compress Docker logs
 */
function compressDockerLogs(content: string): string {
  const lines = content.split('\n');
  const logMap = new Map<string, number>();

  // Deduplicate and count repeated lines
  for (const line of lines) {
    // Strip timestamps for deduplication
    const normalized = line.replace(/^\[?\d{4}-\d{2}-\d{2}.*?\]\s*/, '').trim();
    if (normalized) {
      logMap.set(normalized, (logMap.get(normalized) || 0) + 1);
    }
  }

  const summary: string[] = ['Docker logs (deduplicated):'];

  for (const [log, count] of Array.from(logMap.entries()).slice(0, 20)) {
    if (count > 1) {
      summary.push(`  [${count}x] ${log}`);
    } else {
      summary.push(`  ${log}`);
    }
  }

  if (logMap.size > 20) {
    summary.push(`  ... and ${logMap.size - 20} more unique log lines`);
  }

  return summary.join('\n');
}

/**
 * Compress test results
 */
function compressTestResults(content: string): string {
  const lines = content.split('\n');
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const line of lines) {
    if (/PASS/i.test(line)) passed++;
    if (/FAIL/i.test(line)) {
      failed++;
      failures.push(line.trim());
    }
    if (/SKIP/i.test(line)) skipped++;
  }

  const summary = [`Test Results: ${passed} passed, ${failed} failed, ${skipped} skipped`];

  if (failures.length > 0) {
    summary.push('', 'Failed tests:');
    summary.push(...failures.slice(0, 10));
    if (failures.length > 10) {
      summary.push(`... and ${failures.length - 10} more failures`);
    }
  }

  return summary.join('\n');
}

/**
 * Compress TypeScript errors
 */
function compressTypescriptErrors(content: string): string {
  const lines = content.split('\n');
  const errorMap = new Map<string, string[]>();

  for (const line of lines) {
    const match = line.match(/^(.*?)\(\d+,\d+\): error (TS\d+):/);
    if (match) {
      const file = match[1] || 'unknown';
      const errorCode = match[2] || 'TS0000';
      const key = `${file}:${errorCode}`;

      if (!errorMap.has(key)) {
        errorMap.set(key, []);
      }
      errorMap.get(key)?.push(line);
    }
  }

  const summary = ['TypeScript Errors (grouped by file):'];

  for (const [key, errors] of errorMap.entries()) {
    summary.push(`  ${key} (${errors.length} errors)`);
    summary.push(`    ${errors[0]}`);
  }

  return summary.join('\n');
}

/**
 * Main compression logic
 */
function compressToolResult(input: string): string {
  const tokens = estimateTokens(input);

  // Only compress if over threshold
  if (tokens < COMPRESSION_THRESHOLD) {
    return input;
  }

  // Detect tool result type and compress accordingly
  if (TOOL_PATTERNS.fileRead.test(input)) {
    const match = input.match(TOOL_PATTERNS.fileRead);
    if (match?.[2]) {
      const content = match[2];
      const compressed = compressFileRead(content);
      return input.replace(content, compressed);
    }
  }

  if (TOOL_PATTERNS.grepResult.test(input)) {
    const match = input.match(TOOL_PATTERNS.grepResult);
    if (match?.[2]) {
      const matches = match[2];
      const compressed = compressGrepResults(matches);
      return input.replace(matches, compressed);
    }
  }

  if (TOOL_PATTERNS.gitDiff.test(input)) {
    return compressGitDiff(input);
  }

  if (TOOL_PATTERNS.buildOutput.test(input)) {
    return compressBuildOutput(input);
  }

  if (TOOL_PATTERNS.npmInstall.test(input)) {
    return compressNpmInstall(input);
  }

  if (TOOL_PATTERNS.dockerLogs.test(input)) {
    return compressDockerLogs(input);
  }

  if (TOOL_PATTERNS.testResults.test(input)) {
    return compressTestResults(input);
  }

  if (TOOL_PATTERNS.typescriptErrors.test(input)) {
    return compressTypescriptErrors(input);
  }

  // Unknown type or no compression pattern matched
  // Apply generic truncation as fallback
  const lines = input.split('\n');
  if (lines.length > 200) {
    return compressFileRead(input, 100);
  }

  return input;
}

// Main hook logic
async function main(): Promise<void> {
  try {
    // Read stdin (tool result)
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = Buffer.concat(chunks).toString('utf-8');

    // Compress if needed
    const output = compressToolResult(input);

    exitSuccess(output);
  } catch (_error) {
    // On any error, pass through original input
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
