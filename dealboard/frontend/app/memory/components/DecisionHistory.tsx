// ============================================================
// app/memory/components/DecisionHistory.tsx — Decision History
// ============================================================
//
// PURPOSE:
// Timeline-style list of all decisions logged across meetings.
// Filterable by status (pending / completed / cancelled).
// Each entry links back to the source meeting.
//
// PROTOCOL REFERENCE: PROTOCOL.md section 4 (GET /api/memory/decisions)
// DEPENDENCIES: Decision type, Badge
// ============================================================

'use client';

import type { Decision } from '../../../lib/types';

interface DecisionHistoryProps {
  decisions: Decision[];
}

export default function DecisionHistory({ decisions }: DecisionHistoryProps) {
  // TODO: Status filter: All / Pending / Completed / Cancelled
  // TODO: Sort by date desc
  // TODO: Link meetingId to /review?meetingId=...

  if (decisions.length === 0) {
    return <div className="text-gray-300 text-sm">No decisions logged yet.</div>;
  }

  return (
    <div className="space-y-3">
      {decisions.map(decision => (
        <div key={decision.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
          <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
            decision.status === 'completed' ? 'bg-green-400' :
            decision.status === 'cancelled' ? 'bg-gray-300' : 'bg-yellow-400'
          }`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800">{decision.description}</p>
            <p className="text-xs text-gray-400 mt-1">{decision.madeBy} · {decision.date}</p>
          </div>
          {/* TODO: Status badge + meeting link */}
        </div>
      ))}
    </div>
  );
}
