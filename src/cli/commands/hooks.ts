/**
 * Hooks Command - Install/uninstall/status for Claude Code hooks
 *
 * Manages hook integration with Claude Code's settings.json file.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface HooksCommandOptions {
  /** Subcommand: install, uninstall, or status */
  subcommand: 'install' | 'uninstall' | 'status';
  /** Install globally (for all projects) */
  global?: boolean;
}

export interface HooksCommandResult {
  success: boolean;
  message: string;
  error?: string;
  installed?: boolean;
  hookPaths?: {
    prePrompt: string;
    postToolResult: string;
  };
}

/**
 * Execute the hooks command
 * @param options - Command options
 * @returns Hooks result
 */
export async function hooksCommand(options: HooksCommandOptions): Promise<HooksCommandResult> {
  const { subcommand, global } = options;

  // Determine settings.json path
  const settingsPath = global
    ? join(homedir(), '.claude', 'settings.json')
    : join(process.cwd(), '.claude', 'settings.json');

  // Determine hook script paths (installed package location)
  // When bundled, this code runs from dist/cli/index.js
  // So hooks are at dist/hooks (one level up from cli, then into hooks)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const hooksDir = join(dirname(__dirname), 'hooks');
  const prePromptPath = join(hooksDir, 'pre-prompt.js');
  const postToolResultPath = join(hooksDir, 'post-tool-result.js');

  switch (subcommand) {
    case 'install':
      return await installHooks(settingsPath, prePromptPath, postToolResultPath, global);
    case 'uninstall':
      return await uninstallHooks(settingsPath, global);
    case 'status':
      return await hooksStatus(settingsPath, global);
    default:
      return {
        success: false,
        message: `Unknown subcommand: ${subcommand}`,
        error: 'Invalid subcommand',
      };
  }
}

/**
 * Install hooks into settings.json
 */
async function installHooks(
  settingsPath: string,
  prePromptPath: string,
  postToolResultPath: string,
  global?: boolean,
): Promise<HooksCommandResult> {
  try {
    // Verify hook files exist
    if (!existsSync(prePromptPath)) {
      return {
        success: false,
        message: `Hook script not found: ${prePromptPath}`,
        error: 'Hook scripts not built. Run `npm run build` first.',
      };
    }

    if (!existsSync(postToolResultPath)) {
      return {
        success: false,
        message: `Hook script not found: ${postToolResultPath}`,
        error: 'Hook scripts not built. Run `npm run build` first.',
      };
    }

    // Read or create settings.json
    let settings: Record<string, unknown> = {};

    if (existsSync(settingsPath)) {
      const settingsJson = readFileSync(settingsPath, 'utf-8');
      settings = JSON.parse(settingsJson);
    } else {
      // Create .claude directory if needed
      const claudeDir = dirname(settingsPath);
      if (!existsSync(claudeDir)) {
        mkdirSync(claudeDir, { recursive: true });
      }
    }

    // Add hooks to settings (Claude Code 2.1+ uses camelCase)
    settings['hooks'] = {
      ...(typeof settings['hooks'] === 'object' && settings['hooks'] !== null
        ? settings['hooks']
        : {}),
      prePrompt: `node ${prePromptPath}`,
      postToolResult: `node ${postToolResultPath}`,
    };

    // Write settings.json
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

    return {
      success: true,
      message: global
        ? 'Hooks installed globally (all projects)'
        : 'Hooks installed for current project',
      installed: true,
      hookPaths: {
        prePrompt: prePromptPath,
        postToolResult: postToolResultPath,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to install hooks',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Uninstall hooks from settings.json
 */
async function uninstallHooks(settingsPath: string, global?: boolean): Promise<HooksCommandResult> {
  try {
    if (!existsSync(settingsPath)) {
      return {
        success: true,
        message: 'No hooks installed (settings.json not found)',
        installed: false,
      };
    }

    // Read settings.json
    const settingsJson = readFileSync(settingsPath, 'utf-8');
    const settings: Record<string, unknown> = JSON.parse(settingsJson);

    // Remove hooks (Claude Code 2.1+ uses camelCase)
    if (settings['hooks'] && typeof settings['hooks'] === 'object' && settings['hooks'] !== null) {
      const hooks = settings['hooks'] as Record<string, unknown>;
      delete hooks['prePrompt'];
      delete hooks['postToolResult'];

      // Remove hooks object if empty
      if (Object.keys(hooks).length === 0) {
        delete settings['hooks'];
      }
    }

    // Write settings.json
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

    return {
      success: true,
      message: global ? 'Hooks uninstalled globally' : 'Hooks uninstalled from current project',
      installed: false,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to uninstall hooks',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check hooks installation status
 */
async function hooksStatus(settingsPath: string, global?: boolean): Promise<HooksCommandResult> {
  try {
    if (!existsSync(settingsPath)) {
      return {
        success: true,
        message: global
          ? 'No global hooks installed (settings.json not found)'
          : 'No project hooks installed (settings.json not found)',
        installed: false,
      };
    }

    // Read settings.json
    const settingsJson = readFileSync(settingsPath, 'utf-8');
    const settings: Record<string, unknown> = JSON.parse(settingsJson);

    // Check if hooks are installed (Claude Code 2.1+ uses camelCase)
    const hasHooks =
      settings['hooks'] &&
      typeof settings['hooks'] === 'object' &&
      settings['hooks'] !== null &&
      'prePrompt' in settings['hooks'] &&
      'postToolResult' in settings['hooks'];

    if (!hasHooks) {
      return {
        success: true,
        message: global ? 'No global hooks installed' : 'No project hooks installed',
        installed: false,
      };
    }

    const hooks = settings['hooks'] as Record<string, string>;

    return {
      success: true,
      message: global ? 'Global hooks active' : 'Project hooks active',
      installed: true,
      hookPaths: {
        prePrompt: hooks['prePrompt'] || '',
        postToolResult: hooks['postToolResult'] || '',
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to check hooks status',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
