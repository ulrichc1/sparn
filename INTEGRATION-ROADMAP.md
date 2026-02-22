# Sparn + Claude Code Integration Roadmap

## Vision
Enable seamless real-time context optimization within Claude Code CLI sessions, reducing token usage by 60-90% without user intervention.

---

## Phase 1: Claude Code Skill (Week 1)

### Goal
Create a Claude Code skill that allows invoking Sparn from the CLI.

### Tasks

#### 1.1 Create Skill Directory Structure
```bash
.claude/skills/sparn/
├── skill.json           # Skill metadata
├── agent.md             # Agent instructions
├── tools/
│   ├── optimize.sh      # Optimization tool
│   ├── stats.sh         # Statistics tool
│   └── daemon.sh        # Daemon control
└── README.md            # User documentation
```

#### 1.2 Skill Commands
- `/sparn.go` - Start auto-optimization for current session
- `/sparn.optimize` - Manually optimize current context
- `/sparn.stats` - Show optimization statistics
- `/sparn.stop` - Stop auto-optimization

#### 1.3 Implementation Files

**`.claude/skills/sparn/skill.json`**
```json
{
  "name": "sparn",
  "version": "1.0.0",
  "description": "Real-time context optimization for Claude Code",
  "author": "@ulrichc1",
  "commands": [
    {
      "name": "sparn.go",
      "description": "Start auto-optimization for current session",
      "type": "agent"
    },
    {
      "name": "sparn.optimize",
      "description": "Manually optimize current context",
      "type": "tool"
    },
    {
      "name": "sparn.stats",
      "description": "Show optimization statistics",
      "type": "tool"
    }
  ],
  "permissions": {
    "read": [".claude/projects/**/*.jsonl"],
    "write": [".claude/projects/**/optimized/**"],
    "execute": ["sparn"]
  }
}
```

**`.claude/skills/sparn/agent.md`**
```markdown
# Sparn Agent

You are a context optimization agent that runs Sparn to reduce token usage.

## Your Role
- Monitor the current Claude Code session
- Detect when context approaches token limits
- Optimize context using Sparn's neuroscience-inspired algorithms
- Preserve critical information while pruning redundant content

## How to Optimize

1. **Get current session path**:
   ```bash
   SESSION_FILE="$(find ~/.claude/projects -name '*.jsonl' -type f -exec ls -t {} + | head -1)"
   ```

2. **Extract context** (last 100 messages):
   ```bash
   tail -100 "$SESSION_FILE" | jq -r '.content | select(. != null)' > /tmp/context.txt
   ```

3. **Optimize with Sparn**:
   ```bash
   sparn optimize -i /tmp/context.txt -o /tmp/optimized.txt
   ```

4. **Report savings**:
   ```bash
   sparn stats --last
   ```

## When to Optimize
- Context exceeds 100,000 tokens
- User runs `/sparn.go` or `/sparn.optimize`
- Every 50 messages (configurable)
- Before expensive operations (web search, file analysis)

## Configuration
Read from `.sparn/config.yaml` in the project root.
```

**`.claude/skills/sparn/tools/optimize.sh`**
```bash
#!/usr/bin/env bash
# Optimize current Claude Code session context

set -e

# Find current session
SESSION_FILE="$(find ~/.claude/projects -name '*.jsonl' -type f -exec ls -t {} + | head -1)"

if [ ! -f "$SESSION_FILE" ]; then
  echo "❌ No active session found"
  exit 1
fi

# Create temp files
CONTEXT_FILE=$(mktemp)
OPTIMIZED_FILE=$(mktemp)

# Extract recent context (last 100 messages)
tail -100 "$SESSION_FILE" | jq -r '.content | select(. != null)' > "$CONTEXT_FILE"

# Run Sparn optimization
echo "🧠 Optimizing context with Sparn..."
sparn optimize -i "$CONTEXT_FILE" -o "$OPTIMIZED_FILE"

# Show results
echo ""
echo "✓ Optimization complete!"
sparn stats --last

# Cleanup
rm -f "$CONTEXT_FILE" "$OPTIMIZED_FILE"
```

#### 1.4 Testing
```bash
# Install skill
mkdir -p ~/.claude/skills/sparn
cp -r .claude/skills/sparn/* ~/.claude/skills/sparn/

# Test in Claude Code
claude-code
> /sparn.go
> /sparn.stats
```

---

## Phase 2: Real-Time Monitoring (Week 2)

### Goal
Run Sparn as a background daemon that monitors Claude Code sessions.

### Tasks

#### 2.1 Daemon Implementation
- `sparn daemon start` - Start background process
- `sparn daemon stop` - Stop daemon
- `sparn daemon status` - Check if running
- `sparn daemon logs` - View daemon logs

#### 2.2 Session Watcher
- Watch `.claude/projects/**/*.jsonl` for changes
- Detect new messages added to session
- Calculate token count in real-time
- Trigger optimization at thresholds

#### 2.3 Notification System
- Desktop notifications (optional)
- Log file: `.sparn/daemon.log`
- Stats dashboard: `sparn daemon stats`

**Implementation sketch**:
```typescript
// src/cli/commands/daemon.ts
import { watch } from 'chokidar';
import { readFileSync } from 'fs';

export async function daemonStart() {
  const watcher = watch('~/.claude/projects/**/*.jsonl');

  watcher.on('change', async (path) => {
    const tokens = estimateTokens(readFileSync(path, 'utf-8'));

    if (tokens > 100000) {
      console.log('🧠 Threshold reached, optimizing...');
      await optimizeSession(path);
    }
  });
}
```

---

## Phase 3: Hook Integration (Week 3)

### Goal
Integrate with Claude Code's hook system for automatic optimization.

### Tasks

#### 3.1 Create Hooks
**`.claude/hooks/before-submit.sh`**
```bash
#!/usr/bin/env bash
# Auto-optimize before submitting prompt

THRESHOLD=100000

# Get current token count
TOKENS=$(sparn estimate-tokens)

if [ "$TOKENS" -gt "$THRESHOLD" ]; then
  echo "🧠 Context exceeds ${THRESHOLD} tokens, optimizing..."
  sparn optimize --session-current
fi
```

#### 3.2 Configuration
Add to `.sparn/config.yaml`:
```yaml
hooks:
  enabled: true
  beforeSubmit: true
  afterResponse: false
  threshold: 100000
```

---

## Phase 4: MCP Server (Week 4)

### Goal
Expose Sparn as an MCP server for Claude Code.

### Tasks

#### 4.1 MCP Server Implementation
```typescript
// src/mcp/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({
  name: 'sparn',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {
      optimize_context: {
        description: 'Optimize context using Sparn',
        inputSchema: {
          type: 'object',
          properties: {
            context: { type: 'string' },
            keepPercent: { type: 'number', default: 5 }
          }
        }
      }
    }
  }
});
```

#### 4.2 MCP Config
Add to Claude Code's MCP settings:
```json
{
  "mcpServers": {
    "sparn": {
      "command": "npx",
      "args": ["@ulrichc1/sparn", "mcp"],
      "env": {}
    }
  }
}
```

---

## Phase 5: Performance Optimization (Week 5)

### Goal
Make real-time optimization fast enough for seamless use.

### Tasks

#### 5.1 Incremental Processing
- Cache optimization results
- Only re-optimize new content
- Diff-based updates

#### 5.2 Lazy Loading
- Don't load entire session into memory
- Stream processing for large contexts
- Chunk-based optimization

#### 5.3 Performance Targets
- < 50ms for incremental optimization
- < 500ms for full session optimization
- < 10MB memory overhead for daemon

---

## Quick Start Commands (After Implementation)

### Option 1: Manual Workflow
```bash
# In your project
sparn init

# In Claude Code CLI
/sparn.go  # Start auto-optimization
# ... use Claude Code normally ...
/sparn.stats  # View savings
```

### Option 2: Auto-Start with Skip Permissions
```bash
# Add to ~/.bashrc or fish.config
alias claude-code-sparn='sparn daemon start && claude-code --skip-permissions && sparn daemon stop'

# Usage
claude-code-sparn  # Starts Sparn daemon + Claude Code, stops daemon on exit
```

### Option 3: Hook-Based (Fully Automated)
```bash
# One-time setup
sparn init
sparn config set hooks.enabled true
sparn config set hooks.threshold 100000

# Use Claude Code normally - Sparn optimizes automatically
claude-code
```

---

## Success Metrics

After implementation, measure:
- ✅ Average token reduction per session (target: 60-90%)
- ✅ Optimization latency (target: <500ms)
- ✅ User intervention required (target: 0 for auto mode)
- ✅ Context quality preserved (target: >95% task completion)
- ✅ Memory usage (target: <10MB overhead)

---

## Next Steps

1. **Create GitHub Issue**: "Feature: Claude Code Integration"
2. **Spec out Phase 1**: Detailed technical design for skill
3. **Prototype**: Build minimal viable skill
4. **Test**: Validate with real Claude Code sessions
5. **Iterate**: Refine based on usage patterns

---

**Status**: 📋 Roadmap defined, ready for implementation
**ETA**: 5 weeks for full integration
**Priority**: Phase 1 (Claude Code Skill) - Start immediately
