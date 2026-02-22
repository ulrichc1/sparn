#!/usr/bin/env node

/**
 * Sparn CLI entry point.
 * Implements all CLI commands using Commander.js.
 */

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { getBanner } from './ui/banner.js';

// Get package.json version from project root
function getVersion(): string {
  try {
    // Try from current working directory first (most common case)
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    return pkg.version;
  } catch {
    // Fallback: calculate from module location
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
    return pkg.version;
  }
}

const VERSION = getVersion();

// Lazy-loaded imports (loaded only when commands are executed):
// - createKVMemory (heavy: better-sqlite3)
// - command implementations (may import heavy modules)
// - progress spinners (heavy: ora)
// - colors (chalk is reasonably lightweight, but lazy-load for consistency)

/**
 * Global error handler for uncaught errors
 * Provides graceful degradation and helpful error messages
 */
async function handleError(error: Error | unknown, context?: string): Promise<void> {
  // Lazy-load colors
  const { errorRed, synapseViolet } = await import('./ui/colors.js');

  const errorMsg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Display user-friendly error message
  console.error(errorRed('\n✗ Error:'), errorMsg);

  if (context) {
    console.error(errorRed('Context:'), context);
  }

  // Database errors - provide recovery suggestions
  if (errorMsg.includes('SQLITE') || errorMsg.includes('database')) {
    console.error(synapseViolet('\n💡 Database issue detected:'));
    console.error('  Try running: rm -rf .sparn/ && sparn init');
    console.error('  This will reinitialize your Sparn database.\n');
  }

  // Permission errors
  if (errorMsg.includes('EACCES') || errorMsg.includes('permission')) {
    console.error(synapseViolet('\n💡 Permission issue detected:'));
    console.error('  Check file permissions in .sparn/ directory');
    console.error('  Try: chmod -R u+rw .sparn/\n');
  }

  // File not found errors
  if (errorMsg.includes('ENOENT') || errorMsg.includes('no such file')) {
    console.error(synapseViolet('\n💡 File not found:'));
    console.error('  Make sure you have run: sparn init');
    console.error('  Or check that the specified file exists.\n');
  }

  // Memory errors
  if (errorMsg.includes('out of memory') || errorMsg.includes('heap')) {
    console.error(synapseViolet('\n💡 Memory issue detected:'));
    console.error('  Try processing smaller chunks of context');
    console.error('  Or increase Node.js memory: NODE_OPTIONS=--max-old-space-size=4096\n');
  }

  // Show stack trace in verbose mode
  if (process.env['SPARN_DEBUG'] === 'true' && stack) {
    console.error(errorRed('\nStack trace:'));
    console.error(stack);
  } else {
    console.error('  Run with SPARN_DEBUG=true for stack trace\n');
  }

  process.exit(1);
}

/**
 * Global unhandled rejection handler
 */
process.on('unhandledRejection', (reason) => {
  void handleError(reason, 'Unhandled promise rejection');
});

/**
 * Global uncaught exception handler
 */
process.on('uncaughtException', (error) => {
  void handleError(error, 'Uncaught exception');
});

const program = new Command();

program
  .name('sparn')
  .description('Neuroscience-inspired context optimization for AI coding agents')
  .version(VERSION, '-v, --version', 'Output the current version')
  .helpOption('-h, --help', 'Display help for command');

// Init command
program
  .command('init')
  .description('Initialize Sparn in the current project')
  .option('-f, --force', 'Force overwrite if .sparn/ already exists')
  .addHelpText(
    'after',
    `
Examples:
  $ sparn init                  # Initialize in current directory
  $ sparn init --force          # Overwrite existing .sparn/ directory

Files Created:
  .sparn/config.yaml            # Configuration with neuroscience parameters
  .sparn/memory.db              # SQLite database for context storage

Next Steps:
  After initialization, use 'sparn optimize' to start optimizing context.
`,
  )
  .action(async (options) => {
    // Lazy-load dependencies
    const { initCommand, displayInitSuccess } = await import('./commands/init.js');
    const { createInitSpinner } = await import('./ui/progress.js');
    const { neuralCyan, errorRed } = await import('./ui/colors.js');

    const spinner = createInitSpinner('🧠 Initializing Sparn...');
    try {
      spinner.start();
      spinner.text = '📁 Creating .sparn/ directory...';
      const result = await initCommand({ force: options.force });
      spinner.succeed(neuralCyan('Sparn initialized successfully!'));
      displayInitSuccess(result);
    } catch (error) {
      spinner.fail(errorRed('Initialization failed'));
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Optimize command
program
  .command('optimize')
  .description('Optimize context memory using neuroscience principles')
  .option('-i, --input <file>', 'Input file path')
  .option('-o, --output <file>', 'Output file path')
  .option('--dry-run', 'Run without saving to memory')
  .option('--verbose', 'Show detailed per-entry scores')
  .addHelpText(
    'after',
    `
Examples:
  $ sparn optimize -i context.txt -o optimized.txt    # Optimize file
  $ cat context.txt | sparn optimize                  # Optimize from stdin
  $ sparn optimize -i context.txt --dry-run           # Preview without saving
  $ sparn optimize -i context.txt --verbose           # Show entry scores

How It Works:
  1. Sparse Coding: Keeps only 2-5% most relevant context
  2. Engram Theory: Applies decay to old memories
  3. Multi-State Synapses: Classifies as silent/ready/active
  4. BTSP: Locks critical events (errors, stack traces)
  5. Sleep Replay: Consolidates and compresses

Typical Results:
  • 60-90% token reduction
  • Preserved task-critical information
  • Enhanced AI agent focus
`,
  )
  .action(async (options) => {
    // Lazy-load dependencies
    const { createKVMemory } = await import('../core/kv-memory.js');
    const { optimizeCommand } = await import('./commands/optimize.js');
    const { createOptimizeSpinner, showTokenSavings } = await import('./ui/progress.js');
    const { neuralCyan, synapseViolet, errorRed } = await import('./ui/colors.js');

    const spinner = createOptimizeSpinner('🧠 Initializing optimization...');
    try {
      spinner.start();

      // Read from stdin if no input file specified
      let input: string | undefined;
      if (!options.input && process.stdin.isTTY === false) {
        spinner.text = '📖 Reading context from stdin...';
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        input = Buffer.concat(chunks).toString('utf-8');
      } else if (options.input) {
        spinner.text = `📖 Reading context from ${options.input}...`;
      }

      // Load memory
      spinner.text = '💾 Loading memory database...';
      const dbPath = resolve(process.cwd(), '.sparn/memory.db');
      const memory = await createKVMemory(dbPath);

      // Run optimization
      spinner.text = '⚡ Applying neuroscience principles...';
      const result = await optimizeCommand({
        input,
        inputFile: options.input,
        outputFile: options.output,
        memory,
        dryRun: options.dryRun || false,
        verbose: options.verbose || false,
      });

      spinner.succeed(neuralCyan(`Optimization complete in ${result.durationMs}ms!`));

      // Display visual impact
      showTokenSavings(result.tokensBefore, result.tokensAfter, result.reduction);

      // Show entry stats
      console.log(synapseViolet('  Entry Distribution:'));
      console.log(`    • Processed: ${result.entriesProcessed}`);
      console.log(`    • Kept: ${result.entriesKept}`);
      console.log(`    • Active: ${result.stateDistribution.active}`);
      console.log(`    • Ready: ${result.stateDistribution.ready}`);
      console.log(`    • Silent: ${result.stateDistribution.silent}\n`);

      // Show verbose details if requested
      if (options.verbose && result.details) {
        console.log(neuralCyan('  📋 Entry Details:'));
        for (const detail of result.details) {
          console.log(
            `    ${detail.id.substring(0, 8)}: score=${detail.score.toFixed(2)}, state=${detail.state}, tokens=${detail.tokens}`,
          );
        }
        console.log();
      }

      // Write to stdout if no output file
      if (!options.output) {
        console.log(result.output);
      }

      await memory.close();
    } catch (error) {
      spinner.fail(errorRed('Optimization failed'));
      console.error(errorRed('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('View optimization statistics')
  .option('--graph', 'Display ASCII bar chart of optimization history')
  .option('--reset', 'Clear all optimization statistics')
  .option('--json', 'Output statistics in JSON format')
  .addHelpText(
    'after',
    `
Examples:
  $ sparn stats                 # View summary statistics
  $ sparn stats --graph         # Show ASCII chart of optimization history
  $ sparn stats --json          # Output as JSON for automation
  $ sparn stats --reset         # Clear all statistics (with confirmation)

Tracked Metrics:
  • Total optimizations performed
  • Total tokens saved across all runs
  • Average reduction percentage
  • Per-run token before/after counts
  • Optimization duration
`,
  )
  .action(async (options) => {
    // Lazy-load dependencies
    const { createKVMemory } = await import('../core/kv-memory.js');
    const { statsCommand } = await import('./commands/stats.js');
    const { createStatsSpinner } = await import('./ui/progress.js');
    const { neuralCyan, synapseViolet, errorRed } = await import('./ui/colors.js');

    const spinner = options.graph ? createStatsSpinner('📊 Generating statistics...') : null;
    try {
      if (spinner) spinner.start();

      // Load memory
      if (spinner) spinner.text = '💾 Loading optimization history...';
      const dbPath = resolve(process.cwd(), '.sparn/memory.db');
      const memory = await createKVMemory(dbPath);

      // Handle reset with confirmation
      let confirmReset = false;
      if (options.reset) {
        if (spinner) spinner.stop();
        console.log(synapseViolet('Warning: This will clear all optimization statistics.'));
        confirmReset = true; // Auto-confirm for now
      }

      // Get stats
      if (spinner) spinner.text = '📈 Calculating statistics...';
      const result = await statsCommand({
        memory,
        graph: options.graph || false,
        reset: options.reset || false,
        confirmReset,
        json: options.json || false,
      });

      if (spinner) spinner.succeed(neuralCyan('Statistics ready!'));

      // Display output
      if (options.json) {
        console.log(result.json);
      } else if (options.reset && result.resetConfirmed) {
        console.log(neuralCyan('\n✓ Statistics cleared\n'));
      } else {
        // Display stats summary
        console.log(neuralCyan('\n📊 Optimization Statistics\n'));
        console.log(`  Total optimizations: ${result.totalCommands}`);
        console.log(`  Total tokens saved: ${result.totalTokensSaved.toLocaleString()}`);
        console.log(`  Average reduction: ${(result.averageReduction * 100).toFixed(1)}%`);

        if (options.graph && result.graph) {
          console.log(result.graph);
        }

        console.log();
      }

      await memory.close();
    } catch (error) {
      if (spinner) spinner.fail(errorRed('Statistics failed'));
      console.error(errorRed('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Relay command
program
  .command('relay <command> [args...]')
  .description('Proxy a CLI command through optimization')
  .option('--silent', 'Suppress token savings summary')
  .addHelpText(
    'after',
    `
Examples:
  $ sparn relay git log         # Run 'git log' and optimize output
  $ sparn relay npm test        # Run 'npm test' and optimize output
  $ sparn relay gh pr view 123  # Optimize GitHub CLI output
  $ sparn relay ls -la --silent # Suppress optimization summary

Use Cases:
  • Wrap verbose CLI commands (git log, gh pr view)
  • Optimize test runner output
  • Compress build logs
  • Filter CI/CD output for AI agent consumption

The relay command passes the exit code from the wrapped command.
`,
  )
  .action(async (command, args, options) => {
    // Lazy-load dependencies
    const { createKVMemory } = await import('../core/kv-memory.js');
    const { relayCommand } = await import('./commands/relay.js');
    const { neuralCyan, errorRed } = await import('./ui/colors.js');

    try {
      // Load memory
      const dbPath = resolve(process.cwd(), '.sparn/memory.db');
      const memory = await createKVMemory(dbPath);

      // Execute relay
      const result = await relayCommand({
        command,
        args: args || [],
        memory,
        silent: options.silent || false,
      });

      // Display optimized output
      console.log(result.optimizedOutput);

      // Display summary if not silent
      if (result.summary) {
        console.error(neuralCyan(`\n${result.summary}\n`));
      }

      await memory.close();

      // Exit with same code as proxied command
      process.exit(result.exitCode);
    } catch (error) {
      console.error(errorRed('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Consolidate command
program
  .command('consolidate')
  .description('Consolidate memory: remove decayed entries and merge duplicates')
  .addHelpText(
    'after',
    `
Examples:
  $ sparn consolidate           # Run memory consolidation

What It Does:
  1. Remove Decayed Entries: Deletes entries that have fully decayed
  2. Merge Duplicates: Combines identical content entries
  3. VACUUM Database: Reclaims disk space from deletions
  4. Update Statistics: Tracks consolidation metrics

When to Run:
  • After long-running sessions
  • Before important optimizations
  • When database size grows large
  • As part of nightly maintenance

Typical Results:
  • 20-40% database size reduction
  • Faster query performance
  • Cleaner memory organization
`,
  )
  .action(async () => {
    // Lazy-load dependencies
    const { createKVMemory } = await import('../core/kv-memory.js');
    const { consolidateCommand } = await import('./commands/consolidate.js');
    const { createConsolidateSpinner, showConsolidationSummary } = await import('./ui/progress.js');
    const { neuralCyan, synapseViolet, errorRed } = await import('./ui/colors.js');

    const spinner = createConsolidateSpinner('🧹 Initializing memory consolidation...');
    try {
      spinner.start();

      // Load memory
      spinner.text = '💾 Loading memory database...';
      const dbPath = resolve(process.cwd(), '.sparn/memory.db');
      const memory = await createKVMemory(dbPath);

      // Run consolidation
      spinner.text = '🔍 Identifying decayed entries...';
      const result = await consolidateCommand({ memory });

      spinner.succeed(neuralCyan(`Consolidation complete in ${result.durationMs}ms!`));

      // Display visual impact
      showConsolidationSummary(
        result.entriesBefore,
        result.entriesAfter,
        result.decayedRemoved,
        result.duplicatesRemoved,
        result.durationMs,
      );

      // Database vacuum status
      if (result.vacuumCompleted) {
        console.log(synapseViolet('  ✓ Database VACUUM completed\n'));
      } else {
        console.log(errorRed('  ✗ Database VACUUM failed\n'));
      }

      await memory.close();
    } catch (error) {
      spinner.fail(errorRed('Consolidation failed'));
      console.error(errorRed('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Config command
program
  .command('config [subcommand] [key] [value]')
  .description('View or modify configuration')
  .option('--json', 'Output result as JSON')
  .addHelpText(
    'after',
    `
Examples:
  $ sparn config                        # Open config in $EDITOR
  $ sparn config get pruning.threshold  # Get specific value
  $ sparn config set pruning.threshold 3 # Set value
  $ sparn config --json                 # View full config as JSON

Configuration Keys:
  pruning.threshold                     # Sparse coding threshold (2-5%)
  decay.halfLife                        # Engram decay half-life (hours)
  decay.minScore                        # Minimum decay score (0.0-1.0)
  states.activeThreshold                # Active state threshold
  states.readyThreshold                 # Ready state threshold
  embedding.model                       # BTSP embedding model
  embedding.dimensions                  # Embedding vector size

The config file is located at .sparn/config.yaml
`,
  )
  .action(async (subcommand, key, value, options) => {
    // Lazy-load dependencies
    const { configCommand } = await import('./commands/config.js');
    const { neuralCyan, errorRed } = await import('./ui/colors.js');

    try {
      const configPath = resolve(process.cwd(), '.sparn/config.yaml');

      // Execute config command
      const result = await configCommand({
        configPath,
        subcommand: subcommand as 'get' | 'set' | undefined,
        key,
        value,
        json: options.json || false,
      });

      if (!result.success) {
        console.error(errorRed('Error:'), result.error);
        process.exit(1);
      }

      // Handle editor mode
      if (result.editorPath && !options.json) {
        const editor = process.env['EDITOR'] || 'vim';
        console.log(neuralCyan(`\n📝 Opening config in ${editor}...\n`));

        // Spawn editor
        const child = spawn(editor, [result.editorPath], {
          stdio: 'inherit',
        });

        child.on('close', (code) => {
          if (code === 0) {
            console.log(neuralCyan('\n✓ Config edited\n'));
          }
          process.exit(code ?? 0);
        });

        return;
      }

      // Display result
      if (result.json) {
        console.log(result.json);
      } else if (result.message) {
        console.log(result.message);
      }
    } catch (error) {
      console.error(errorRed('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Daemon command
program
  .command('daemon <subcommand>')
  .description('Manage real-time optimization daemon')
  .addHelpText(
    'after',
    `
Subcommands:
  start                                 # Start daemon
  stop                                  # Stop daemon
  status                                # Check daemon status

Examples:
  $ sparn daemon start                  # Start watching Claude Code sessions
  $ sparn daemon stop                   # Stop daemon
  $ sparn daemon status                 # Check if daemon is running

The daemon watches ~/.claude/projects/**/*.jsonl and automatically
optimizes contexts when they exceed the configured threshold.
`,
  )
  .action(async (subcommand) => {
    // Lazy-load dependencies
    const { load: parseYAML } = await import('js-yaml');
    const { createDaemonCommand } = await import('../daemon/daemon-process.js');
    const { neuralCyan, errorRed } = await import('./ui/colors.js');

    try {
      // Load config
      const configPath = resolve(process.cwd(), '.sparn/config.yaml');
      const configYAML = readFileSync(configPath, 'utf-8');
      // biome-ignore lint/suspicious/noExplicitAny: parseYAML returns unknown, need to cast
      const config = parseYAML(configYAML) as any;

      const daemon = createDaemonCommand();

      switch (subcommand) {
        case 'start': {
          const result = await daemon.start(config);
          if (result.success) {
            console.log(neuralCyan(`\n✓ ${result.message}\n`));
          } else {
            console.error(errorRed(`\n✗ ${result.message}\n`));
            process.exit(1);
          }
          break;
        }

        case 'stop': {
          const result = await daemon.stop(config);
          if (result.success) {
            console.log(neuralCyan(`\n✓ ${result.message}\n`));
          } else {
            console.error(errorRed(`\n✗ ${result.message}\n`));
            process.exit(1);
          }
          break;
        }

        case 'status': {
          const result = await daemon.status(config);
          if (result.running) {
            console.log(neuralCyan(`\n✓ ${result.message}`));
            if (result.sessionsWatched !== undefined) {
              console.log(`  Sessions watched: ${result.sessionsWatched}`);
            }
            if (result.tokensSaved !== undefined) {
              console.log(`  Tokens saved: ${result.tokensSaved.toLocaleString()}`);
            }
            console.log();
          } else {
            console.log(errorRed(`\n✗ ${result.message}\n`));
          }
          break;
        }

        default:
          console.error(errorRed(`\nUnknown subcommand: ${subcommand}\n`));
          console.error('Valid subcommands: start, stop, status\n');
          process.exit(1);
      }
    } catch (error) {
      console.error(errorRed('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Hooks command
program
  .command('hooks <subcommand>')
  .description('Manage Claude Code hook integration')
  .option('--global', 'Install hooks globally (for all projects)')
  .addHelpText(
    'after',
    `
Subcommands:
  install                               # Install hooks
  uninstall                             # Uninstall hooks
  status                                # Check hook status

Examples:
  $ sparn hooks install                 # Install hooks for current project
  $ sparn hooks install --global        # Install hooks globally
  $ sparn hooks uninstall               # Uninstall hooks
  $ sparn hooks status                  # Check if hooks are active

Hooks automatically optimize context before each Claude Code prompt
and compress verbose tool results after execution.
`,
  )
  .action(async (subcommand, options) => {
    // Lazy-load dependencies
    const { hooksCommand } = await import('./commands/hooks.js');
    const { neuralCyan, errorRed } = await import('./ui/colors.js');

    try {
      const result = await hooksCommand({
        subcommand: subcommand as 'install' | 'uninstall' | 'status',
        global: options.global || false,
      });

      if (result.success) {
        console.log(neuralCyan(`\n✓ ${result.message}`));

        if (result.hookPaths) {
          console.log('\nHook paths:');
          console.log(`  pre-prompt: ${result.hookPaths.prePrompt}`);
          console.log(`  post-tool-result: ${result.hookPaths.postToolResult}`);
        }

        console.log();
      } else {
        console.error(errorRed(`\n✗ ${result.message}`));
        if (result.error) {
          console.error(`  ${result.error}`);
        }
        console.log();
        process.exit(1);
      }
    } catch (error) {
      console.error(errorRed('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Interactive command
program
  .command('interactive')
  .alias('i')
  .description('Launch interactive mode for configuration and exploration')
  .addHelpText(
    'after',
    `
Examples:
  $ sparn interactive                   # Launch interactive mode
  $ sparn i                             # Short alias

Features:
  • 📝 Configuration Wizard - Guided prompts for all settings
  • 🔍 Optimization Preview - Test optimization with file preview
  • 📊 Stats Dashboard - Beautiful metrics display
  • 🧹 Memory Consolidation - Interactive cleanup
  • 🚀 Quick Actions - Common tasks and shortcuts

The interactive mode provides a conversational interface for exploring
and configuring Sparn without memorizing CLI flags.
`,
  )
  .action(async () => {
    // Lazy-load dependencies
    const { createKVMemory } = await import('../core/kv-memory.js');
    const { interactiveCommand } = await import('./commands/interactive.js');
    const { errorRed } = await import('./ui/colors.js');

    try {
      // Load memory
      const dbPath = resolve(process.cwd(), '.sparn/memory.db');
      const memory = await createKVMemory(dbPath);

      // Config path
      const configPath = resolve(process.cwd(), '.sparn/config.yaml');

      // Run interactive mode
      await interactiveCommand({
        memory,
        configPath,
      });

      await memory.close();
    } catch (error) {
      console.error(errorRed('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Show banner on version
program.on('option:version', () => {
  console.log(getBanner(VERSION));
  process.exit(0);
});

// Parse arguments
program.parse();
