# Sparn MCP Server Configuration Guide

Sparn exposes its neuroscience-inspired context optimization as an MCP (Model Context Protocol) server, enabling integration with Claude Desktop, VS Code, Cursor, and other MCP-compatible clients.

## Quick Start

### 1. Install Sparn

```bash
npm install -g @ulrichc1/sparn
```

### 2. Configure Your MCP Client

#### Claude Desktop

Add to `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sparn": {
      "command": "node",
      "args": ["/path/to/sparn/dist/mcp/index.js"],
      "env": {
        "SPARN_DB_PATH": "/path/to/.sparn/memory.db"
      }
    }
  }
}
```

If installed globally via npm:

```json
{
  "mcpServers": {
    "sparn": {
      "command": "npx",
      "args": ["@ulrichc1/sparn-mcp"]
    }
  }
}
```

#### VS Code / Cursor

Add to your workspace `.vscode/mcp.json`:

```json
{
  "servers": {
    "sparn": {
      "command": "node",
      "args": ["./node_modules/@ulrichc1/sparn/dist/mcp/index.js"]
    }
  }
}
```

### 3. Run the Server Manually (Optional)

```bash
# Using npm script
npm run mcp:server

# Or directly
node dist/mcp/index.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SPARN_DB_PATH` | `.sparn/memory.db` | Path to the SQLite database file |

## Available Tools

### sparn_optimize

Optimize context using the neuroscience-inspired pipeline (BTSP detection, engram scoring, confidence states, sparse pruning).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `context` | string | Yes | The context text to optimize |
| `dryRun` | boolean | No | If true, do not persist to memory (default: false) |
| `verbose` | boolean | No | If true, include per-entry details (default: false) |
| `threshold` | number | No | Custom pruning threshold 0-100 (overrides config) |

**Example response:**

```json
{
  "optimizedContext": "Important function definition\nAPI endpoint configuration",
  "tokensBefore": 150,
  "tokensAfter": 95,
  "reduction": "36.7%",
  "entriesProcessed": 5,
  "entriesKept": 3,
  "durationMs": 12,
  "stateDistribution": {
    "active": 1,
    "ready": 2,
    "silent": 0
  }
}
```

### sparn_stats

Get optimization statistics from the memory store.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `reset` | boolean | No | If true, clear all statistics (default: false) |

**Example response:**

```json
{
  "totalCommands": 42,
  "totalTokensSaved": 85000,
  "averageReduction": "63.2%",
  "recentOptimizations": [
    {
      "timestamp": "2026-02-23T10:30:00.000Z",
      "tokensBefore": 5000,
      "tokensAfter": 1800,
      "entriesPruned": 15,
      "durationMs": 23,
      "reduction": "64.0%"
    }
  ]
}
```

### sparn_consolidate

Run memory consolidation (sleep replay). Removes decayed entries and merges duplicates.

**Parameters:** None

**Example response:**

```json
{
  "entriesBefore": 150,
  "entriesAfter": 95,
  "decayedRemoved": 30,
  "duplicatesRemoved": 25,
  "compressionRatio": "63.3%",
  "durationMs": 45,
  "vacuumCompleted": true
}
```

## Programmatic Usage

You can also create the MCP server programmatically:

```typescript
import { createKVMemory } from '@ulrichc1/sparn';
import { createSparnMcpServer } from '@ulrichc1/sparn';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const memory = await createKVMemory('./my-project/.sparn/memory.db');
const server = createSparnMcpServer({ memory });

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Architecture

The MCP server acts as a bridge between MCP clients and Sparn's core optimization engine:

```
MCP Client (Claude Desktop, VS Code, etc.)
    |
    | JSON-RPC over stdio
    |
Sparn MCP Server (src/mcp/server.ts)
    |
    |-- sparn_optimize  --> GenericAdapter --> Optimization Pipeline
    |-- sparn_stats     --> KVMemory --> optimization_stats table
    |-- sparn_consolidate --> SleepCompressor --> KVMemory
    |
SQLite Database (.sparn/memory.db)
```

## Troubleshooting

### Server not showing up in Claude Desktop

1. Verify the path in `claude_desktop_config.json` is absolute
2. Check that the build is up to date: `npm run build`
3. Restart Claude Desktop completely (quit from system tray, not just close window)

### Checking server logs

The MCP server logs to stderr. For Claude Desktop, check:

- **macOS:** `~/Library/Logs/Claude/mcp-server-sparn.log`
- **Windows:** `%LOCALAPPDATA%\Claude\Logs\mcp-server-sparn.log`

### Database issues

If you encounter database errors, try:

```bash
# Remove and recreate the database
rm .sparn/memory.db
node dist/mcp/index.js
```
