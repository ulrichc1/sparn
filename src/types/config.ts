/**
 * Configuration types for Sparn behavior customization.
 */

/**
 * Agent adapter type.
 */
export type AgentType = 'claude-code' | 'generic';

/**
 * Pruning configuration.
 */
export interface PruningConfig {
  /** Percentage of top-scored entries to keep (1-100, default: 5) */
  threshold: number;

  /** Aggressiveness scale 0-100 (affects TF-IDF weighting, default: 50) */
  aggressiveness: number;
}

/**
 * Decay configuration.
 */
export interface DecayConfig {
  /** Default TTL in hours (default: 24) */
  defaultTTL: number;

  /** Decay threshold for pruning (0.0-1.0, default: 0.95) */
  decayThreshold: number;
}

/**
 * Confidence state threshold configuration.
 */
export interface StatesConfig {
  /** Score threshold for active state (default: 0.7) */
  activeThreshold: number;

  /** Score threshold for ready state (default: 0.3) */
  readyThreshold: number;
}

/**
 * UI configuration.
 */
export interface UIConfig {
  /** Enable colored output (default: true) */
  colors: boolean;

  /** Enable sound effects (default: false) */
  sounds: boolean;

  /** Verbose logging (default: false) */
  verbose: boolean;
}

/**
 * Real-time optimization configuration.
 */
export interface RealtimeConfig {
  /** Target token budget for optimized context (default: 50000) */
  tokenBudget: number;

  /** Token threshold that triggers auto-optimization (default: 80000) */
  autoOptimizeThreshold: number;

  /** File patterns to watch for changes (default: ['**\/*.jsonl']) */
  watchPatterns: string[];

  /** Daemon PID file path (default: '.sparn/daemon.pid') */
  pidFile: string;

  /** Daemon log file path (default: '.sparn/daemon.log') */
  logFile: string;

  /** Debounce delay in milliseconds for file changes (default: 5000) */
  debounceMs: number;

  /** Enable incremental optimization (default: true) */
  incremental: boolean;

  /** Sliding window size for context entries (default: 500) */
  windowSize: number;
}

/**
 * Complete Sparn configuration.
 */
export interface SparnConfig {
  pruning: PruningConfig;
  decay: DecayConfig;
  states: StatesConfig;
  agent: AgentType;
  ui: UIConfig;
  /** Auto-consolidation interval in hours, or null for manual */
  autoConsolidate: number | null;
  /** Real-time optimization settings */
  realtime: RealtimeConfig;
}

/**
 * Default configuration values.
 */
export const DEFAULT_CONFIG: SparnConfig = {
  pruning: {
    threshold: 5,
    aggressiveness: 50,
  },
  decay: {
    defaultTTL: 24,
    decayThreshold: 0.95,
  },
  states: {
    activeThreshold: 0.7,
    readyThreshold: 0.3,
  },
  agent: 'generic',
  ui: {
    colors: true,
    sounds: false,
    verbose: false,
  },
  autoConsolidate: null,
  realtime: {
    tokenBudget: 50000,
    autoOptimizeThreshold: 80000,
    watchPatterns: ['**/*.jsonl'],
    pidFile: '.sparn/daemon.pid',
    logFile: '.sparn/daemon.log',
    debounceMs: 5000,
    incremental: true,
    windowSize: 500,
  },
};
