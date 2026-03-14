import { CalendarInsight } from '@/lib/types';
import InsightSkeleton from './InsightSkeleton';

function fmt(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const isToday = d.toDateString() === today.toDateString();
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    const day = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
    return { day, time, isToday, isTomorrow };
  } catch { return { day: '—', time: '—', isToday: false, isTomorrow: false }; }
}

export default function CalendarSection({ events, loading }: { events: CalendarInsight[]; loading: boolean }) {
  if (loading) return <InsightSkeleton rows={3}/>;
  if (!events.length) return <p className="text-[14px] text-muted py-2">📭 No upcoming events this week.</p>;

  return (
    <div className="flex flex-col gap-3">
      {events.map((ev, i) => {
        const { day, time, isToday } = fmt(ev.start);
        return (
          <div key={i} className="rounded-xl border border-border bg-white overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div className="flex items-start gap-4 p-4">
              {/* Date pill */}
              <div
                className="flex-shrink-0 rounded-xl px-3 py-2 text-center min-w-[64px]"
                style={{ background: isToday ? 'linear-gradient(135deg,#3B82F6,#6366F1)' : '#F1F5F9', color: isToday ? 'white' : '#1E293B' }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{time}</div>
                <div className="text-[13px] font-bold leading-tight mt-0.5">{day}</div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-ink">{ev.title}</p>
                {ev.attendees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {ev.attendees.slice(0, 4).map((a, j) => {
                      const name = a.includes('@') ? a.split('@')[0] : a;
                      return (
                        <span key={j} className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-bold">{name[0]?.toUpperCase()}</span>
                          {name}
                        </span>
                      );
                    })}
                    {ev.attendees.length > 4 && <span className="text-[11px] text-muted">+{ev.attendees.length - 4} more</span>}
                  </div>
                )}
              </div>
            </div>
            {ev.aiContext && (
              <div className="border-t border-border px-4 py-3 bg-indigo-50 flex gap-2.5 items-start">
                <span className="text-base flex-shrink-0">✦</span>
                <p className="text-[12px] text-indigo-700 leading-relaxed font-medium">{ev.aiContext}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
