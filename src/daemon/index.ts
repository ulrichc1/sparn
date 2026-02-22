/**
 * Daemon Entry Point - Background process main loop
 *
 * This file is executed as a forked child process by daemon-process.ts.
 * It runs the session watcher and handles cleanup on exit.
 */

import { appendFileSync, existsSync, unlinkSync } from 'node:fs';
import { createKVMemory } from '../core/kv-memory.js';
import type { SparnConfig } from '../types/config.js';
import { createConsolidationScheduler } from './consolidation-scheduler.js';
import { createSessionWatcher } from './session-watcher.js';

// Parse config from environment
const configJson = process.env['SPARN_CONFIG'];
const pidFile = process.env['SPARN_PID_FILE'];
const logFile = process.env['SPARN_LOG_FILE'];

if (!configJson || !pidFile || !logFile) {
  console.error('Daemon: Missing required environment variables');
  process.exit(1);
}

const config: SparnConfig = JSON.parse(configJson);

// Log helper
function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  // logFile is guaranteed to be defined after env check
  if (logFile) {
    try {
      appendFileSync(logFile, logMessage, 'utf-8');
    } catch {
      // Fail silently if can't write log
    }
  }
}

// Cleanup on exit
function cleanup(): void {
  log('Daemon shutting down');

  // Remove PID file (pidFile is guaranteed to be defined after env check)
  if (pidFile && existsSync(pidFile)) {
    try {
      unlinkSync(pidFile);
    } catch {
      // Fail silently
    }
  }

  // Stop scheduler
  if (scheduler) {
    scheduler.stop();
  }

  // Stop watcher
  watcher.stop();

  // Close memory connection
  if (memory) {
    void memory.close();
  }

  process.exit(0);
}

// Signal handlers
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGHUP', cleanup);

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`);
  cleanup();
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${reason}`);
  cleanup();
});

// Create memory instance for consolidation scheduler
// Using a default path - could be made configurable in future
let memory: Awaited<ReturnType<typeof createKVMemory>> | null = null;
let scheduler: ReturnType<typeof createConsolidationScheduler> | null = null;

// Create and start session watcher
log('Daemon starting');

const watcher = createSessionWatcher({
  config,
  onOptimize: (sessionId, stats) => {
    log(
      `Optimized session ${sessionId}: ${stats.optimizedTokens} tokens (${Math.round(stats.reduction * 100)}% reduction)`,
    );
  },
  onError: (error) => {
    log(`Error: ${error.message}`);
  },
});

// Start watching
watcher
  .start()
  .then(async () => {
    log('Daemon ready - watching Claude Code sessions');

    // Initialize consolidation scheduler if enabled
    if (
      config.realtime.consolidationInterval !== null &&
      config.realtime.consolidationInterval > 0
    ) {
      try {
        // Create memory instance
        memory = await createKVMemory('.sparn/memory.db');

        // Create and start scheduler
        scheduler = createConsolidationScheduler({
          memory,
          config,
          logFile,
        });

        scheduler.start();
        log(
          `Consolidation scheduler started (interval: ${config.realtime.consolidationInterval}h)`,
        );
      } catch (error) {
        log(
          `Failed to start consolidation scheduler: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  })
  .catch((error) => {
    log(`Failed to start: ${error.message}`);
    cleanup();
  });

// Keep process alive
setInterval(() => {
  // Heartbeat (could be used for health checks)
}, 60000); // Every minute
