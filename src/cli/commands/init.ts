/**
 * Init command implementation.
 * Creates .sparn/ directory with config and database.
 */

import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dump as dumpYAML } from 'js-yaml';
import { createKVMemory } from '../../core/kv-memory.js';
import { DEFAULT_CONFIG } from '../../types/config.js';
import { getBanner } from '../ui/banner.js';
import { brainPink, dim, neuralCyan } from '../ui/colors.js';

/**
 * Options for init command.
 */
export interface InitOptions {
  /** Force overwrite if .sparn/ exists */
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
 * Creates .sparn/ directory with:
 * - config.yaml (default configuration)
 * - memory.db (SQLite database)
 *
 * @param options - Init options
 * @returns Init result
 */
export async function initCommand(options: InitOptions = {}): Promise<InitResult> {
  const startTime = Date.now();
  const cwd = options.cwd || process.cwd();
  const sparnDir = join(cwd, '.sparn');
  const configPath = join(sparnDir, 'config.yaml');
  const dbPath = join(sparnDir, 'memory.db');

  // Check if .sparn/ already exists
  const exists = await checkExists(sparnDir);

  if (exists && !options.force) {
    throw new Error(
      '.sparn/ directory already exists. Use --force to overwrite or run from a different directory.',
    );
  }

  // Create .sparn/ directory
  await mkdir(sparnDir, { recursive: true });

  // Create config.yaml with defaults
  const configYAML = dumpYAML(DEFAULT_CONFIG, {
    indent: 2,
    lineWidth: 100,
  });

  const configWithComments = `# Sparn Configuration
# See https://github.com/ulrichc1/sparn for documentation

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
  console.log(getBanner('0.1.0'));

  console.log(`\n${brainPink('━'.repeat(60))}`);
  console.log(brainPink('  🧠 Sparn Initialized Successfully!'));
  console.log(brainPink('━'.repeat(60)));

  console.log(`\n  ${neuralCyan('Config:')}   ${dim(result.configPath)}`);
  console.log(`  ${neuralCyan('Database:')} ${dim(result.dbPath)}`);
  console.log(`  ${neuralCyan('Time:')}     ${dim(`${result.durationMs}ms`)}`);

  console.log(
    `\n  ${brainPink('→')} Run ${neuralCyan("'sparn optimize'")} to start optimizing context!`,
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
