/**
 * MeetingSummariesSection.tsx — Expandable meeting summary cards.
 */

'use client';

import { useState } from 'react';
import { MeetingSummary } from '@/lib/types';

interface Props {
  meetings: MeetingSummary[];
  loading: boolean;
}

function MeetingCard({ meeting }: { meeting: MeetingSummary }) {
  const [expanded, setExpanded] = useState(false);
  const preview = meeting.summary.split('\n').slice(0, 2).join('\n');

  return (
    <div className="card p-4">
      <div
        className="flex items-start justify-between gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <p className="font-semibold text-text-primary text-sm">{meeting.title}</p>
          <p className="text-text-muted text-xs mt-0.5">{meeting.date}</p>
        </div>
        <svg
          className={`w-4 h-4 text-text-muted flex-shrink-0 mt-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {meeting.participants.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {meeting.participants.map((p, i) => (
            <span key={i} className="text-xs bg-surface-medium text-text-secondary px-2 py-0.5 rounded-full">
              {p}
            </span>
          ))}
        </div>
      )}

      <p className={`text-text-secondary text-xs mt-2 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
        {expanded ? meeting.summary : preview}
      </p>
    </div>
  );
}

export default function MeetingSummariesSection({ meetings, loading }: Props) {
  if (loading) return null;

  if (meetings.length === 0) {
    return (
      <p className="text-text-muted text-sm py-4">
        No meeting summaries yet. Meeting summaries will appear here after you use the live meeting feature.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting, i) => (
        <MeetingCard key={i} meeting={meeting} />
      ))}
    </div>
  );
}
