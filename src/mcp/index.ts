#!/usr/bin/env node

/**
 * Sparn MCP Server Entry Point
 *
 * Starts the Sparn MCP server using stdio transport.
 * This is the main entry point for MCP client integrations
 * (Claude Desktop, VS Code, etc.).
 *
 * Usage:
 *   node dist/mcp/index.js
 *   node dist/mcp/index.cjs
 *
 * Environment variables:
 *   SPARN_DB_PATH - Custom path for the SQLite database (default: .sparn/memory.db)
 */

import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createKVMemory } from '../core/kv-memory.js';
import { createSparnMcpServer } from './server.js';

async function main(): Promise<void> {
  // Enable precise token counting if configured
  if (process.env['SPARN_PRECISE_TOKENS'] === 'true') {
    const { setPreciseTokenCounting } = await import('../utils/tokenizer.js');
    setPreciseTokenCounting(true);
  }

  const dbPath = resolve(process.env['SPARN_DB_PATH'] ?? '.sparn/memory.db');

  // Ensure the database directory exists
  mkdirSync(dirname(dbPath), { recursive: true });

  const memory = await createKVMemory(dbPath);

  const server = createSparnMcpServer({ memory });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is reserved for MCP JSON-RPC messages)
  console.error('Sparn MCP server running on stdio');

  // Graceful shutdown
  const shutdown = async () => {
    console.error('Shutting down Sparn MCP server...');
    await server.close();
    await memory.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Fatal error in Sparn MCP server:', error);
  process.exit(1);
});
