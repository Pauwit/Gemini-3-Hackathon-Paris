/**
 * ============================================================
 * workspace-researcher/tools/drive.js — Drive Tool
 * ============================================================
 *
 * PURPOSE:
 * Provides the `search_drive` function to the Gemini LLM. Allows 
 * searching Google Drive for documents, extracting snippets, and 
 * retrieving strict metadata to provide factual zero-hallucination context.
 * 
 * USE CASES:
 * - The LLM decides it needs specific project plans, battlecards, 
 *   or financial spreadsheets from Google Drive.
 * ============================================================
 */

'use strict';

// 1. Tool Declaration for Gemini API
const declaration = {
  name: "search_drive",
  description: "Recherche des documents sur Google Drive. Renvoie le titre, la date de modification, l'extrait/résumé du document et le lien URL/ID.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "Mots-clés pour rechercher le document sur Drive (ex: 'Q3 OKR', 'Battlecard Y')."
      },
      fileType: {
        type: "STRING",
        description: "Type de fichier optionnel (ex: 'document', 'spreadsheet', 'presentation', 'pdf')."
      },
      limit: {
        type: "INTEGER",
        description: "Le nombre maximum de documents à renvoyer. La valeur par défaut est 3."
      }
    },
    required: ["query"]
  }
};

/**
 * Executes a simulated or real search against Google Drive.
 * 
 * @param {Object} args The function arguments provided by the LLM
 * @param {boolean} isDryRun Whether to return mock data instead of calling actual APIs
 * @returns {Promise<Object>} The API response to return to the model
 */
async function execute(args, isDryRun = false) {
  const { query, fileType, limit = 3 } = args;
  
  console.log(`[workspace-researcher/tools/drive] Executing search_drive with query=${query}, fileType=${fileType}, limit=${limit}, dryRun=${isDryRun}`);

  if (isDryRun) {
    // Return mock data for testing
    return {
      status: "SUCCESS",
      documents: [
        {
          id: "doc1",
          title: "Q3 Strategy Meeting Notes",
          lastModified: "2026-03-13T09:00:00Z",
          author: "alice@partner.com",
          snippet: "The main focus for Q3 will be feature X adoption. We noted that competitors are moving towards...",
          link: "https://docs.google.com/document/d/doc1/edit"
        },
        {
          id: "doc2",
          title: "Project Phoenix Architecture",
          lastModified: "2026-02-28T16:45:00Z",
          author: "lucas@dealboard.com",
          snippet: "Data structure: We will utilize a graph database to maintain interaction state...",
          link: "https://docs.google.com/document/d/doc2/edit"
        }
      ].slice(0, limit)
    };
  }

  // Use the real drive worker
  const { searchDocs } = require('../../workers/drive-worker');
  const result = await searchDocs(query, { maxResults: limit });
  if (result.error) {
    return { status: 'ERROR', message: result.error };
  }
  return {
    status: 'SUCCESS',
    documents: (result.raw || []).map(d => ({
      id:           d.id,
      title:        d.name || d.title,
      lastModified: d.modifiedTime,
      snippet:      d.content?.substring(0, 300) || d.snippet || '',
    })),
    summary: result.answer,
  };
}

module.exports = {
  declaration,
  execute
};
