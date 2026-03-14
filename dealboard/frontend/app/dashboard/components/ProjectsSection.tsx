import { ProjectInsight } from '@/lib/types';
import InsightSkeleton from './InsightSkeleton';

const STATUS = {
  'on track':  { emoji: '✅', label: 'On track',  bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  'at risk':   { emoji: '⚠️', label: 'At risk',   bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  'blocked':   { emoji: '🚫', label: 'Blocked',   bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  'completed': { emoji: '🏁', label: 'Completed', bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' },
};

export default function ProjectsSection({ projects, loading }: { projects: ProjectInsight[]; loading: boolean }) {
  if (loading) return <InsightSkeleton rows={2}/>;
  if (!projects.length) return <p className="text-[14px] text-muted py-2">🔭 No active projects detected.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {projects.map((p, i) => {
        const s = STATUS[p.status] ?? STATUS['on track'];
        return (
          <div key={i} className="rounded-xl bg-white border border-border p-4 flex flex-col gap-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div className="flex items-start gap-2 justify-between">
              <p className="text-[14px] font-bold text-ink leading-snug">{p.name}</p>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                {s.emoji} {s.label}
              </span>
            </div>
            <p className="text-[13px] text-muted leading-relaxed">{p.summary}</p>
            {p.nextActions.length > 0 && (
              <div className="flex flex-col gap-1.5 bg-slate-50 rounded-lg p-3 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Next actions</p>
                {p.nextActions.map((a, j) => (
                  <div key={j} className="flex gap-2 text-[12px] text-slate-600 font-medium">
                    <span className="text-emerald-500 flex-shrink-0">→</span>{a}
                  </div>
                ))}
              </div>
            )}
            {p.relatedPeople.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {p.relatedPeople.map((name, j) => (
                  <span key={j} className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: 'linear-gradient(135deg,#8B5CF6,#EC4899)' }}>{name[0]}</span>
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
