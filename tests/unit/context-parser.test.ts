/**
 * Context Parser Tests
 */

import { describe, expect, it } from 'vitest';
import {
  createEntry,
  parseClaudeCodeContext,
  parseGenericContext,
} from '../../src/utils/context-parser.js';

describe('Context Parser', () => {
  describe('createEntry', () => {
    it('should create conversation entry with correct initial score', () => {
      const entry = createEntry('User: Hello', 'conversation', Date.now());

      expect(entry.content).toBe('User: Hello');
      expect(entry.score).toBe(0.8);
      expect(entry.state).toBe('active');
      expect(entry.tags).toContain('conversation');
      expect(entry.isBTSP).toBe(false);
    });

    it('should create tool entry with correct initial score', () => {
      const entry = createEntry('<function_calls>', 'tool', Date.now());

      expect(entry.score).toBe(0.7);
      expect(entry.state).toBe('ready');
      expect(entry.tags).toContain('tool');
    });

    it('should create result entry with correct initial score', () => {
      const entry = createEntry('Result data', 'result', Date.now());

      expect(entry.score).toBe(0.4);
      expect(entry.state).toBe('ready');
      expect(entry.tags).toContain('result');
    });

    it('should generate unique IDs for each entry', () => {
      const entry1 = createEntry('Test 1', 'conversation', Date.now());
      const entry2 = createEntry('Test 2', 'conversation', Date.now());

      expect(entry1.id).not.toBe(entry2.id);
    });
  });

  describe('parseClaudeCodeContext', () => {
    it('should parse conversation turns', () => {
      const context = `User: Hello, how are you?
Assistant: I'm doing well, thank you!`;

      const entries = parseClaudeCodeContext(context);

      expect(entries.length).toBeGreaterThanOrEqual(2);
      expect(entries[0]?.content).toContain('User: Hello');
      expect(entries[0]?.tags).toContain('conversation');
    });

    it('should parse tool calls', () => {
      const context = `<function_calls>
<invoke name="read_file">
  <parameter name="path">test.ts</parameter>
</invoke>
</function_calls>`;

      const entries = parseClaudeCodeContext(context);

      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0]?.tags).toContain('tool');
    });

    it('should filter empty entries', () => {
      const context = 'User: Hello\n\n\n\nAssistant: Hi';

      const entries = parseClaudeCodeContext(context);

      // Should only have non-empty entries
      entries.forEach((entry) => {
        expect(entry.content.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('parseGenericContext', () => {
    it('should split on double newlines', () => {
      const context = 'First paragraph\n\nSecond paragraph\n\nThird paragraph';

      const entries = parseGenericContext(context);

      expect(entries.length).toBe(3);
      expect(entries[0]?.content).toBe('First paragraph');
      expect(entries[1]?.content).toBe('Second paragraph');
    });

    it('should filter empty blocks', () => {
      const context = 'First\n\n\n\nSecond';

      const entries = parseGenericContext(context);

      expect(entries.length).toBe(2);
    });
  });
});
