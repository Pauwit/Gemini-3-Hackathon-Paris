import { ProjectInsight } from '@/lib/types';
import InsightSkeleton from './InsightSkeleton';

const STATUS = {
  'on track':  { label: 'On track',  bg: 'rgba(52,168,83,0.10)',  color: '#81C995', border: 'rgba(52,168,83,0.22)'  },
  'at risk':   { label: 'At risk',   bg: 'rgba(251,188,5,0.10)',  color: '#FDD663', border: 'rgba(251,188,5,0.22)'  },
  'blocked':   { label: 'Blocked',   bg: 'rgba(234,67,53,0.10)',  color: '#FF8A80', border: 'rgba(234,67,53,0.22)'  },
  'completed': { label: 'Completed', bg: 'rgba(255,255,255,0.05)', color: '#9AA0A6', border: 'rgba(255,255,255,0.10)' },
};

export default function ProjectsSection({ projects, loading }: { projects: ProjectInsight[]; loading: boolean }) {
  if (loading) return <InsightSkeleton rows={2}/>;
  if (!projects.length) return <p className="text-[14px] text-muted py-2">No active projects detected.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {projects.map((p, i) => {
        const s = STATUS[p.status] ?? STATUS['on track'];
        return (
          <div
            key={i}
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-start gap-2 justify-between">
              <p className="text-[13px] font-bold text-ink leading-snug">{p.name}</p>
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap uppercase tracking-wider"
                style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
              >
                {s.label}
              </span>
            </div>
            <p className="text-[12px] text-muted leading-relaxed">{p.summary}</p>
            {p.nextActions.length > 0 && (
              <div
                className="flex flex-col gap-1.5 rounded-lg p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'rgba(154,160,166,0.6)' }}>Next actions</p>
                {p.nextActions.map((a, j) => (
                  <div key={j} className="flex gap-2 text-[12px] font-medium text-muted">
                    <span style={{ color: '#81C995' }}>→</span>{a}
                  </div>
                ))}
              </div>
            )}
            {p.relatedPeople.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {p.relatedPeople.map((name, j) => (
                  <span
                    key={j}
                    className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(147,52,230,0.10)', color: '#C084FC', border: '1px solid rgba(147,52,230,0.22)' }}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ background: 'linear-gradient(135deg,#9334E6,#E8437B)' }}
                    >
                      {name[0]}
                    </span>
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
