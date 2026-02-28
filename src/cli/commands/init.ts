/**
 * Init command implementation.
 * Creates .cortex/ directory with config and database.
 */

import { readFileSync } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dump as dumpYAML } from 'js-yaml';
import { createKVMemory } from '../../core/kv-memory.js';
import { DEFAULT_CONFIG } from '../../types/config.js';
import { getBanner } from '../ui/banner.js';
import { brainPink, dim, neuralCyan } from '../ui/colors.js';

// Get cortex's own version from its package.json
function getVersion(): string {
  try {
    // Read from cortex's own package.json (relative to compiled module)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
    return pkg.version;
  } catch {
    return '1.0.0';
  }
}

const VERSION = getVersion();

/**
 * Options for init command.
 */
export interface InitOptions {
  /** Force overwrite if .cortex/ exists */
  force?: boolean;
  /** Current working directory */
  cwd?: string;
}

/**
 * Result of init operation.
 */
export interface InitResult {
  /** Path to created config file */
  configPath: string;

  /** Path to created database */
  dbPath: string;

  /** Initialization duration (ms) */
  durationMs: number;
}

/**
 * Execute init command.
 *
 * Creates .cortex/ directory with:
 * - config.yaml (default configuration)
 * - memory.db (SQLite database)
 *
 * @param options - Init options
 * @returns Init result
 */
export async function initCommand(options: InitOptions = {}): Promise<InitResult> {
  const startTime = Date.now();
  const cwd = options.cwd || process.cwd();
  const cortexDir = join(cwd, '.cortex');
  const configPath = join(cortexDir, 'config.yaml');
  const dbPath = join(cortexDir, 'memory.db');

  // Check if .cortex/ already exists
  const exists = await checkExists(cortexDir);

  if (exists && !options.force) {
    throw new Error(
      '.cortex/ directory already exists. Use --force to overwrite or run from a different directory.',
    );
  }

  // Create .cortex/ directory
  await mkdir(cortexDir, { recursive: true });

  // Create config.yaml with defaults
  const configYAML = dumpYAML(DEFAULT_CONFIG, {
    indent: 2,
    lineWidth: 100,
  });

  const configWithComments = `# Cortex Configuration
# See https://github.com/sparn-labs/cortex for documentation

${configYAML}`;

  await writeFile(configPath, configWithComments, 'utf8');

  // Initialize database
  const memory = await createKVMemory(dbPath);
  await memory.close();

  const durationMs = Date.now() - startTime;

  return {
    configPath,
    dbPath,
    durationMs,
  };
}

/**
 * Display init success message with banner.
 *
 * @param result - Init result
 */
export function displayInitSuccess(result: InitResult): void {
  console.log(getBanner(VERSION));

  console.log(`\n${brainPink('━'.repeat(60))}`);
  console.log(brainPink('  🧠 Cortex Initialized Successfully!'));
  console.log(brainPink('━'.repeat(60)));

  console.log(`\n  ${neuralCyan('Config:')}   ${dim(result.configPath)}`);
  console.log(`  ${neuralCyan('Database:')} ${dim(result.dbPath)}`);
  console.log(`  ${neuralCyan('Time:')}     ${dim(`${result.durationMs}ms`)}`);

  console.log(
    `\n  ${brainPink('→')} Run ${neuralCyan("'cortex optimize'")} to start optimizing context!`,
  );
  console.log(`${brainPink('━'.repeat(60))}\n`);
}

/**
 * Check if path exists.
 */
async function checkExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
