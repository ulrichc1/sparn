# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-22

### 🚀 Major Features Added

#### Real-Time Optimization System
- **Background Daemon**: Automatically monitors Claude Code sessions and optimizes when needed
  - `sparn daemon start/stop/status` commands
  - Watches `~/.claude/projects/**/*.jsonl` files
  - Auto-optimizes when token count exceeds 80K
  - Maintains 50K token budget for Opus model

- **Claude Code Hooks**: Seamless integration with Claude Code
  - `sparn hooks install/uninstall/status` commands
  - Pre-prompt hook: Optimizes context before each Claude response
  - Post-tool-result hook: Compresses verbose tool outputs
  - Error-safe: Always exits 0, never disrupts Claude Code

#### Advanced Optimization Engine
- **Budget-Aware Pruner**: Targets specific token counts instead of percentages
  - TF-IDF relevance scoring
  - Engram decay integration
  - State multipliers (Active 2x, Ready 1x, Silent 0.5x)
  - BTSP entries bypass budget constraints

- **Incremental Optimizer**: Lightning-fast delta processing
  - Content hash-based caching
  - <50ms incremental updates
  - Document frequency table pre-computation
  - State serialization for daemon persistence

- **Streaming Context Pipeline**: Real-time sliding window buffer
  - Priority-based eviction
  - Chronological output ordering
  - Configurable window size (default: 500 entries)
  - Metadata support for custom tagging

### ✨ Enhancements

#### Tool Output Compression
Enhanced post-tool-result hook with specialized strategies for:
- **npm/pnpm install**: Extracts package counts, warnings, errors
- **Docker logs**: Deduplicates repeated log lines
- **Test results**: Summarizes pass/fail/skip counts
- **TypeScript errors**: Groups errors by file and error code
- **Git diffs**: File-level change summaries
- **Build output**: Extracts errors and warnings only

Typical compression: 70-90% token reduction

#### Configuration Extensions
New realtime configuration options:
- `realtime.tokenBudget` (default: 50000) - Target token budget
- `realtime.autoOptimizeThreshold` (default: 80000) - Auto-optimization trigger
- `realtime.watchPatterns` (default: `['**/*.jsonl']`) - File patterns to watch
- `realtime.pidFile` (default: `.sparn/daemon.pid`) - Daemon PID file location
- `realtime.logFile` (default: `.sparn/daemon.log`) - Daemon log file location
- `realtime.debounceMs` (default: 5000) - Debounce delay for file changes
- `realtime.incremental` (default: true) - Enable incremental optimization
- `realtime.windowSize` (default: 500) - Sliding window entry limit

#### Metrics and Telemetry
- New metrics collection system
- Tracks optimization duration, token savings, cache hit rates
- P50/P95/P99 latency percentiles
- Memory usage monitoring
- JSON export capability

### 📊 Performance

Validated performance targets:
- Incremental optimization: <50ms (target met)
- Full optimization: <500ms for 10K entries
- Budget pruning: <100ms for 1K entries
- Context pipeline ingestion: <10ms

### 🧪 Testing

- **176 passing tests** (up from 96)
- New test suites:
  - `context-parser.test.ts` - Context parsing utilities
  - `budget-pruner.test.ts` - Budget-aware pruning
  - `incremental-optimizer.test.ts` - Incremental optimization
  - `context-pipeline.test.ts` - Streaming pipeline
  - `file-tracker.test.ts` - Incremental file reading
  - `realtime-config.test.ts` - Configuration validation
  - `daemon.test.ts` - Daemon lifecycle integration tests
- Performance benchmarking suite added

### 📚 Documentation

- Updated `CLAUDE-CODE-SKILL.md` with real-time features
- Added technical architecture section
- Documented all new CLI commands
- Performance benchmarks documented

### 🛠️ Technical Improvements

- Extracted context parser utilities for reuse
- Added file tracker for incremental JSONL reading
- Session watcher with fs.watch integration
- Daemon process management with PID files
- Hook entry points with error-safe design
- Build configuration updated for new entry points

### 🔧 Code Quality

- All lint checks pass (Biome)
- TypeScript strict mode compliance
- No unsafe type assertions
- Import organization automated
- Consistent code formatting

## [1.0.1] - 2026-01-15

### Fixed
- Corrected package.json path in bundled init command

## [1.0.0] - 2026-01-14

### Added
- Initial release with core neuroscience-inspired optimization
- Sparse coding (keep top 2-5%)
- Engram theory (exponential decay)
- Multi-state synapses (active/ready/silent)
- BTSP embedding (one-shot learning)
- Sleep replay compression
- Claude Code adapter
- CLI commands: init, optimize, stats, consolidate, relay, config
- SQLite-based KV memory store
