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

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function MeetingCard({ meeting }: { meeting: MeetingSummary }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer transition-all"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2 p-4">
        <div>
          <p className="font-semibold text-ink text-[13px]">{meeting.title}</p>
          <p className="text-muted text-[11px] mt-0.5">{meeting.date}</p>
        </div>
        <span style={{ color: 'rgba(154,160,166,0.6)', flexShrink: 0, marginTop: 2 }}>
          <ChevronIcon expanded={expanded} />
        </span>
      </div>

      {(meeting.participants?.length > 0) && (
        <div className="flex flex-wrap gap-1 px-4 pb-2">
          {meeting.participants.map((p, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#9AA0A6', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {p}
            </span>
          ))}
        </div>
      )}

      <p
        className={`text-muted text-[12px] px-4 pb-4 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}
        style={{ transition: 'all 0.2s ease' }}
      >
        {meeting.summary}
      </p>
    </div>
  );
}

export default function MeetingSummariesSection({ meetings, loading }: Props) {
  if (loading) return null;

  if (meetings.length === 0) {
    return (
      <p className="text-muted text-[13px] py-4">
        No meeting summaries yet. They will appear here after you use the live meeting feature.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {meetings.map((meeting, i) => (
        <MeetingCard key={i} meeting={meeting} />
      ))}
    </div>
  );
}
