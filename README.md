# Cortex

Context optimization for AI coding agents. Reduces token usage by 60-90% so your Claude Code sessions last longer and cost less.

## Why

Long Claude Code sessions burn through context windows fast. Tool outputs, file reads, and conversation history pile up until you hit the limit and lose your thread. Cortex watches for this and keeps your context lean:

- Compresses verbose tool outputs (test results, build logs, file reads)
- Tracks which context is still relevant and which has gone stale
- Runs as a background daemon or hooks directly into Claude Code
- Analyzes your codebase structure so Claude gets the right context first

## Install

```bash
npm install -g @sparn/cortex
```

## Setup with Claude Code

The fastest way to get value is to install the Claude Code hooks. These run automatically in the background - no workflow changes needed.

```bash
# Initialize cortex in your project
cd your-project
cortex init

# Install hooks into Claude Code
cortex hooks install

# Or install globally (all projects)
cortex hooks install --global
```

That's it. Cortex now:
- Summarizes large tool outputs after Bash, Read, Grep, and Glob calls
- Warns Claude when your session transcript is getting large

To check status or remove:
```bash
cortex hooks status
cortex hooks uninstall
```

## Daily Usage

### Optimize context manually

Pipe any text through cortex to compress it:

```bash
cat large-context.txt | cortex optimize
```

### Relay commands

Wrap any CLI command to automatically optimize its output:

```bash
cortex relay git log --oneline -50
cortex relay npm test
cortex relay cargo build --verbose
```

### Check your savings

```bash
cortex stats
```

### Background daemon

For always-on optimization, start the daemon. It watches your session files and optimizes automatically when context exceeds the configured threshold.

```bash
cortex daemon start
cortex daemon status
cortex daemon stop
```

## Codebase Intelligence (v1.4)

Cortex can analyze your project structure to provide smarter context to Claude Code.

### Dependency graph

Map your project's import/export relationships:

```bash
# Full analysis: entry points, hot paths, orphaned files
cortex graph --analyze

# Focus on files related to "auth"
cortex graph --focus auth

# Trace dependencies from an entry point
cortex graph --entry src/index.ts
```

### Search

Full-text search across your codebase using FTS5 (SQLite) with ripgrep fallback:

```bash
# First time: initialize and index
cortex search init

# Search
cortex search validateToken

# Re-index after changes
cortex search refresh
```

### Generate CLAUDE.md

Auto-generate a `CLAUDE.md` file from your project structure, dependencies, and scripts:

```bash
cortex docs

# Skip dependency graph analysis
cortex docs --no-graph

# Custom output path
cortex docs -o docs/CLAUDE.md
```

### Workflow planner

Create and track implementation plans with token budgets:

```bash
# Create a plan
cortex plan "Add user authentication" --files src/auth.ts src/routes.ts

# Create with search context
cortex plan "Fix login bug" --searches "login handler" "auth middleware"

# List existing plans
cortex plan list

# Execute a plan
cortex exec <plan-id>

# Verify completion
cortex verify <plan-id>
```

### Technical debt tracker

Track technical debt with severity levels and repayment dates:

```bash
# Add debt
cortex debt add "Refactor auth middleware" --severity P1 --tokens 5000

# Add with due date and affected files
cortex debt add "Fix N+1 queries" --severity P0 --due 2026-03-01 --files src/db.ts

# List all debt
cortex debt list

# List overdue items
cortex debt list --overdue

# Mark as resolved
cortex debt resolve <id>

# View stats
cortex debt stats
```

## Configuration

After `cortex init`, edit `.cortex/config.yaml`:

```yaml
pruning:
  threshold: 5          # Keep top 5% of context (1-100)
  aggressiveness: 50    # How aggressively to prune (0-100)

decay:
  defaultTTL: 24        # Hours before context starts fading
  decayThreshold: 0.95  # Score threshold for pruning

states:
  activeThreshold: 0.7  # Score >= 0.7 = active (kept)
  readyThreshold: 0.3   # Score 0.3-0.69 = ready (may be kept)

realtime:
  tokenBudget: 40000        # Target token count after optimization
  autoOptimizeThreshold: 60000  # Trigger optimization above this
  debounceMs: 5000          # Wait time between optimizations

agent: generic  # or claude-code
```

Or use the CLI:
```bash
cortex config get pruning.threshold
cortex config set pruning.threshold 10
```

Or the interactive mode:
```bash
cortex interactive
```

## Programmatic API

```typescript
import { createSparsePruner, estimateTokens } from '@sparn/cortex';

const pruner = createSparsePruner({ threshold: 5 });
const result = pruner.prune(largeContext, 5);

console.log(`${estimateTokens(largeContext)} -> ${estimateTokens(result.prunedContext)} tokens`);
```

The full API exports all core modules: `createDependencyGraph`, `createSearchEngine`, `createWorkflowPlanner`, `createDocsGenerator`, `createDebtTracker`, `createKVMemory`, `createBudgetPrunerFromConfig`, `createIncrementalOptimizer`, and more.

## MCP Server

Cortex can run as an MCP server for Claude Desktop or any MCP client:

```bash
cortex mcp:server
```

Exposes three tools: `cortex_optimize`, `cortex_stats`, `cortex_consolidate`.

## How it works

Cortex uses a multi-stage pipeline to decide what context to keep:

- **Relevance filtering** - Only the most relevant 2-5% of context carries the signal
- **Time-based decay** - Older context fades over time unless reinforced by reuse
- **Entry classification** - Entries are active, ready, or silent based on their score
- **Critical event detection** - Errors and stack traces get permanently flagged as important
- **Periodic consolidation** - Merges duplicate entries and cleans up stale data

## Development

```bash
git clone https://github.com/sparn-labs/cortex.git
cd cortex
npm install
npm run build
npm test          # 479 tests
npm run lint
npm run typecheck
```

## License

MIT
