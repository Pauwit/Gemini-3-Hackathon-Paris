import { PersonInsight } from '@/lib/types';
import InsightSkeleton from './InsightSkeleton';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#6366F1,#8B5CF6)',
  'linear-gradient(135deg,#3B82F6,#06B6D4)',
  'linear-gradient(135deg,#10B981,#3B82F6)',
  'linear-gradient(135deg,#F59E0B,#EF4444)',
  'linear-gradient(135deg,#EC4899,#8B5CF6)',
];

function contactStatus(dateStr: string) {
  if (!dateStr) return null;
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return { label: 'Today', color: '#15803D', bg: '#F0FDF4' };
  if (days <= 3)  return { label: `${days}d ago`, color: '#15803D', bg: '#F0FDF4' };
  if (days <= 7)  return { label: `${days}d ago`, color: '#B45309', bg: '#FFFBEB' };
  return           { label: `${days}d ago`, color: '#B91C1C', bg: '#FEF2F2' };
}

export default function PeopleSection({ people, loading }: { people: PersonInsight[]; loading: boolean }) {
  if (loading) return <InsightSkeleton rows={2}/>;
  if (!people.length) return (
    <p className="text-[14px] text-muted py-2">
      👤 No contacts yet. People profiles appear as you exchange emails and attend meetings.
    </p>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {people.map((person, i) => {
        const badge = contactStatus(person.lastContact);
        const grad = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
        return (
          <div key={i} className="rounded-xl bg-white border border-border p-4 flex flex-col gap-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-[16px] font-extrabold flex-shrink-0" style={{ background: grad }}>
                {person.name[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-ink truncate">{person.name}</p>
                <p className="text-[12px] text-muted truncate">{[person.title, person.company].filter(Boolean).join(' at ') || '—'}</p>
              </div>
              {badge && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: badge.color, background: badge.bg }}>
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-[13px] text-muted leading-relaxed">{person.summary}</p>
            {person.keyConcerns.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {person.keyConcerns.map((c, j) => (
                  <span key={j} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">{c}</span>
                ))}
              </div>
            )}
            {person.upcomingInteractions.length > 0 && (
              <div className="border-t border-border pt-2.5 flex flex-col gap-1.5">
                {person.upcomingInteractions.map((item, j) => (
                  <div key={j} className="flex gap-2 text-[12px] font-medium text-slate-600">
                    <span className="text-violet-500">↗</span>{item}
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
