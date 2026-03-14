/**
 * ============================================================
 * workspace-researcher/tools/meet.js — Google Meet Tool
 * ============================================================
 *
 * PURPOSE:
 * Provides the `search_meet_records` function to the Gemini LLM.
 * Allows retrieving Google Meet records such as meeting summaries, 
 * transcripts, and exact participant details from recorded sessions.
 * 
 * USE CASES:
 * - The LLM needs the transcript of yesterday's sales call.
 * - Checking the decisions made in a recorded meeting.
 * ============================================================
 */

'use strict';

// 1. Tool Declaration for Gemini API
const declaration = {
  name: "search_meet_records",
  description: "Recherche des enregistrements, transcriptions et résumés de réunions Google Meet passées. Renvoie les points clés, la transcription des échanges pertinents et les participants.",
  parameters: {
    type: "OBJECT",
    properties: {
      meetingId: {
        type: "STRING",
        description: "L'identifiant de la réunion Meet (ex: 'abc-defg-hij'), optionnel si on recherche par mots-clés."
      },
      query: {
        type: "STRING",
        description: "Mots-clés optionnels pour rechercher parmi les réunions passées (ex: 'Project Phoenix Kickoff')."
      },
      limit: {
        type: "INTEGER",
        description: "Nombre maximum d'enregistrements à renvoyer. La valeur par défaut est 2."
      }
    }
  }
};

/**
 * Executes a simulated or real Google Meet records query.
 * 
 * @param {Object} args The function arguments provided by the LLM
 * @param {boolean} isDryRun Whether to return mock data instead of calling actual APIs
 * @returns {Promise<Object>} The API response to return to the model
 */
async function execute(args, isDryRun = false) {
  const { meetingId, query, limit = 2 } = args;
  
  console.log(`[workspace-researcher/tools/meet] Executing search_meet_records with meetingId=${meetingId}, query=${query}, limit=${limit}, dryRun=${isDryRun}`);

  if (isDryRun) {
    // Return mock data for testing
    return {
      status: "SUCCESS",
      meetings: [
        {
          id: "abc-defg-hij",
          title: "Project Phoenix Kickoff",
          date: "2026-03-12T14:00:00Z",
          participants: ["lucas@dealboard.com", "alice@partner.com", "bob@client.com"],
          summary: "Decided to move forward with the cloud migration strategy. Datadog will be replaced by our in-house monitoring solution mapped to the new architecture.",
          keyDecisions: [
            "Adopt new architecture",
            "Replace Datadog by end of Q3"
          ]
        },
        {
          id: "xyz-cvbn-mkp",
          title: "Weekly Sync - Marketing",
          date: "2026-03-13T10:00:00Z",
          participants: ["lucas@dealboard.com", "charlie@dealboard.com"],
          summary: "Discussed the new messaging playbook for enterprise clients.",
          transcriptSnippet: "Charlie: I think we should focus on the cost savings aspect. Lucas: Agreed, highlighting the $20k monthly savings is our best hook."
        }
      ].slice(0, limit)
    };
  }

  // TODO: Integrate actual gws CLI or Meet API call here.
  
  return {
    status: "ERROR",
    message: "Le connecteur Google Meet en direct n'est pas encore implémenté via l'API, veuillez utiliser les données partielles."
  };
}

module.exports = {
  declaration,
  execute
};
