/**
 * Hooks Command - Install/uninstall/status for Claude Code hooks
 *
 * Manages hook integration with Claude Code's settings.json file.
 * Uses the correct Claude Code hook format:
 *   hooks.EventName = [{ matcher?, hooks: [{ type, command, timeout? }] }]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface HooksCommandOptions {
  subcommand: 'install' | 'uninstall' | 'status';
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
    stopDocsRefresh: string;
  };
}

// Claude Code hook event names
const PRE_PROMPT_EVENT = 'UserPromptSubmit';
const POST_TOOL_EVENT = 'PostToolUse';
const STOP_DOCS_EVENT = 'Stop';

// Matcher for which tools trigger the post-tool hook
const POST_TOOL_MATCHER = 'Bash|Read|Grep|Glob';

// Marker to identify sparn-managed hooks
const SPARN_MARKER = 'sparn';

interface HookHandler {
  type: string;
  command: string;
  timeout?: number;
}

interface HookMatcherGroup {
  matcher?: string;
  hooks: HookHandler[];
}

type HooksConfig = Record<string, HookMatcherGroup[]>;

export async function hooksCommand(options: HooksCommandOptions): Promise<HooksCommandResult> {
  const { subcommand, global } = options;

  const settingsPath = global
    ? join(homedir(), '.claude', 'settings.json')
    : join(process.cwd(), '.claude', 'settings.json');

  // Find built hook scripts relative to this file
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const hooksDir = join(dirname(__dirname), 'hooks');
  const prePromptPath = join(hooksDir, 'pre-prompt.js');
  const postToolResultPath = join(hooksDir, 'post-tool-result.js');
  const stopDocsRefreshPath = join(hooksDir, 'stop-docs-refresh.js');

  switch (subcommand) {
    case 'install':
      return installHooks(
        settingsPath,
        prePromptPath,
        postToolResultPath,
        stopDocsRefreshPath,
        global,
      );
    case 'uninstall':
      return uninstallHooks(settingsPath, global);
    case 'status':
      return hooksStatus(settingsPath, global);
    default:
      return {
        success: false,
        message: `Unknown subcommand: ${subcommand}`,
        error: 'Invalid subcommand',
      };
  }
}

function installHooks(
  settingsPath: string,
  prePromptPath: string,
  postToolResultPath: string,
  stopDocsRefreshPath: string,
  global?: boolean,
): HooksCommandResult {
  try {
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

    if (!existsSync(stopDocsRefreshPath)) {
      return {
        success: false,
        message: `Hook script not found: ${stopDocsRefreshPath}`,
        error: 'Hook scripts not built. Run `npm run build` first.',
      };
    }

    let settings: Record<string, unknown> = {};

    if (existsSync(settingsPath)) {
      const settingsJson = readFileSync(settingsPath, 'utf-8');
      settings = JSON.parse(settingsJson);
    } else {
      const claudeDir = dirname(settingsPath);
      if (!existsSync(claudeDir)) {
        mkdirSync(claudeDir, { recursive: true });
      }
    }

    // Get existing hooks or create empty object
    const hooks: HooksConfig =
      typeof settings['hooks'] === 'object' && settings['hooks'] !== null
        ? (settings['hooks'] as HooksConfig)
        : {};

    // Remove any existing sparn hooks first (clean install)
    removeSparnHooks(hooks);

    // Add UserPromptSubmit hook (pre-prompt optimization)
    if (!hooks[PRE_PROMPT_EVENT]) {
      hooks[PRE_PROMPT_EVENT] = [];
    }
    hooks[PRE_PROMPT_EVENT].push({
      hooks: [
        {
          type: 'command',
          command: `node "${prePromptPath.replace(/\\/g, '/')}"`,
          timeout: 10,
        },
      ],
    });

    // Add PostToolUse hook (output compression)
    if (!hooks[POST_TOOL_EVENT]) {
      hooks[POST_TOOL_EVENT] = [];
    }
    hooks[POST_TOOL_EVENT].push({
      matcher: POST_TOOL_MATCHER,
      hooks: [
        {
          type: 'command',
          command: `node "${postToolResultPath.replace(/\\/g, '/')}"`,
          timeout: 10,
        },
      ],
    });

    // Add Stop hook (auto-regenerate CLAUDE.md)
    if (!hooks[STOP_DOCS_EVENT]) {
      hooks[STOP_DOCS_EVENT] = [];
    }
    hooks[STOP_DOCS_EVENT].push({
      hooks: [
        {
          type: 'command',
          command: `node "${stopDocsRefreshPath.replace(/\\/g, '/')}"`,
          timeout: 10,
        },
      ],
    });

    settings['hooks'] = hooks;

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
        stopDocsRefresh: stopDocsRefreshPath,
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

function uninstallHooks(settingsPath: string, global?: boolean): HooksCommandResult {
  try {
    if (!existsSync(settingsPath)) {
      return {
        success: true,
        message: 'No hooks installed (settings.json not found)',
        installed: false,
      };
    }

    const settingsJson = readFileSync(settingsPath, 'utf-8');
    const settings: Record<string, unknown> = JSON.parse(settingsJson);

    if (settings['hooks'] && typeof settings['hooks'] === 'object' && settings['hooks'] !== null) {
      const hooks = settings['hooks'] as HooksConfig;
      removeSparnHooks(hooks);

      // Remove empty event arrays
      for (const event of Object.keys(hooks)) {
        if (Array.isArray(hooks[event]) && hooks[event].length === 0) {
          delete hooks[event];
        }
      }

      // Remove hooks key if empty
      if (Object.keys(hooks).length === 0) {
        delete settings['hooks'];
      }
    }

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

function hooksStatus(settingsPath: string, global?: boolean): HooksCommandResult {
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

    const settingsJson = readFileSync(settingsPath, 'utf-8');
    const settings: Record<string, unknown> = JSON.parse(settingsJson);

    const hooks =
      settings['hooks'] && typeof settings['hooks'] === 'object' && settings['hooks'] !== null
        ? (settings['hooks'] as HooksConfig)
        : {};

    const prePromptHook = findSparnHook(hooks, PRE_PROMPT_EVENT);
    const postToolHook = findSparnHook(hooks, POST_TOOL_EVENT);
    const stopDocsHook = findSparnHook(hooks, STOP_DOCS_EVENT);

    if (!prePromptHook && !postToolHook && !stopDocsHook) {
      return {
        success: true,
        message: global ? 'No global sparn hooks installed' : 'No project sparn hooks installed',
        installed: false,
      };
    }

    return {
      success: true,
      message: global ? 'Global sparn hooks active' : 'Project sparn hooks active',
      installed: true,
      hookPaths: {
        prePrompt: prePromptHook || '(not installed)',
        postToolResult: postToolHook || '(not installed)',
        stopDocsRefresh: stopDocsHook || '(not installed)',
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

/**
 * Remove all sparn-managed hooks from the config
 */
function removeSparnHooks(hooks: HooksConfig): void {
  for (const event of Object.keys(hooks)) {
    if (!Array.isArray(hooks[event])) continue;
    hooks[event] = hooks[event].filter((group) => {
      if (!Array.isArray(group.hooks)) return true;
      // Remove groups where any hook command contains "sparn"
      return !group.hooks.some(
        (h) => typeof h.command === 'string' && h.command.includes(SPARN_MARKER),
      );
    });
  }
}

/**
 * Find a sparn hook command for a given event
 */
function findSparnHook(hooks: HooksConfig, event: string): string | null {
  const groups = hooks[event];
  if (!Array.isArray(groups)) return null;

  for (const group of groups) {
    if (!Array.isArray(group.hooks)) continue;
    for (const h of group.hooks) {
      if (typeof h.command === 'string' && h.command.includes(SPARN_MARKER)) {
        return h.command;
      }
    }
  }

  return null;
}
