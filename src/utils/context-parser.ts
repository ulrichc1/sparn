/**
 * Context Parser - Shared utilities for parsing agent contexts into memory entries
 *
 * Extracted from claude-code adapter to enable reuse across:
 * - Adapters (claude-code, generic)
 * - Real-time pipeline (streaming context)
 * - Hooks (pre-prompt, post-tool-result)
 */

import { randomUUID } from 'node:crypto';
import type { MemoryEntry } from '../types/memory.js';
import { hashContent } from './hash.js';

/**
 * Block type classification for Claude Code context
 */
export type BlockType = 'conversation' | 'tool' | 'result' | 'other';

/**
 * Parse Claude Code context into memory entries
 * Handles conversation turns, tool uses, and results
 * @param context - Raw context string
 * @returns Array of memory entries
 */
export function parseClaudeCodeContext(context: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const now = Date.now();

  // Split by conversation turns and tool boundaries
  const lines = context.split('\n');
  let currentBlock: string[] = [];
  let blockType: BlockType = 'other';

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
export function createEntry(content: string, type: BlockType, baseTime: number): MemoryEntry {
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

/**
 * Parse generic context (fallback for non-Claude-Code agents)
 * Splits on double newlines, treats as paragraphs
 * @param context - Raw context string
 * @returns Array of memory entries
 */
export function parseGenericContext(context: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const now = Date.now();

  // Split on double newlines (paragraph boundaries)
  const blocks = context.split(/\n\n+/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed.length === 0) continue;

    entries.push(createEntry(trimmed, 'other', now));
  }

  return entries;
}
