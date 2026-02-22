/**
 * Daemon Process Manager - Background process lifecycle management
 *
 * Handles:
 * - Process forking and detachment
 * - PID file management
 * - Signal handling (SIGTERM, SIGINT)
 * - Daemon start/stop/status commands
 */

import { fork } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getMetrics } from '../core/metrics.js';
import type { SparnConfig } from '../types/config.js';

export interface DaemonCommand {
  /** Start the daemon */
  start(config: SparnConfig): Promise<DaemonStartResult>;

  /** Stop the daemon */
  stop(config: SparnConfig): Promise<DaemonStopResult>;

  /** Get daemon status */
  status(config: SparnConfig): Promise<DaemonStatusResult>;
}

export interface DaemonStartResult {
  success: boolean;
  pid?: number;
  message: string;
  error?: string;
}

export interface DaemonStopResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface DaemonStatusResult {
  running: boolean;
  pid?: number;
  uptime?: number;
  sessionsWatched?: number;
  tokensSaved?: number;
  message: string;
}

/**
 * Create daemon command interface
 * @returns DaemonCommand instance
 */
export function createDaemonCommand(): DaemonCommand {
  /**
   * Check if daemon is running
   */
  function isDaemonRunning(pidFile: string): { running: boolean; pid?: number } {
    if (!existsSync(pidFile)) {
      return { running: false };
    }

    try {
      const pidStr = readFileSync(pidFile, 'utf-8').trim();
      const pid = Number.parseInt(pidStr, 10);

      if (Number.isNaN(pid)) {
        return { running: false };
      }

      // Check if process exists (cross-platform)
      try {
        process.kill(pid, 0); // Signal 0 checks existence without killing
        return { running: true, pid };
      } catch {
        // Process doesn't exist, clean up stale PID file
        unlinkSync(pidFile);
        return { running: false };
      }
    } catch {
      return { running: false };
    }
  }

  /**
   * Write PID file
   */
  function writePidFile(pidFile: string, pid: number): void {
    // Ensure directory exists
    const dir = dirname(pidFile);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(pidFile, String(pid), 'utf-8');
  }

  /**
   * Remove PID file
   */
  function removePidFile(pidFile: string): void {
    if (existsSync(pidFile)) {
      unlinkSync(pidFile);
    }
  }

  async function start(config: SparnConfig): Promise<DaemonStartResult> {
    const { pidFile, logFile } = config.realtime;

    // Check if already running
    const status = isDaemonRunning(pidFile);
    if (status.running) {
      return {
        success: false,
        pid: status.pid,
        message: `Daemon already running (PID ${status.pid})`,
        error: 'Already running',
      };
    }

    try {
      // Fork child process (daemon entry point)
      const daemonPath = join(__dirname, 'index.js');

      const child = fork(daemonPath, [], {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          SPARN_CONFIG: JSON.stringify(config),
          SPARN_PID_FILE: pidFile,
          SPARN_LOG_FILE: logFile,
        },
      });

      // Detach from parent
      child.unref();

      // Write PID file
      if (child.pid) {
        writePidFile(pidFile, child.pid);

        return {
          success: true,
          pid: child.pid,
          message: `Daemon started (PID ${child.pid})`,
        };
      }

      return {
        success: false,
        message: 'Failed to start daemon (no PID)',
        error: 'No PID',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to start daemon',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async function stop(config: SparnConfig): Promise<DaemonStopResult> {
    const { pidFile } = config.realtime;

    const status = isDaemonRunning(pidFile);

    if (!status.running || !status.pid) {
      return {
        success: true,
        message: 'Daemon not running',
      };
    }

    try {
      // Send SIGTERM
      process.kill(status.pid, 'SIGTERM');

      // Wait for process to exit (timeout after 5s)
      const maxWait = 5000;
      const interval = 100;
      let waited = 0;

      while (waited < maxWait) {
        try {
          process.kill(status.pid, 0);
          // Still running, wait
          await new Promise((resolve) => setTimeout(resolve, interval));
          waited += interval;
        } catch {
          // Process exited
          removePidFile(pidFile);
          return {
            success: true,
            message: `Daemon stopped (PID ${status.pid})`,
          };
        }
      }

      // Timeout, force kill
      try {
        process.kill(status.pid, 'SIGKILL');
        removePidFile(pidFile);
        return {
          success: true,
          message: `Daemon force killed (PID ${status.pid})`,
        };
      } catch {
        removePidFile(pidFile);
        return {
          success: true,
          message: `Daemon stopped (PID ${status.pid})`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to stop daemon',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async function status(config: SparnConfig): Promise<DaemonStatusResult> {
    const { pidFile } = config.realtime;

    const daemonStatus = isDaemonRunning(pidFile);

    if (!daemonStatus.running || !daemonStatus.pid) {
      return {
        running: false,
        message: 'Daemon not running',
      };
    }

    // Get metrics snapshot
    const metrics = getMetrics().getSnapshot();

    return {
      running: true,
      pid: daemonStatus.pid,
      uptime: metrics.daemon.uptime,
      sessionsWatched: metrics.daemon.sessionsWatched,
      tokensSaved: metrics.optimization.totalTokensSaved,
      message: `Daemon running (PID ${daemonStatus.pid})`,
    };
  }

  return {
    start,
    stop,
    status,
  };
}
