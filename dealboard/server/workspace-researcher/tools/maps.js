/**
 * ============================================================
 * workspace-researcher/tools/maps.js — Google Maps Tool
 * ============================================================
 *
 * PURPOSE:
 * Provides the `get_maps_directions` function to the Gemini LLM.
 * Allows calculating routes, travel times, and location intelligence
 * using Google Maps data.
 * 
 * USE CASES:
 * - The LLM needs to know the travel time between the office and a client.
 * - Retrieving context about a location for a meeting.
 * ============================================================
 */

'use strict';

// 1. Tool Declaration for Gemini API
const declaration = {
  name: "get_maps_directions",
  description: "Calcule l'itinéraire, la distance et le temps de trajet prévu (en tenant compte du trafic) entre deux adresses ou lieux.",
  parameters: {
    type: "OBJECT",
    properties: {
      origin: {
        type: "STRING",
        description: "L'adresse de départ ou le nom du lieu (ex: 'Paris Charles de Gaulle', '10 rue de la Paix, Paris')."
      },
      destination: {
        type: "STRING",
        description: "L'adresse d'arrivée ou le nom du lieu (ex: 'Station F, Paris')."
      },
      mode: {
        type: "STRING",
        description: "Le mode de transport optionnel (ex: 'driving', 'transit', 'walking', 'bicycling'). Par défaut: 'driving'."
      }
    },
    required: ["origin", "destination"]
  }
};

/**
 * Executes a simulated or real Google Maps directions query.
 * 
 * @param {Object} args The function arguments provided by the LLM
 * @param {boolean} isDryRun Whether to return mock data instead of calling actual APIs
 * @returns {Promise<Object>} The API response to return to the model
 */
async function execute(args, isDryRun = false) {
  const { origin, destination, mode = 'driving' } = args;
  
  console.log(`[workspace-researcher/tools/maps] Executing get_maps_directions with origin='${origin}', destination='${destination}', mode=${mode}, dryRun=${isDryRun}`);

  if (isDryRun) {
    // Return mock data for testing
    return {
      status: "SUCCESS",
      route: {
        origin: origin,
        destination: destination,
        mode: mode,
        distanceText: "12.5 km",
        durationText: "35 mins",
        trafficConditions: "Heavy traffic near the destination.",
        suggestedDepartureTime: "Leave 45 minutes earlier than planned to account for potential delays."
      }
    };
  }

  // TODO: Integrate actual Google Maps API call here.
  
  return {
    status: "ERROR",
    message: "Le connecteur Google Maps en direct n'est pas encore implémenté via l'API, veuillez utiliser les données partielles."
  };
}

module.exports = {
  declaration,
  execute
};
