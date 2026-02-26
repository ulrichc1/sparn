/**
 * Init command implementation.
 * Creates .sparn/ directory with config and database.
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

// Get sparn's own version from its package.json
function getVersion(): string {
  try {
    // Read from sparn's own package.json (relative to compiled module)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
    return pkg.version;
  } catch {
    return '1.4.0';
  }
}

const VERSION = getVersion();

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
  console.log(getBanner(VERSION));

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
