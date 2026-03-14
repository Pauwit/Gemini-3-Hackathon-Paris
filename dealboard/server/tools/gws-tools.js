/**
 * ============================================================
 * tools/gws-tools.js — Google Workspace CLI Tool Runner
 * ============================================================
 *
 * PURPOSE:
 * Executes GWS CLI commands (gws gmail, gws drive, gws sheets, etc.)
 * as child processes and returns their JSON output. Handles timeouts,
 * auth errors, and non-zero exit codes gracefully.
 *
 * DATA FLOW:
 * worker → runGwsCommand(command, args)
 *   → spawn('gws', [...args])
 *   → stdout JSON string
 *   → parsed object
 *
 * PROTOCOL REFERENCE: skills/gws-*/SKILL.md (command formats)
 *
 * DEPENDENCIES:
 *   child_process (Node built-in) — CLI execution
 *   ../config                    — GWS_COMMAND_TIMEOUT_MS
 * ============================================================
 */

'use strict';

const { spawn } = require('child_process');
const config = require('../config');

/**
 * runGwsCommand
 * Executes a GWS CLI command and returns parsed JSON output.
 *
 * @param {string} command - GWS subcommand (e.g. 'gmail search', 'drive get')
 * @param {object} args - Key-value arguments (converted to --key value flags)
 * @returns {Promise<string>} Raw stdout from the CLI command
 * @throws {Error} On non-zero exit, timeout, or auth failure
 *
 * @example
 * const output = await runGwsCommand('gmail search', {
 *   query: 'subject:pricing TechVentures',
 *   limit: 5
 * });
 * // Returns JSON string: { "messages": [...] }
 */
async function runGwsCommand(command, args) {
  // TODO: Build argv array from command + args object
  // TODO: spawn('gws', argv) with timeout
  // TODO: Collect stdout/stderr
  // TODO: On timeout: kill process, return cached/empty result
  // TODO: On exit code 1 with "Authentication required": surface auth error
  // TODO: On exit code 0: return stdout

  console.log('[gws-tools] runGwsCommand called — TODO: implement', { command, args });
  return JSON.stringify({ results: [] });
}

module.exports = { runGwsCommand };
