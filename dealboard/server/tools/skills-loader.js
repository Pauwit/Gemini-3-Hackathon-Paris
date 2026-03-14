/**
 * ============================================================
 * tools/skills-loader.js — Skills & Prompt File Loader
 * ============================================================
 *
 * PURPOSE:
 * Loads skill documentation (SKILL.md files) and prompt templates
 * (.txt files) from disk, caching them in memory after first read.
 * Agents use this to inject skill docs into LLM context and load
 * system prompts without hardcoding file paths everywhere.
 *
 * DATA FLOW:
 * agent → loadSkill('gws-gmail') → reads skills/gws-gmail/SKILL.md
 * agent → loadPrompt('listener') → reads prompts/listener-prompt.txt
 *
 * PROTOCOL REFERENCE: N/A
 *
 * DEPENDENCIES:
 *   fs   (Node built-in) — file reading
 *   path (Node built-in) — path resolution
 *   ../config            — SKILLS_DIR, PROMPTS_DIR
 * ============================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');

// In-memory cache: skillName → content string
const skillCache = new Map();
const promptCache = new Map();

/**
 * loadSkill
 * Loads and caches a SKILL.md file for a GWS skill.
 *
 * @param {string} skillName - Skill directory name (e.g. 'gws-gmail', 'gws-drive')
 * @returns {Promise<string>} Markdown content of the SKILL.md file
 *
 * @example
 * const skillDoc = await loadSkill('gws-gmail');
 * // Returns full SKILL.md content for injection into LLM prompt
 */
async function loadSkill(skillName) {
  if (skillCache.has(skillName)) {
    return skillCache.get(skillName);
  }

  // TODO: Build path from config.SKILLS_DIR + skillName + 'SKILL.md'
  // TODO: Read file with fs.promises.readFile
  // TODO: Cache result
  // TODO: Return content string

  console.log('[skills-loader] loadSkill called — TODO: implement', { skillName });
  return `# ${skillName}\nTODO: Implement skill loading`;
}

/**
 * loadPrompt
 * Loads and caches a prompt template file from the prompts directory.
 *
 * @param {string} promptName - Prompt base name (e.g. 'listener', 'analyser')
 * @returns {Promise<string>} Content of the prompt .txt file
 *
 * @example
 * const prompt = await loadPrompt('listener');
 * // Returns full system prompt for the Listener Agent
 */
async function loadPrompt(promptName) {
  if (promptCache.has(promptName)) {
    return promptCache.get(promptName);
  }

  // TODO: Build path from config.PROMPTS_DIR + promptName + '-prompt.txt'
  // TODO: Read file with fs.promises.readFile
  // TODO: Cache result
  // TODO: Return content string

  console.log('[skills-loader] loadPrompt called — TODO: implement', { promptName });
  return `You are the ${promptName} agent. TODO: Implement prompt loading.`;
}

module.exports = { loadSkill, loadPrompt };
