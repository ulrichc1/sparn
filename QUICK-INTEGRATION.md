# Quick Integration: Use Sparn with Claude Code TODAY

## 🚀 Immediate Solutions (No Code Changes Needed)

### Option 1: Manual Optimization Workflow

```bash
# 1. Start your Claude Code session
claude-code

# 2. When context gets large, save recent conversation
# (In another terminal while Claude Code is running)
LATEST_SESSION=$(find ~/.claude/projects -name '*.jsonl' -type f -exec ls -t {} + | head -1)
tail -100 "$LATEST_SESSION" | jq -r 'select(.role == "user" or .role == "assistant") | .content | select(. != null)' > /tmp/claude-context.txt

# 3. Optimize it
sparn optimize -i /tmp/claude-context.txt -o /tmp/optimized-context.txt

# 4. View savings
cat /tmp/optimized-context.txt
sparn stats
```

### Option 2: Create a Bash Alias

Add to `~/.bashrc`:

```bash
# Optimize latest Claude Code session
alias sparn-claude='
  LATEST=$(find ~/.claude/projects -name "*.jsonl" -type f -exec ls -t {} + | head -1) && \
  tail -100 "$LATEST" | jq -r "select(.role == \"user\" or .role == \"assistant\") | .content | select(. != null)" > /tmp/claude-context.txt && \
  sparn optimize -i /tmp/claude-context.txt -o /tmp/optimized-context.txt && \
  echo "" && \
  echo "✓ Optimized context saved to /tmp/optimized-context.txt" && \
  sparn stats --last
'
```

Then use:
```bash
# From any terminal (while Claude Code is running)
sparn-claude
```

### Option 3: Simple Shell Script

Create `~/bin/claude-sparn.sh`:

```bash
#!/usr/bin/env bash
# Optimize current Claude Code session

set -e

echo "🧠 Sparn + Claude Code Integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Find latest session
LATEST_SESSION=$(find ~/.claude/projects -name '*.jsonl' -type f -exec ls -t {} + | head -1)

if [ -z "$LATEST_SESSION" ]; then
  echo "❌ No Claude Code session found"
  exit 1
fi

echo "📂 Session: $LATEST_SESSION"

# Extract context (last N messages)
MESSAGE_COUNT=${1:-100}  # Default 100 messages
CONTEXT_FILE=$(mktemp)
OPTIMIZED_FILE=$(mktemp)

echo "📝 Extracting last $MESSAGE_COUNT messages..."
tail -"$MESSAGE_COUNT" "$LATEST_SESSION" | \
  jq -r 'select(.role == "user" or .role == "assistant") | .content | select(. != null)' > "$CONTEXT_FILE"

# Count tokens before
TOKENS_BEFORE=$(wc -w < "$CONTEXT_FILE" | awk '{print $1 * 1.3}' | cut -d. -f1)
echo "📊 Tokens before: ~$TOKENS_BEFORE"

# Optimize
echo "⚙️  Optimizing with Sparn..."
sparn optimize -i "$CONTEXT_FILE" -o "$OPTIMIZED_FILE" 2>/dev/null

# Count tokens after
TOKENS_AFTER=$(wc -w < "$OPTIMIZED_FILE" | awk '{print $1 * 1.3}' | cut -d. -f1)
REDUCTION=$(awk "BEGIN {printf \"%.1f\", (($TOKENS_BEFORE - $TOKENS_AFTER) / $TOKENS_BEFORE) * 100}")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Optimization Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Before:  ~$TOKENS_BEFORE tokens"
echo "  After:   ~$TOKENS_AFTER tokens"
echo "  Saved:   ~$((TOKENS_BEFORE - TOKENS_AFTER)) tokens ($REDUCTION% reduction)"
echo ""
echo "📄 Optimized context: $OPTIMIZED_FILE"
echo ""
echo "💡 Copy and paste the optimized context back into Claude Code if needed"

# Cleanup temp files (keep optimized for user to view)
rm -f "$CONTEXT_FILE"

echo ""
echo "🗑️  To delete optimized file: rm $OPTIMIZED_FILE"
```

Make executable:
```bash
chmod +x ~/bin/claude-sparn.sh
```

Usage:
```bash
# Optimize last 100 messages (default)
~/bin/claude-sparn.sh

# Optimize last 200 messages
~/bin/claude-sparn.sh 200
```

---

## 🎨 Advanced: Create a Claude Code Skill (5 minutes)

### Step 1: Create Skill Directory

```bash
mkdir -p ~/.claude/skills/sparn
cd ~/.claude/skills/sparn
```

### Step 2: Create `skill.json`

```bash
cat > skill.json << 'EOF'
{
  "name": "sparn",
  "version": "1.0.0",
  "description": "Optimize context using Sparn neuroscience-inspired algorithms",
  "commands": {
    "sparn.optimize": {
      "description": "Optimize current session context",
      "script": "./optimize.sh"
    },
    "sparn.stats": {
      "description": "Show Sparn optimization statistics",
      "script": "./stats.sh"
    }
  }
}
EOF
```

### Step 3: Create `optimize.sh`

```bash
cat > optimize.sh << 'EOF'
#!/usr/bin/env bash
set -e

echo "🧠 Optimizing current Claude Code session with Sparn..."

# Find latest session
LATEST_SESSION=$(find ~/.claude/projects -name '*.jsonl' -type f -exec ls -t {} + | head -1)

if [ -z "$LATEST_SESSION" ]; then
  echo "❌ No active session found"
  exit 1
fi

# Extract context
CONTEXT_FILE=$(mktemp)
OPTIMIZED_FILE=$(mktemp)

tail -100 "$LATEST_SESSION" | \
  jq -r 'select(.role == "user" or .role == "assistant") | .content | select(. != null)' > "$CONTEXT_FILE"

# Optimize
if ! sparn optimize -i "$CONTEXT_FILE" -o "$OPTIMIZED_FILE" 2>&1; then
  echo "❌ Sparn optimization failed"
  echo "💡 Make sure Sparn is installed: npm install -g @ulrichc1/sparn"
  exit 1
fi

# Show results
echo ""
echo "✅ Optimization complete!"
echo ""
cat "$OPTIMIZED_FILE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sparn stats --last 2>/dev/null || echo "Run 'sparn stats' to see full statistics"

# Cleanup
rm -f "$CONTEXT_FILE" "$OPTIMIZED_FILE"
EOF

chmod +x optimize.sh
```

### Step 4: Create `stats.sh`

```bash
cat > stats.sh << 'EOF'
#!/usr/bin/env bash
sparn stats
EOF

chmod +x stats.sh
```

### Step 5: Use in Claude Code

```bash
# Start Claude Code
claude-code

# Inside Claude Code CLI:
/sparn.optimize   # Optimize current session
/sparn.stats      # Show statistics
```

---

## ⚡ Super Fast: One-Liner

For immediate use without any setup:

```bash
# Optimize latest Claude Code session (copy-paste this)
LATEST=$(find ~/.claude/projects -name '*.jsonl' -type f -exec ls -t {} + | head -1) && tail -100 "$LATEST" | jq -r 'select(.role == "user" or .role == "assistant") | .content | select(. != null)' > /tmp/c.txt && sparn optimize -i /tmp/c.txt -o /tmp/o.txt && echo "✓ Optimized! View with: cat /tmp/o.txt" && sparn stats
```

---

## 📊 Workflow Example

```bash
# Terminal 1: Run Claude Code with skip permissions
claude-code --skip-permissions

# Terminal 2: Monitor and optimize in real-time
while true; do
  sleep 60  # Every 60 seconds
  ~/bin/claude-sparn.sh 100
done
```

---

## 🎯 What This Achieves

✅ **Real-time optimization** - While Claude Code is running
✅ **No code changes** - Uses existing Sparn CLI
✅ **Seamless workflow** - Run in separate terminal
✅ **Statistics tracking** - See token savings
✅ **Easy to use** - Simple bash scripts

---

## 🔮 Future: Full Integration

See `INTEGRATION-ROADMAP.md` for the complete vision:
- Background daemon mode
- Automatic threshold-based optimization
- Claude Code hook integration
- MCP server for native integration
- Zero-configuration auto-optimization

**For now, use the scripts above!** They work TODAY with v1.0.1.

---

**Quick Reference**

```bash
# One-time setup
npm install -g @ulrichc1/sparn
sparn init

# Manual optimization (while Claude Code is running)
sparn-claude  # If you created the alias

# Or use the script
~/bin/claude-sparn.sh 100

# View stats
sparn stats
```
