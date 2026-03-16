import { PersonInsight } from '@/lib/types';
import InsightSkeleton from './InsightSkeleton';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#4285F4,#9334E6)',
  'linear-gradient(135deg,#34A8EB,#4285F4)',
  'linear-gradient(135deg,#34A853,#34A8EB)',
  'linear-gradient(135deg,#FFA000,#E8437B)',
  'linear-gradient(135deg,#E8437B,#9334E6)',
];

function contactStatus(dateStr: string) {
  if (!dateStr) return null;
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0)  return { label: 'Today',      color: '#81C995', bg: 'rgba(52,168,83,0.12)'  };
  if (days <= 3)   return { label: `${days}d ago`, color: '#81C995', bg: 'rgba(52,168,83,0.10)'  };
  if (days <= 7)   return { label: `${days}d ago`, color: '#FDD663', bg: 'rgba(251,188,5,0.10)'  };
  return             { label: `${days}d ago`, color: '#FF8A80', bg: 'rgba(234,67,53,0.10)'  };
}

export default function PeopleSection({ people, loading }: { people: PersonInsight[]; loading: boolean }) {
  if (loading) return <InsightSkeleton rows={2}/>;
  if (!people.length) return (
    <p className="text-[14px] text-muted py-2">
      No contacts yet. People profiles appear as you exchange emails and attend meetings.
    </p>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {people.map((person, i) => {
        const badge = contactStatus(person.lastContact);
        const grad  = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
        return (
          <div
            key={i}
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-[15px] font-extrabold flex-shrink-0"
                style={{ background: grad }}
              >
                {person.name[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-ink truncate">{person.name}</p>
                <p className="text-[11px] text-muted truncate">{[person.title, person.company].filter(Boolean).join(' at ') || '—'}</p>
              </div>
              {badge && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ color: badge.color, background: badge.bg }}
                >
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted leading-relaxed">{person.summary}</p>
            {person.keyConcerns.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {person.keyConcerns.map((c, j) => (
                  <span
                    key={j}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(147,52,230,0.10)', color: '#C084FC', border: '1px solid rgba(147,52,230,0.2)' }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
            {person.upcomingInteractions.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {person.upcomingInteractions.map((item, j) => (
                  <div key={j} className="flex gap-2 text-[12px] font-medium text-muted">
                    <span style={{ color: '#C084FC' }}>↗</span>{item}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
