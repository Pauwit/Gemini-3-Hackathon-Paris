/**
 * ============================================================
 * workspace-researcher/tools/calendar.js — Calendar Tool
 * ============================================================
 *
 * PURPOSE:
 * Provides the `get_calendar_events` function to the Gemini LLM.
 * Allows retrieving Google Calendar events with metadata such as 
 * attendees, exact start and end times, description, and meeting links.
 * 
 * USE CASES:
 * - The LLM needs context on who was present in a past meeting.
 * - Checking schedule availability or upcoming project deadlines 
 *   stored as events.
 * ============================================================
 */

'use strict';

// 1. Tool Declaration for Gemini API
const declaration = {
  name: "get_calendar_events",
  description: "Récupère les événements du calendrier de l'utilisateur. Utile pour savoir les horaires, les participants d'une réunion, et les descriptions/liens Meet.",
  parameters: {
    type: "OBJECT",
    properties: {
      timeMin: {
        type: "STRING",
        description: "Date et heure de début au format ISO 8601 (ex: '2026-03-14T00:00:00Z')."
      },
      timeMax: {
        type: "STRING",
        description: "Date et heure de fin au format ISO 8601 (ex: '2026-03-15T00:00:00Z')."
      },
      query: {
        type: "STRING",
        description: "Mots-clés optionnels pour filtrer les événements (ex: 'Sync Project X')."
      },
      limit: {
        type: "INTEGER",
        description: "Nombre maximum d'événements à renvoyer. La valeur par défaut est 5."
      }
    },
    required: ["timeMin", "timeMax"]
  }
};

/**
 * Executes a simulated or real Google Calendar query.
 * 
 * @param {Object} args The function arguments provided by the LLM
 * @param {boolean} isDryRun Whether to return mock data instead of calling actual APIs
 * @returns {Promise<Object>} The API response to return to the model
 */
async function execute(args, isDryRun = false) {
  const { timeMin, timeMax, query, limit = 5 } = args;
  
  console.log(`[workspace-researcher/tools/calendar] Executing get_calendar_events with timeMin=${timeMin}, timeMax=${timeMax}, query=${query}, limit=${limit}, dryRun=${isDryRun}`);

  if (isDryRun) {
    // Return mock data for testing
    return {
      status: "SUCCESS",
      events: [
        {
          id: "event1",
          title: "Daily Standup - Team Alpha",
          startTime: "2026-03-14T09:00:00Z",
          endTime: "2026-03-14T09:30:00Z",
          attendees: ["lucas@dealboard.com", "alice@partner.com", "bob@client.com"],
          meetLink: "https://meet.google.com/abc-defg-hij",
          description: "Routine sync on ongoing tasks."
        },
        {
          id: "event2",
          title: "Project Phoenix - Milestone Review",
          startTime: "2026-03-14T14:00:00Z",
          endTime: "2026-03-14T15:00:00Z",
          attendees: ["lucas@dealboard.com", "executive@client.com"],
          meetLink: "https://meet.google.com/xyz-cvbn-mkp",
          description: "Reviewing the deliverables for milestone 2 of Project Phoenix."
        }
      ].slice(0, limit)
    };
  }

  // Use the real calendar worker
  const { searchCalendarEvents } = require('../../workers/calendar-worker');
  const result = await searchCalendarEvents(query || '', { timeMin, timeMax, maxResults: limit });
  if (result.error) {
    return { status: 'ERROR', message: result.error };
  }
  return {
    status: 'SUCCESS',
    events: (result.raw || []).map(e => ({
      id:          e.id,
      title:       e.title || e.summary,
      startTime:   e.start,
      endTime:     e.end,
      attendees:   e.attendees || [],
      description: e.description?.substring(0, 200) || '',
    })),
    summary: result.answer,
  };
}

module.exports = {
  declaration,
  execute
};
