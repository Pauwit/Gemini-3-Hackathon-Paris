// ============================================================
// app/memory/components/PeopleProfiles.tsx — People Profile Cards
// ============================================================
//
// PURPOSE:
// Displays person entities from the knowledge graph as rich profile cards.
// Each card shows:
//   - Name + role + company
//   - Decision-maker badge
//   - Preferences and concerns as colored tags
//   - Communication style and relationship indicator
//   - Last-seen relative date
//   - Avatar with initials + color derived from name
//
// DATA FLOW: GET /api/memory/people → Person[] → grid of cards
//
// DEPENDENCIES: Person type, Badge
// PROTOCOL REFERENCE: PROTOCOL.md section 4 (GET /api/memory/people)
// ============================================================

'use client';

import React from 'react';
import { Crown, Clock, MessageSquare } from 'lucide-react';
import { Badge }       from '../../../components/ui/Badge';
import type { Person } from '../../../lib/types';

// ── Helpers ───────────────────────────────────────────────

/** Consistent color from name string */
function nameColor(name: string): string {
  const colors = ['#4285F4', '#34A853', '#EA4335', '#FBBC04', '#A142F4', '#00ACC1'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/** Initials from name */
function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

/** Relative last-seen date */
function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Person Card ───────────────────────────────────────────

function PersonCard({ person }: { person: Person }) {
  const color = nameColor(person.name);

  return (
    <div
      className="bg-white rounded-xl overflow-hidden"
      style={{ border: '1px solid #E8EAED', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      {/* Header stripe */}
      <div className="h-1.5" style={{ backgroundColor: color }} />

      <div className="p-4">
        {/* Avatar + name row */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
            style={{ backgroundColor: color }}
          >
            {initials(person.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold truncate" style={{ color: '#202124' }}>
                {person.name}
              </p>
              {person.decisionMaker && (
                <span
                  className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#FEF7E0', color: '#F9A825', border: '1px solid #FDE293' }}
                >
                  <Crown size={8} />
                  DM
                </span>
              )}
            </div>
            <p className="text-xs" style={{ color: '#5F6368' }}>
              {person.role}
            </p>
            <p className="text-xs font-medium" style={{ color }}>
              {person.company}
            </p>
          </div>
        </div>

        {/* Relationship */}
        {person.relationship && (
          <div className="flex items-center gap-1.5 mb-3 text-xs" style={{ color: '#5F6368' }}>
            <MessageSquare size={11} style={{ flexShrink: 0 }} />
            <span className="italic">{person.relationship}</span>
          </div>
        )}

        {/* Preferences */}
        {person.preferences?.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9AA0A6' }}>
              Cares about
            </p>
            <div className="flex flex-wrap gap-1">
              {person.preferences.map((p, i) => (
                <Badge key={i} variant="info" pill>{p}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Concerns */}
        {person.concerns?.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9AA0A6' }}>
              Concerns
            </p>
            <div className="flex flex-wrap gap-1">
              {person.concerns.map((c, i) => (
                <Badge key={i} variant="warning" pill>{c}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Last seen */}
        {person.lastSeen && (
          <div className="flex items-center gap-1 text-[10px]" style={{ color: '#9AA0A6' }}>
            <Clock size={10} />
            Last seen: {relativeDate(person.lastSeen)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────

interface PeopleProfilesProps {
  people: Person[];
}

/**
 * PeopleProfiles
 * Grid of profile cards for all known people in the knowledge graph.
 *
 * @param people - Person array from /api/memory/people
 */
export function PeopleProfiles({ people }: PeopleProfilesProps) {
  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <p className="text-sm font-medium" style={{ color: '#9AA0A6' }}>No people profiles yet</p>
        <p className="text-xs text-center" style={{ color: '#9AA0A6' }}>
          People are discovered automatically as meetings are processed
        </p>
      </div>
    );
  }

  // Sort: decision-makers first
  const sorted = [...people].sort((a, b) => {
    if (a.decisionMaker && !b.decisionMaker) return -1;
    if (!a.decisionMaker && b.decisionMaker) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map((person) => (
        <PersonCard key={person.id} person={person} />
      ))}
    </div>
  );
}

export default PeopleProfiles;
