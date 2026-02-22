/**
 * ASCII banner for Sparn CLI.
 * Displayed on `sparn init` and `sparn --version`.
 */

import { brainPink, neuralCyan, synapseViolet } from './colors.js';

/**
 * Sparn ASCII banner.
 */
export const BANNER = `
   ____  ____  ___    ____  _   __
  / ___\\/ __ \\/ _ \\  / __ \\/ | / /
  \\__ \\/ /_/ / /_\\ \\/ /_/ /  |/ /
 ___/ / ____/ __ _/ _, _/ /|  /
/____/_/   /_/ |_/_/ |_/_/ |_/
`;

/**
 * Tagline for banner.
 */
export const TAGLINE = '🧠 Neuroscience-inspired context optimization';

/**
 * Get formatted banner with color.
 *
 * @param version - Optional version string
 * @returns Formatted banner
 */
export function getBanner(version?: string): string {
  const versionStr = version ? synapseViolet(`v${version}`) : '';
  return `${neuralCyan(BANNER)}\n${brainPink(TAGLINE)}\n${versionStr ? `${versionStr}\n` : ''}`;
}
