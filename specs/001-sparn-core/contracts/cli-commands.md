# CLI Commands Contract

**Package**: sparn
**Entry Point**: `sparn` binary (npm global install or npx)
**Version**: 0.1.0

## Overview

This document defines the command-line interface contract for Sparn. All commands follow POSIX conventions and support `--help` and `--json` flags.

---

## Global Flags

All commands support:

```bash
--help, -h      Show help for command
--json          Output in JSON format (machine-readable)
--version, -v   Show version number (root command only)
```

**Exit Codes**:
- `0`: Success
- `1`: Error (invalid args, operation failed)
- `2`: Partial success (some entries failed)

---

## Commands

### 1. sparn init

**Purpose**: Initialize Sparn in current project

**Usage**:
```bash
sparn init [options]
```

**Options**:
```
--force, -f     Force overwrite if .sparn/ already exists
--json          Output result as JSON
```

**Behavior**:
- Creates `.sparn/` directory in current working directory
- Creates `.sparn/config.yaml` with default settings
- Creates `.sparn/memory.db` SQLite database
- Shows branded welcome banner (unless `--json`)
- Prompts for confirmation if `.sparn/` exists (unless `--force`)
- Completes in <2 seconds (success criterion)

**Output (Human-Readable)**:
```
🧠 Sparn initialized!

Config: /path/to/project/.sparn/config.yaml
Database: /path/to/project/.sparn/memory.db

Run 'sparn optimize' to start optimizing context.
```

**Output (JSON)**:
```json
{
  "success": true,
  "configPath": "/path/to/project/.sparn/config.yaml",
  "dbPath": "/path/to/project/.sparn/memory.db",
  "durationMs": 450
}
```

**Errors**:
- Exit 1 if .sparn/ exists and not --force
- Exit 1 if directory creation fails (permissions)

---

### 2. sparn optimize

**Purpose**: Optimize context using neuroscience-inspired pruning

**Usage**:
```bash
sparn optimize [options] [input]
cat context.txt | sparn optimize
```

**Arguments**:
```
input           Input file path (optional, defaults to stdin)
```

**Options**:
```
--output, -o FILE       Output file path (defaults to stdout)
--agent, -a NAME        Agent adapter (claude-code|generic, default: from config)
--dry-run               Show what would be pruned without modifying memory store
--verbose, -v           Show detailed per-entry scoring
--threshold, -t NUM     Pruning threshold 1-100 (overrides config)
--json                  Output result as JSON
```

**Behavior**:
- Reads context from stdin or file
- Applies optimization pipeline:
  1. Sparse pruning (TF-IDF relevance, keep top threshold%)
  2. Engram scoring (decay calculation)
  3. Confidence state filtering (Active → always, Ready → if space, Silent → never)
  4. BTSP detection and flagging
  5. Memory store update (unless --dry-run)
- Outputs optimized context to stdout or file
- Shows summary (unless --json)
- Completes in <500ms for 100K tokens (success criterion)

**Output (Human-Readable)**:
```
⚡ Optimized context

Tokens: 45,231 → 2,315 (94.9% reduction)
Entries: Active 12 | Ready 34 | Pruned 189
Duration: 287ms

[optimized context output follows]
```

**Output (JSON)**:
```json
{
  "success": true,
  "optimizedContext": "...",
  "tokensBefore": 45231,
  "tokensAfter": 2315,
  "entriesPruned": 189,
  "durationMs": 287,
  "stateDistribution": {
    "active": 12,
    "ready": 34,
    "silent": 189
  }
}
```

**Errors**:
- Exit 1 if input file not found
- Exit 1 if context exceeds 500K tokens
- Exit 2 if some entries failed to process

---

### 3. sparn stats

**Purpose**: View cumulative optimization statistics

**Usage**:
```bash
sparn stats [options]
```

**Options**:
```
--graph, -g     Show bar chart of savings over time
--reset         Clear all statistics (prompts for confirmation)
--json          Output result as JSON
```

**Behavior**:
- Reads optimization history from `.sparn/memory.db`
- Shows total commands, tokens saved, average reduction
- With `--graph`: ASCII bar chart (last 7 days or last 20 sessions)
- With `--reset`: Prompts "Clear all stats? (y/n)", then deletes all optimization_stats rows

**Output (Human-Readable)**:
```
📊 Sparn Statistics

Total commands: 47
Tokens saved: 1,234,567 (avg 82.3% reduction)
Sessions: 23

Last 7 days:
2026-02-22 ████████████████████ 156K saved
2026-02-21 ████████████ 89K saved
2026-02-20 ██████████████ 102K saved
...
```

**Output (JSON)**:
```json
{
  "success": true,
  "totalCommands": 47,
  "totalTokensSaved": 1234567,
  "averageReduction": 82.3,
  "sessionCount": 23,
  "history": [
    { "timestamp": 1708646400, "tokensSaved": 156000, "reductionPercent": 85.2 },
    ...
  ]
}
```

---

### 4. sparn relay

**Purpose**: Proxy CLI commands through optimization pipeline

**Usage**:
```bash
sparn relay <command> [args...]
```

**Arguments**:
```
command         Command to execute (e.g., git, npm, cargo)
args...         Arguments to pass to command
```

**Options**:
```
--silent, -s    Suppress savings summary
--json          Output result as JSON
```

**Behavior**:
- Executes `<command>` with args in child process
- Captures stdout/stderr
- Pipes output through optimization pipeline
- Preserves exit code from proxied command
- Shows one-line savings summary after output (unless --silent)

**Output (Human-Readable)**:
```
[command output here, optimized]

⚡ Saved 12,345 tokens (67.8% reduction)
```

**Output (JSON)**:
```json
{
  "success": true,
  "exitCode": 0,
  "output": "...",
  "tokensBefore": 18234,
  "tokensAfter": 5889,
  "entriesPruned": 45,
  "durationMs": 123
}
```

**Errors**:
- Exit code matches proxied command exit code
- Exit 1 if command not found

---

### 5. sparn consolidate

**Purpose**: Run sleep compression cycle (memory consolidation)

**Usage**:
```bash
sparn consolidate [options]
```

**Options**:
```
--json          Output result as JSON
```

**Behavior**:
- Loads all entries from `.sparn/memory.db`
- Removes entries with decay ≥ 0.95 (fully decayed)
- Deduplicates exact matches (by hash)
- Finds near-duplicates (cosine similarity ≥ 0.85)
- Merges duplicate groups (keep highest score, sum access counts)
- Compacts database (VACUUM)
- Shows report

**Output (Human-Readable)**:
```
🌙 Sleep consolidation complete

Entries: 8,234 → 2,145 (73.9% compression)
Duplicates merged: 412 groups
Duration: 1.8s
```

**Output (JSON)**:
```json
{
  "success": true,
  "entriesBefore": 8234,
  "entriesAfter": 2145,
  "compressionRatio": 73.9,
  "durationMs": 1800
}
```

---

### 6. sparn config

**Purpose**: View or modify configuration

**Usage**:
```bash
sparn config [get|set] [key] [value]
```

**Subcommands**:
```
sparn config                    Show all config (opens in $EDITOR)
sparn config get <key>          Get specific config value
sparn config set <key> <value>  Set specific config value
```

**Options**:
```
--json          Output result as JSON (for get)
```

**Examples**:
```bash
sparn config get pruning.threshold
# Output: 5

sparn config set pruning.threshold 10
# Output: Config updated: pruning.threshold = 10

sparn config set ui.sounds true
# Output: Config updated: ui.sounds = true
```

**Valid Keys**:
- `pruning.threshold` (1-100)
- `pruning.aggressiveness` (0-100)
- `decay.defaultTTL` (hours, positive number)
- `decay.decayThreshold` (0.0-1.0)
- `states.activeThreshold` (0.0-1.0)
- `states.readyThreshold` (0.0-1.0)
- `agent` (claude-code | generic)
- `ui.colors` (true | false)
- `ui.sounds` (true | false)
- `ui.verbose` (true | false)
- `autoConsolidate` (hours, positive number or null)

**Behavior**:
- Reads from `.sparn/config.yaml`
- Validates values before setting
- Writes updated YAML back to disk
- Rejects invalid keys or values with helpful error

**Errors**:
- Exit 1 if key not found (get)
- Exit 1 if value invalid (set)
- Exit 1 if .sparn/config.yaml not found (run `sparn init` first)

---

## ASCII Banner

Shown on `sparn init` and `sparn --version`:

```
   ____  ____  ___    ____  _   __
  / __ \/ __ \/   |  / __ \/ | / /
 / /_/ / /_/ / /| | / /_/ /  |/ /
 \__, / ____/ ___ |/ _, _/ /|  /
/____/_/   /_/  |_/_/ |_/_/ |_/

🧠 Neuroscience-inspired context optimization
v0.1.0
```

---

## Color Scheme (Article VIII)

- **Neural Cyan** (#00D4AA): Success messages, active operations
- **Synapse Violet** (#7B61FF): Highlights, graphs, numbers
- **Error Red** (#FF6B6B): Failures, pruned items

**Example**:
```
⚡ Optimized context               (Neural Cyan)

Tokens: 45,231 → 2,315            (Synapse Violet for numbers)
Entries: Active 12 | Pruned 189   (Pruned in Error Red)
```

---

## Completions

Future enhancement (not v0.1): Shell completions for bash/zsh/fish via `sparn completion <shell>`.

---

## Summary

All 6 CLI commands defined with detailed usage, options, output formats, and error handling. Ready for implementation.
