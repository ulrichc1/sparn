# Quickstart: Sparn Core

**Version**: 0.1.0
**Status**: Implementation Guide

## Overview

This quickstart guide shows developers how to use Sparn to optimize AI agent context memory. It covers both CLI and programmatic API usage.

---

## Installation

### Global CLI Install

```bash
npm install -g sparn

# Verify installation
sparn --version
# Output: v0.1.0
```

### Project Dependency

```bash
npm install sparn

# Or with Yarn
yarn add sparn
```

---

## Quick Start (CLI)

### 1. Initialize Sparn in Your Project

```bash
cd your-project/
sparn init
```

**Output**:
```
🧠 Sparn initialized!

Config: /your-project/.sparn/config.yaml
Database: /your-project/.sparn/memory.db

Run 'sparn optimize' to start optimizing context.
```

This creates:
- `.sparn/config.yaml` — Configuration file with sensible defaults
- `.sparn/memory.db` — SQLite database for memory storage

### 2. Optimize Context

**From stdin**:
```bash
cat large-context.txt | sparn optimize > optimized.txt
```

**From file**:
```bash
sparn optimize --input context.txt --output optimized.txt
```

**Output**:
```
⚡ Optimized context

Tokens: 45,231 → 2,315 (94.9% reduction)
Entries: Active 12 | Ready 34 | Pruned 189
Duration: 287ms
```

### 3. Relay Commands

Optimize CLI command output on-the-fly:

```bash
sparn relay git log --oneline -20
sparn relay npm list
sparn relay cargo test --verbose
```

**Output**:
```
[optimized command output]

⚡ Saved 3,456 tokens (78.2% reduction)
```

### 4. View Statistics

```bash
sparn stats
```

**Output**:
```
📊 Sparn Statistics

Total commands: 47
Tokens saved: 1,234,567 (avg 82.3% reduction)
Sessions: 23
```

With graph:
```bash
sparn stats --graph
```

**Output**:
```
Last 7 days:
2026-02-22 ████████████████████ 156K saved
2026-02-21 ████████████ 89K saved
2026-02-20 ██████████████ 102K saved
```

### 5. Consolidate Memory

Run periodic cleanup (sleep compression):

```bash
sparn consolidate
```

**Output**:
```
🌙 Sleep consolidation complete

Entries: 8,234 → 2,145 (73.9% compression)
Duplicates merged: 412 groups
Duration: 1.8s
```

### 6. Configure Behavior

View current config:
```bash
sparn config
# Opens .sparn/config.yaml in $EDITOR
```

Get specific value:
```bash
sparn config get pruning.threshold
# Output: 5
```

Set value:
```bash
sparn config set pruning.threshold 10
# Output: Config updated: pruning.threshold = 10
```

---

## Quick Start (Programmatic API)

### Basic Optimization

```typescript
import { createSparsePruner, estimateTokens } from 'sparn';

const context = `
Line 1: Old file content
Line 2: More old content
Line 3: Error: Connection timeout
Line 4: Important debug info
...
`;

// Create pruner with default config (keep top 5%)
const pruner = createSparsePruner();

// Prune context
const result = pruner.prune(context, 5);

console.log(`Tokens before: ${estimateTokens(context)}`);
console.log(`Tokens after: ${estimateTokens(result.prunedContext)}`);
console.log(`Kept ${result.entriesKept.length} entries`);
console.log(`Removed ${result.entriesRemoved.length} entries`);
```

### Using KV Memory Store

```typescript
import { createKVMemory, type MemoryEntry } from 'sparn';

async function storeAndQuery() {
  const memory = await createKVMemory('./.sparn/memory.db');

  // Store an entry
  const entry: MemoryEntry = {
    id: crypto.randomUUID(),
    content: 'Error: Connection timeout',
    hash: 'abc123...',
    timestamp: Date.now() / 1000,
    score: 0.85,
    ttl: 86400,
    state: 'active',
    accessCount: 0,
    tags: ['error'],
    metadata: { severity: 'high' },
    isBTSP: true,
  };

  await memory.put(entry);

  // Query active entries
  const activeEntries = await memory.query({
    state: 'active',
    minScore: 0.7,
    limit: 10,
  });

  console.log(`Found ${activeEntries.length} active entries`);

  // Cleanup
  await memory.close();
}
```

### Full Pipeline Example

```typescript
import {
  createSparsePruner,
  createEngramScorer,
  createConfidenceStates,
  createBTSPEmbedder,
  estimateTokens,
  hashContent,
  type MemoryEntry,
} from 'sparn';

async function optimizeWithPipeline(context: string) {
  // Initialize modules
  const pruner = createSparsePruner({ threshold: 5 });
  const scorer = createEngramScorer({ defaultTTL: 24 });
  const states = createConfidenceStates();
  const btsp = createBTSPEmbedder();

  // Step 1: Sparse pruning
  const pruneResult = pruner.prune(context, 5);

  // Step 2: Create entries from kept lines
  const entries: MemoryEntry[] = pruneResult.entriesKept.map(line => {
    const isBTSPEntry = btsp.detectBTSP(line);

    return {
      id: crypto.randomUUID(),
      content: line,
      hash: hashContent(line),
      timestamp: Date.now() / 1000,
      score: isBTSPEntry ? 1.0 : 0.5,
      ttl: isBTSPEntry ? 172800 : 86400, // 48h for BTSP, 24h otherwise
      state: isBTSPEntry ? 'active' : 'ready',
      accessCount: 0,
      tags: [],
      metadata: {},
      isBTSP: isBTSPEntry,
    };
  });

  // Step 3: Score and transition
  const scoredEntries = entries.map(entry => {
    const score = scorer.calculateScore(entry);
    return states.transition({ ...entry, score });
  });

  // Step 4: Filter by state
  const activeEntries = scoredEntries.filter(e => e.state === 'active');
  const readyEntries = scoredEntries.filter(e => e.state === 'ready');

  // Step 5: Build optimized context (active + ready if space)
  const finalEntries = [...activeEntries, ...readyEntries.slice(0, 20)];
  const optimizedContext = finalEntries.map(e => e.content).join('\n');

  return {
    optimizedContext,
    tokensBefore: estimateTokens(context),
    tokensAfter: estimateTokens(optimizedContext),
    distribution: states.getDistribution(scoredEntries),
  };
}
```

---

## Common Workflows

### Workflow 1: Claude Code Integration

Use Sparn to optimize context before Claude Code sessions:

```bash
# Generate context file
cat src/**/*.ts > context.txt

# Optimize
sparn optimize --input context.txt --output optimized.txt

# Pass to Claude Code
# (Integration with PreToolUse hook - future enhancement)
```

### Workflow 2: Daily Cleanup

Schedule daily consolidation via cron:

```bash
# Add to crontab
0 2 * * * cd /your-project && sparn consolidate
```

Or configure auto-consolidation:

```bash
sparn config set autoConsolidate 24  # Every 24 hours
```

### Workflow 3: Git Diff Optimization

Optimize large git diffs:

```bash
git diff | sparn optimize | less
```

Or via relay:

```bash
sparn relay git diff --stat
```

### Workflow 4: Build Log Analysis

Optimize verbose build logs:

```bash
sparn relay npm run build
sparn relay cargo build --verbose
sparn relay tsc --noEmit
```

---

## Configuration Reference

`.sparn/config.yaml`:

```yaml
# Pruning settings
pruning:
  threshold: 5          # Keep top 5% (1-100)
  aggressiveness: 50    # TF-IDF weight (0-100)

# Decay settings
decay:
  defaultTTL: 24        # Hours (default: 24h)
  decayThreshold: 0.95  # Prune threshold (0.0-1.0)

# Confidence state thresholds
states:
  activeThreshold: 0.7  # Score > 0.7 → active
  readyThreshold: 0.3   # Score 0.3-0.7 → ready

# Agent adapter
agent: generic          # claude-code | generic

# UI settings
ui:
  colors: true          # Colored output
  sounds: false         # Sound effects (default: false)
  verbose: false        # Verbose logging

# Auto-consolidation (hours, or null for manual)
autoConsolidate: null
```

---

## Troubleshooting

### Issue: "Not initialized"

**Error**: `Error: .sparn/ not found. Run 'sparn init' first.`

**Solution**:
```bash
cd your-project/
sparn init
```

### Issue: Context too large

**Error**: `Error: Context exceeds 500K tokens`

**Solution**: Split context into smaller chunks or increase threshold:
```bash
sparn config set pruning.threshold 10  # Keep top 10% instead of 5%
```

### Issue: No entries active

**Problem**: All entries marked as silent, no context retained

**Solution**: Lower active threshold:
```bash
sparn config set states.activeThreshold 0.5
```

### Issue: Database locked

**Error**: `Error: database is locked`

**Solution**: Close other Sparn processes or consolidate:
```bash
sparn consolidate  # Unlocks and compacts database
```

---

## Best Practices

1. **Initialize Once**: Run `sparn init` once per project root

2. **Regular Consolidation**: Run `sparn consolidate` weekly or enable auto-consolidation

3. **Monitor Stats**: Check `sparn stats` to track savings

4. **Tune for Your Project**:
   - Code-heavy projects: Lower threshold (keep more context)
   - Log-heavy projects: Higher threshold (aggressive pruning)

5. **Use Relay for CLIs**: Wrap frequently-run commands in `sparn relay`

6. **BTSP for Errors**: Errors are automatically flagged as high-priority (BTSP)

7. **Tag Important Entries**: Use metadata for custom filtering (programmatic API)

---

## Next Steps

- Read [NEUROSCIENCE.md](../../docs/NEUROSCIENCE.md) for brain-to-code mappings
- Explore [CLI Commands Contract](./contracts/cli-commands.md) for advanced usage
- Check [Library API Contract](./contracts/library-api.md) for programmatic details
- Review [Data Model](./data-model.md) for database schema

---

## Support

- Report issues: [GitHub Issues](https://github.com/ulrichc1/sparn/issues)
- Discussions: [GitHub Discussions](https://github.com/ulrichc1/sparn/discussions)
- License: MIT
- Author: @ulrichc1
