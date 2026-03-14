// ============================================================
// app/memory/components/PeopleProfiles.tsx — People Profiles
// ============================================================
//
// PURPOSE:
// Displays person nodes from the knowledge graph as profile cards.
// Each card shows name, role, company, decision-maker flag,
// preferences, concerns, and relationship strength.
//
// PROTOCOL REFERENCE: PROTOCOL.md section 4 (GET /api/memory/people)
// DEPENDENCIES: Person type, Badge
// ============================================================

'use client';

import type { Person } from '../../../lib/types';

interface PeopleProfilesProps {
  people: Person[];
}

export default function PeopleProfiles({ people }: PeopleProfilesProps) {
  // TODO: Grid of person cards
  // TODO: Decision-maker badge
  // TODO: Preference/concern tags
  // TODO: "Last seen" relative date

  if (people.length === 0) {
    return <div className="text-gray-300 text-sm">No people profiles yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {people.map(person => (
        <div key={person.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="font-medium text-gray-900">{person.name}</div>
          <div className="text-sm text-gray-500">{person.role} · {person.company}</div>
          {/* TODO: Full profile card content */}
        </div>
      ))}
    </div>
  );
}
