/**
 * ============================================================
 * workers/drive-worker.js — Google Drive Worker
 * ============================================================
 *
 * PURPOSE:
 * Searches Google Drive for relevant documents (battlecards,
 * proposals, contracts, case studies). Returns standardized
 * result objects for the Analyser Agent.
 * In mock mode, filters pre-loaded mock documents by keyword.
 * In live mode, uses the Drive API via google-auth.js.
 *
 * STANDARD RETURN FORMAT:
 * { agent, question, answer, raw, error }
 *
 * DATA FLOW:
 * query → [mock filter | Drive API] → standardized result
 *
 * PROTOCOL REFERENCE: N/A (internal worker)
 *
 * DEPENDENCIES:
 *   ../tools/google-auth — pre-authenticated Drive client
 *   ../config            — USE_MOCK
 *   ../utils/logger      — structured logging
 * ============================================================
 */

'use strict';

const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * getMockData — loads mock workspace data (cached by Node require)
 * @returns {object} Parsed mock-workspace.json
 */
function getMockData() {
  return require(path.join(__dirname, '..', 'mock-data', 'mock-workspace.json'));
}

/**
 * searchDocs — searches Google Drive for documents matching a query
 * @param {string} query - Search keywords
 * @param {object} [options] - Optional search options
 * @param {number} [options.maxResults=10] - Maximum number of results
 * @param {string} [options.mimeType] - Filter by MIME type
 * @returns {Promise<{agent: string, question: string, answer: string, raw: array, error: string|null}>}
 */
async function searchDocs(query, options = {}) {
  const maxResults = options.maxResults || 10;
  const question = `Drive: ${query}`;

  try {
    if (config.USE_MOCK) {
      const mockData = getMockData();
      // Strip Drive-specific operators and generic phrases that won't match document content
      const genericPhrases = ['modified recently', 'recent documents', 'recently modified'];
      const isGeneric = genericPhrases.some(p => query.toLowerCase().includes(p));
      const keywords = isGeneric ? [] : query.toLowerCase().split(/\s+/).filter(k => k.length > 1);

      const filtered = (mockData.documents || []).filter(doc => {
        const text = `${doc.name} ${doc.content || ''}`.toLowerCase();
        return keywords.length === 0 || keywords.some(k => text.includes(k));
      }).slice(0, maxResults);

      const answer = filtered.length > 0
        ? filtered.map(d => `[${d.modifiedTime}] ${d.name} (${d.mimeType})`).join('\n')
        : 'No matching documents found in mock data.';

      logger.info('[drive-worker] Mock search complete', { query, found: filtered.length });
      return { agent: 'drive', question, answer, raw: filtered, error: null };
    }

    // Live mode — use Google Drive API
    const { drive } = require('../tools/google-auth');
    if (!drive) {
      return { agent: 'drive', question, answer: 'Drive client not configured.', raw: [], error: 'NO_AUTH' };
    }

    const driveQuery = options.mimeType
      ? `fullText contains '${query}' and mimeType='${options.mimeType}'`
      : `fullText contains '${query}'`;

    const listRes = await drive.files.list({
      q: driveQuery,
      pageSize: maxResults,
      fields: 'files(id, name, mimeType, modifiedTime)',
    });

    const files = listRes.data.files || [];
    const documents = [];

    for (const file of files.slice(0, 5)) {
      let content = '';
      // Export Google Docs as plain text
      if (file.mimeType === 'application/vnd.google-apps.document') {
        try {
          const exportRes = await drive.files.export({
            fileId: file.id,
            mimeType: 'text/plain',
          });
          content = (exportRes.data || '').substring(0, 3000);
        } catch (exportErr) {
          logger.warn('[drive-worker] Failed to export doc content', { id: file.id, error: exportErr.message });
        }
      }

      documents.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        content,
      });
    }

    const answer = documents.length > 0
      ? documents.map(d => `[${d.modifiedTime}] ${d.name} (${d.mimeType})`).join('\n')
      : 'No matching documents found.';

    logger.info('[drive-worker] Live search complete', { query, found: documents.length });
    return { agent: 'drive', question, answer, raw: documents, error: null };

  } catch (err) {
    logger.error('[drive-worker] searchDocs failed', { error: err.message });
    return { agent: 'drive', question, answer: '', raw: [], error: err.message };
  }
}

/**
 * searchDrive — legacy alias for backward compatibility with worker-orchestrator
 * @param {object[]|string} queries - Array of query objects or query string
 * @returns {Promise<{agent, question, answer, raw, error}>}
 */
async function searchDrive(queries) {
  if (Array.isArray(queries)) {
    // Legacy format: [{ query, limit }]
    if (queries.length === 0) return { agent: 'drive', question: 'Drive: (none)', answer: '', raw: [], error: null };
    const first = queries[0];
    return searchDocs(first.query || '', { maxResults: first.limit });
  }
  return searchDocs(String(queries));
}

module.exports = { searchDocs, searchDrive };
