import { AdviceInsight } from '@/lib/types';
import InsightSkeleton from './InsightSkeleton';

const P = {
  high:   { color: '#FF8A80', bg: 'rgba(234,67,53,0.10)',   border: 'rgba(234,67,53,0.22)',   badge: 'rgba(234,67,53,0.18)',   badgeText: '#FF8A80',  label: 'High'   },
  medium: { color: '#FDD663', bg: 'rgba(251,188,5,0.08)',   border: 'rgba(251,188,5,0.20)',   badge: 'rgba(251,188,5,0.15)',   badgeText: '#FDD663',  label: 'Medium' },
  low:    { color: '#8AB4F8', bg: 'rgba(66,133,244,0.08)',  border: 'rgba(66,133,244,0.18)',  badge: 'rgba(66,133,244,0.15)',  badgeText: '#8AB4F8',  label: 'Low'    },
};

export default function AdviceSection({ advice, loading }: { advice: AdviceInsight[]; loading: boolean }) {
  if (loading) return <InsightSkeleton rows={3}/>;
  if (!advice.length) return (
    <p className="text-[14px] text-muted py-2">No urgent advice — your workspace looks great!</p>
  );

  return (
    <div className="flex flex-col gap-3">
      {advice.map((item, i) => {
        const p = P[item.priority] ?? P.low;
        return (
          <div key={i} className="rounded-xl p-4" style={{ background: p.bg, border: `1px solid ${p.border}` }}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                    style={{ background: p.badge, color: p.badgeText, border: `1px solid ${p.border}` }}
                  >
                    {p.label} priority
                  </span>
                  {item.relatedTo && (
                    <span className="text-[12px] font-medium" style={{ color: p.color }}>→ {item.relatedTo}</span>
                  )}
                </div>
                <p className="text-[13px] font-semibold leading-snug" style={{ color: '#E8EAED' }}>{item.advice}</p>
                {item.reason && <p className="text-[12px] text-muted mt-1.5 leading-relaxed">{item.reason}</p>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
