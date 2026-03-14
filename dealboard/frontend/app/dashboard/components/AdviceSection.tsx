import { AdviceInsight } from '@/lib/types';
import InsightSkeleton from './InsightSkeleton';

const P = {
  high:   { emoji: '🔴', label: 'High',   bg: '#FEF2F2', border: '#FECACA', badge: '#EF4444', text: '#7F1D1D' },
  medium: { emoji: '🟡', label: 'Medium', bg: '#FFFBEB', border: '#FDE68A', badge: '#F59E0B', text: '#78350F' },
  low:    { emoji: '🔵', label: 'Low',    bg: '#EFF6FF', border: '#BFDBFE', badge: '#3B82F6', text: '#1E3A5F' },
};

export default function AdviceSection({ advice, loading }: { advice: AdviceInsight[]; loading: boolean }) {
  if (loading) return <InsightSkeleton rows={3}/>;
  if (!advice.length) return <p className="text-[14px] text-muted py-2">🎉 No urgent advice — your workspace looks great!</p>;

  return (
    <div className="flex flex-col gap-3">
      {advice.map((item, i) => {
        const p = P[item.priority] ?? P.low;
        return (
          <div key={i} className="rounded-xl p-4" style={{ background: p.bg, border: `1.5px solid ${p.border}` }}>
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{p.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white" style={{ background: p.badge }}>
                    {p.label} priority
                  </span>
                  {item.relatedTo && (
                    <span className="text-[12px] font-medium" style={{ color: p.badge }}>→ {item.relatedTo}</span>
                  )}
                </div>
                <p className="text-[14px] font-semibold leading-snug" style={{ color: p.text }}>{item.advice}</p>
                {item.reason && <p className="text-[12px] text-muted mt-1 leading-relaxed">{item.reason}</p>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
