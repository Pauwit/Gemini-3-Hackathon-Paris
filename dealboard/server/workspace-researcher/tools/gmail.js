/**
 * ============================================================
 * workspace-researcher/tools/gmail.js — Gmail Tool
 * ============================================================
 *
 * PURPOSE:
 * Provides the `search_gmail` function to the Gemini LLM. It allows 
 * searching for emails, checking threads, extracting attachments, 
 * senders, receivers, and date information from the user's Gmail.
 * 
 * USE CASES:
 * - The LLM decides it needs context from a recent conversation.
 * - The Orchestrator asks about project updates sent via email.
 * ============================================================
 */

'use strict';

// 1. Tool Declaration for Gemini API
const declaration = {
  name: "search_gmail",
  description: "Recherche des emails dans Gmail en utilisant une requête de recherche (ex: 'from:john@example.com subject:project'). Renvoie les métadonnées, l'extrait et le lien vers l'email (ID).",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "La requête de recherche Gmail (ex: 'is:unread', 'has:attachment', 'from:client@domain.com')."
      },
      limit: {
        type: "INTEGER",
        description: "Le nombre maximum d'emails à renvoyer. La valeur par défaut est 5."
      }
    },
    required: ["query"]
  }
};

/**
 * Executes a simulated or real search against Gmail.
 * 
 * @param {Object} args The function arguments provided by the LLM
 * @param {boolean} isDryRun Whether to return mock data instead of calling actual APIs
 * @returns {Promise<Object>} The API response to return to the model
 */
async function execute(args, isDryRun = false) {
  const { query, limit = 5 } = args;
  
  console.log(`[workspace-researcher/tools/gmail] Executing search_gmail with query=${query}, limit=${limit}, dryRun=${isDryRun}`);

  if (isDryRun) {
    // Return mock data for testing
    return {
      status: "SUCCESS",
      emails: [
        {
          id: "msg12345",
          date: "2026-03-12T10:00:00Z",
          from: "alice@partner.com",
          subject: "Re: Q3 Strategy Meeting",
          snippet: "Here is the summary of our approach for Q3. As discussed, we will focus on...",
          link: "https://mail.google.com/mail/u/0/#inbox/msg12345"
        },
        {
          id: "msg12346",
          date: "2026-03-10T14:30:00Z",
          from: "bob@client.com",
          subject: "Project Phoenix - Revised Scope",
          snippet: "Please find attached the revised scope for Project Phoenix. Key changes are highlighted...",
          link: "https://mail.google.com/mail/u/0/#inbox/msg12346"
        }
      ].slice(0, limit)
    };
  }

  // Use the real gmail worker (handles both mock and live Google API)
  const { searchEmails } = require('../../workers/gmail-worker');
  const result = await searchEmails(query, limit);
  if (result.error) {
    return { status: 'ERROR', message: result.error };
  }
  return {
    status: 'SUCCESS',
    emails: (result.raw || []).map(e => ({
      id:      e.id,
      date:    e.date,
      from:    e.from,
      subject: e.subject,
      snippet: e.snippet || e.body?.substring(0, 200) || '',
    })),
    summary: result.answer,
  };
}

module.exports = {
  declaration,
  execute
};
